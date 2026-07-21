import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { SlideType } from "@qaskly/shared";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import type {
  CloseSlideDto,
  EndSessionDto,
  EndedReasonValue,
  StartSlideDto
} from "./dto/session.dto.js";
import { SessionCodeService } from "./session-code.service.js";

type SessionStatusValue = "CREATED" | "LIVE" | "ENDED" | "INCOMPLETE";
type CurrentStateValue = "waiting" | "active" | "closed" | "ended";

interface PresentationOwnerRow {
  id: string;
  ownerId: string;
}

interface SlideRow {
  id: string;
  presentationId: string;
  type: SlideType;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionRow {
  id: string;
  presentationId: string;
  ownerId: string;
  code: string;
  status: SessionStatusValue;
  currentSlideId: string | null;
  responsesOpen: boolean;
  startedAt: Date | null;
  endedAt: Date | null;
  endedReason: EndedReasonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionSlideResponse {
  id: string;
  presentationId: string;
  type: SlideType;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: string;
  presentationId: string;
  code: string;
  joinUrl: string;
  status: SessionStatusValue;
  currentSlideId: string | null;
  responsesOpen: boolean;
  currentState: CurrentStateValue;
  startedAt: string | null;
  endedAt: string | null;
  endedReason: EndedReasonValue | null;
  createdAt: string;
  updatedAt: string;
  currentSlide: SessionSlideResponse | null;
}

@Injectable()
export class SessionsService {
  private readonly cacheTtlSeconds = 60 * 60;
  private readonly createAttempts = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sessionCodeService: SessionCodeService
  ) {}

  async create(
    presenter: CurrentPresenter,
    presentationId: string
  ): Promise<SessionResponse> {
    const presentation = await this.findPresentationOwner(presentationId);
    this.assertOwner(presenter.id, presentation.ownerId);
    await this.assertPresentationCanRun(presentationId);

    for (let attempt = 0; attempt < this.createAttempts; attempt += 1) {
      const code = await this.sessionCodeService.createUniqueCode();
      try {
        const rows = await this.prisma.$queryRaw<SessionRow[]>`
          INSERT INTO "LiveSession" (
            "id",
            "presentationId",
            "code",
            "updatedAt"
          )
          VALUES (
            ${randomUUID()},
            ${presentationId},
            ${code},
            NOW()
          )
          RETURNING
            "LiveSession".*,
            ${presentation.ownerId} AS "ownerId"
        `;

        return this.cacheSessionResponse(rows[0]);
      } catch (error) {
        if (isRoomCodeUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    throw domainErrors.validationError("Could not generate a unique session code");
  }

  async getOwned(
    presenter: CurrentPresenter,
    sessionId: string
  ): Promise<SessionResponse> {
    const session = await this.findSession(sessionId);
    this.assertOwner(presenter.id, session.ownerId);

    const cached = await this.readCachedSession(sessionId);
    if (cached !== null) {
      return cached;
    }

    return this.cacheSessionResponse(session);
  }

  async getLatestForPresentation(
    presenter: CurrentPresenter,
    presentationId: string
  ): Promise<SessionResponse> {
    const presentation = await this.findPresentationOwner(presentationId);
    this.assertOwner(presenter.id, presentation.ownerId);

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      SELECT ls.*, p."ownerId"
      FROM "LiveSession" ls
      INNER JOIN "Presentation" p ON p."id" = ls."presentationId"
      WHERE ls."presentationId" = ${presentationId}
      ORDER BY ls."updatedAt" DESC, ls."createdAt" DESC, ls."id" DESC
      LIMIT 1
    `;
    const session = rows[0];
    if (session === undefined) {
      throw domainErrors.notFound("Session was not found");
    }

    return this.cacheSessionResponse(session);
  }

  async start(
    presenter: CurrentPresenter,
    sessionId: string
  ): Promise<SessionResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    this.assertStatus(session, ["CREATED"], "Only created sessions can start");
    const firstSlide = await this.findFirstPresentationSlide(
      session.presentationId
    );

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      UPDATE "LiveSession" ls
      SET
        "status" = 'LIVE'::"SessionStatus",
        "currentSlideId" = ${firstSlide.id},
        "startedAt" = COALESCE(ls."startedAt", NOW()),
        "responsesOpen" = true,
        "updatedAt" = NOW()
      FROM "Presentation" p
      WHERE ls."id" = ${sessionId}
        AND p."id" = ls."presentationId"
      RETURNING ls.*, p."ownerId"
    `;
    return this.cacheSessionResponse(rows[0]);
  }

  async startSlide(
    presenter: CurrentPresenter,
    sessionId: string,
    dto: StartSlideDto
  ): Promise<SessionResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    this.assertStatus(session, ["LIVE"], "Only live sessions can start slides");
    await this.findPresentationSlide(session.presentationId, dto.slideId);

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      UPDATE "LiveSession" ls
      SET
        "currentSlideId" = ${dto.slideId},
        "responsesOpen" = true,
        "updatedAt" = NOW()
      FROM "Presentation" p
      WHERE ls."id" = ${sessionId}
        AND p."id" = ls."presentationId"
      RETURNING ls.*, p."ownerId"
    `;
    return this.cacheSessionResponse(rows[0]);
  }

  async closeSlide(
    presenter: CurrentPresenter,
    sessionId: string,
    dto: CloseSlideDto
  ): Promise<SessionResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    this.assertActiveSlide(session, dto.slideId);

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      UPDATE "LiveSession" ls
      SET
        "responsesOpen" = false,
        "updatedAt" = NOW()
      FROM "Presentation" p
      WHERE ls."id" = ${sessionId}
        AND p."id" = ls."presentationId"
      RETURNING ls.*, p."ownerId"
    `;
    return this.cacheSessionResponse(rows[0]);
  }

  async nextSlide(
    presenter: CurrentPresenter,
    sessionId: string
  ): Promise<SessionResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    this.assertStatus(session, ["LIVE"], "Only live sessions can advance");
    if (session.currentSlideId === null) {
      throw domainErrors.inactiveSlide({ sessionId });
    }

    const currentSlide = await this.findPresentationSlide(
      session.presentationId,
      session.currentSlideId
    );
    const nextRows = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${session.presentationId}
        AND "position" > ${currentSlide.position}
      ORDER BY "position" ASC
      LIMIT 1
    `;
    const nextSlide = nextRows[0];
    if (nextSlide === undefined) {
      return this.end(presenter, sessionId, { reason: "COMPLETED" });
    }

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      UPDATE "LiveSession" ls
      SET
        "currentSlideId" = ${nextSlide.id},
        "responsesOpen" = true,
        "updatedAt" = NOW()
      FROM "Presentation" p
      WHERE ls."id" = ${sessionId}
        AND p."id" = ls."presentationId"
      RETURNING ls.*, p."ownerId"
    `;
    return this.cacheSessionResponse(rows[0]);
  }

  async end(
    presenter: CurrentPresenter,
    sessionId: string,
    dto: EndSessionDto = {}
  ): Promise<SessionResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    this.assertStatus(
      session,
      ["LIVE"],
      "Only active sessions can end"
    );

    const completed = await this.isOnFinalSlide(session);
    const reason = dto.reason ?? (completed ? "COMPLETED" : "MANUAL");
    const nextStatus: SessionStatusValue =
      reason === "COMPLETED" && completed ? "ENDED" : "INCOMPLETE";
    const endedReason: EndedReasonValue =
      nextStatus === "ENDED" ? "COMPLETED" : reason === "ERROR" ? "ERROR" : "MANUAL";

    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      UPDATE "LiveSession" ls
      SET
        "status" = ${nextStatus}::"SessionStatus",
        "responsesOpen" = false,
        "endedAt" = NOW(),
        "endedReason" = ${endedReason}::"EndedReason",
        "updatedAt" = NOW()
      FROM "Presentation" p
      WHERE ls."id" = ${sessionId}
        AND p."id" = ls."presentationId"
      RETURNING ls.*, p."ownerId"
    `;
    return this.cacheSessionResponse(rows[0]);
  }

  private async findOwnedSession(
    presenterId: string,
    sessionId: string
  ): Promise<SessionRow> {
    const session = await this.findSession(sessionId);
    this.assertOwner(presenterId, session.ownerId);
    return session;
  }

  private async findSession(sessionId: string): Promise<SessionRow> {
    const rows = await this.prisma.$queryRaw<SessionRow[]>`
      SELECT ls.*, p."ownerId"
      FROM "LiveSession" ls
      INNER JOIN "Presentation" p ON p."id" = ls."presentationId"
      WHERE ls."id" = ${sessionId}
      LIMIT 1
    `;
    const session = rows[0];
    if (session === undefined) {
      throw domainErrors.notFound("Session was not found");
    }
    return session;
  }

  private async findPresentationOwner(
    presentationId: string
  ): Promise<PresentationOwnerRow> {
    const rows = await this.prisma.$queryRaw<PresentationOwnerRow[]>`
      SELECT "id", "ownerId"
      FROM "Presentation"
      WHERE "id" = ${presentationId}
      LIMIT 1
    `;
    const presentation = rows[0];
    if (presentation === undefined) {
      throw domainErrors.notFound("Presentation was not found");
    }
    return presentation;
  }

  private async assertPresentationCanRun(presentationId: string): Promise<void> {
    const counts = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
    `;
    const count = Number(counts[0]?.count ?? 0);
    if (count < 1 || count > 20) {
      throw domainErrors.invalidSlideConfig({
        errors: ["A presentation must contain between 1 and 20 slides"]
      });
    }
  }

  private async findPresentationSlide(
    presentationId: string,
    slideId: string
  ): Promise<SlideRow> {
    const rows = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "id" = ${slideId}
        AND "presentationId" = ${presentationId}
      LIMIT 1
    `;
    const slide = rows[0];
    if (slide === undefined) {
      throw domainErrors.notFound("Slide was not found");
    }
    return slide;
  }

  private async findFirstPresentationSlide(
    presentationId: string
  ): Promise<SlideRow> {
    const rows = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
      ORDER BY "position" ASC
      LIMIT 1
    `;
    const slide = rows[0];
    if (slide === undefined) {
      throw domainErrors.notFound("Slide was not found");
    }
    return slide;
  }

  private assertOwner(presenterId: string, ownerId: string): void {
    if (presenterId !== ownerId) {
      throw domainErrors.forbiddenOwnerAction({ presenterId, ownerId });
    }
  }

  private assertStatus(
    session: SessionRow,
    statuses: SessionStatusValue[],
    message: string
  ): void {
    if (!statuses.includes(session.status)) {
      throw domainErrors.validationError(message, {
        sessionId: session.id,
        status: session.status
      });
    }
  }

  private assertActiveSlide(session: SessionRow, slideId?: string): void {
    if (
      session.status !== "LIVE" ||
      session.currentSlideId === null ||
      !session.responsesOpen ||
      (slideId !== undefined && slideId !== session.currentSlideId)
    ) {
      throw domainErrors.inactiveSlide({
        sessionId: session.id,
        currentSlideId: session.currentSlideId,
        slideId
      });
    }
  }

  private async isOnFinalSlide(session: SessionRow): Promise<boolean> {
    if (session.currentSlideId === null) {
      return false;
    }
    const currentSlide = await this.findPresentationSlide(
      session.presentationId,
      session.currentSlideId
    );
    const laterSlides = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Slide"
      WHERE "presentationId" = ${session.presentationId}
        AND "position" > ${currentSlide.position}
    `;
    return Number(laterSlides[0]?.count ?? 0) === 0;
  }

  private async cacheSessionResponse(
    row: SessionRow
  ): Promise<SessionResponse> {
    const response = await this.toSessionResponse(row);
    await this.redis.setWithTtl(
      this.redis.sessionStateKey(row.id),
      JSON.stringify(response),
      this.cacheTtlSeconds
    );
    return response;
  }

  private async readCachedSession(
    sessionId: string
  ): Promise<SessionResponse | null> {
    const cached = await this.redis.get(this.redis.sessionStateKey(sessionId));
    if (cached === null) {
      return null;
    }
    try {
      return JSON.parse(cached) as SessionResponse;
    } catch {
      await this.redis.delete(this.redis.sessionStateKey(sessionId));
      return null;
    }
  }

  private async toSessionResponse(row: SessionRow): Promise<SessionResponse> {
    const currentSlide =
      row.currentSlideId === null
        ? null
        : toSlideResponse(
            await this.findPresentationSlide(row.presentationId, row.currentSlideId)
          );

    return {
      id: row.id,
      presentationId: row.presentationId,
      code: row.code,
      joinUrl: this.sessionCodeService.joinUrlForCode(row.code),
      status: row.status,
      currentSlideId: row.currentSlideId,
      responsesOpen: row.responsesOpen,
      currentState: currentStateFor(row),
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      endedReason: row.endedReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      currentSlide
    };
  }
}

function currentStateFor(row: SessionRow): CurrentStateValue {
  if (row.status === "ENDED" || row.status === "INCOMPLETE") {
    return "ended";
  }
  if (row.currentSlideId === null) {
    return "waiting";
  }
  return row.responsesOpen ? "active" : "closed";
}

function toSlideResponse(row: SlideRow): SessionSlideResponse {
  return {
    id: row.id,
    presentationId: row.presentationId,
    type: row.type,
    title: row.title,
    prompt: row.prompt,
    position: row.position,
    config: row.config,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function isRoomCodeUniqueViolation(error: unknown): boolean {
  if (hasErrorCode(error, "23505") || hasErrorCode(error, "P2002")) {
    return true;
  }
  return error instanceof Error && error.message.includes("LiveSession_code_key");
}

function hasErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const record = error as Record<string, unknown>;
  if (record.code === code) {
    return true;
  }
  return hasErrorCode(record.cause, code);
}
