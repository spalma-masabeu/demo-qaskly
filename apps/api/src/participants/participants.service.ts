import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PresentationTheme, SlideType } from "@qaskly/shared";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import type { JoinSessionDto } from "./dto/participant.dto.js";

type SessionStatusValue = "CREATED" | "LIVE" | "ENDED" | "INCOMPLETE";
type PublicStateValue = "waiting" | "active" | "closed" | "ended";

interface PublicSessionRow {
  id: string;
  presentationId: string;
  code: string;
  status: SessionStatusValue;
  currentSlideId: string | null;
  responsesOpen: boolean;
  endedReason: "COMPLETED" | "MANUAL" | "ERROR" | null;
  themeKey: PresentationTheme;
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

interface ParticipantRow {
  id: string;
  sessionId: string;
  displayName: string | null;
  clientTokenHash: string;
  joinedAt: Date;
  lastSeenAt: Date;
}

export interface PublicSlideResponse {
  id: string;
  type: SlideType;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
}

export interface PublicSessionResponse {
  sessionId: string;
  code: string;
  status: SessionStatusValue;
  currentState: PublicStateValue;
  currentSlideId: string | null;
  responsesOpen: boolean;
  currentSlide: PublicSlideResponse | null;
  endedReason: "COMPLETED" | "MANUAL" | "ERROR" | null;
  themeKey: PresentationTheme;
}

export interface ParticipantJoinResponse extends PublicSessionResponse {
  participantId: string;
  participantToken: string;
}

export interface ParticipantIdentity {
  participant: ParticipantRow;
  participantToken: string;
}

@Injectable()
export class ParticipantsService {
  private readonly tokenCacheTtlSeconds = 60 * 60 * 6;
  private readonly presenceCacheTtlSeconds = 60 * 60 * 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async getPublicSession(code: string): Promise<PublicSessionResponse> {
    const session = await this.findSessionByCode(code);
    return this.toPublicSessionResponse(session);
  }

  async join(
    code: string,
    dto: JoinSessionDto = {}
  ): Promise<ParticipantJoinResponse> {
    const session = await this.findJoinableSession(code);
    const identity = await this.findOrCreateParticipant(session.id, dto);
    const publicSession = await this.toPublicSessionResponse(session);

    return {
      ...publicSession,
      participantId: identity.participant.id,
      participantToken: identity.participantToken
    };
  }

  async findParticipantByToken(
    sessionId: string,
    participantToken: string
  ): Promise<ParticipantRow> {
    const normalizedToken = normalizeParticipantToken(participantToken);
    if (normalizedToken === undefined) {
      throw domainErrors.validationError("Participant token is required");
    }

    const tokenHash = hashToken(normalizedToken);
    const rows = await this.prisma.$queryRaw<ParticipantRow[]>`
      UPDATE "Participant"
      SET "lastSeenAt" = NOW()
      WHERE "sessionId" = ${sessionId}
        AND "clientTokenHash" = ${tokenHash}
      RETURNING *
    `;
    const participant = rows[0];
    if (participant === undefined) {
      throw domainErrors.invalidRoomCode({ sessionId });
    }
    return participant;
  }

  async markParticipantPresent(
    sessionId: string,
    participantId: string
  ): Promise<number> {
    const presentParticipants = await this.readPresentParticipants(sessionId);
    presentParticipants.add(participantId);
    await this.writePresentParticipants(sessionId, presentParticipants);
    return presentParticipants.size;
  }

  async markParticipantLeft(
    sessionId: string,
    participantId: string,
    participantToken: string
  ): Promise<number> {
    const participant = await this.findParticipantByToken(
      sessionId,
      participantToken
    );
    if (participant.id !== participantId) {
      throw domainErrors.invalidRoomCode({ sessionId, participantId });
    }

    const presentParticipants = await this.readPresentParticipants(sessionId);
    presentParticipants.delete(participant.id);
    await this.writePresentParticipants(sessionId, presentParticipants);
    return presentParticipants.size;
  }

  async touchParticipant(sessionId: string, participantId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Participant"
      SET "lastSeenAt" = NOW()
      WHERE "sessionId" = ${sessionId}
        AND "id" = ${participantId}
    `;
  }

  async countParticipants(sessionId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Participant"
      WHERE "sessionId" = ${sessionId}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  private async findOrCreateParticipant(
    sessionId: string,
    dto: JoinSessionDto
  ): Promise<ParticipantIdentity> {
    const participantToken =
      dto.participantToken === undefined
        ? createParticipantToken()
        : normalizeRequiredParticipantToken(dto.participantToken);
    const tokenHash = hashToken(participantToken);
    const existing = await this.findParticipantByHash(sessionId, tokenHash);
    if (existing !== null) {
      const rows = await this.prisma.$queryRaw<ParticipantRow[]>`
        UPDATE "Participant"
        SET
          "displayName" = COALESCE(${dto.displayName ?? null}, "displayName"),
          "lastSeenAt" = NOW()
        WHERE "id" = ${existing.id}
        RETURNING *
      `;
      return {
        participant: rows[0] ?? existing,
        participantToken
      };
    }

    const rows = await this.prisma.$queryRaw<ParticipantRow[]>`
      INSERT INTO "Participant" (
        "id",
        "sessionId",
        "displayName",
        "clientTokenHash"
      )
      VALUES (
        ${randomUUID()},
        ${sessionId},
        ${dto.displayName ?? null},
        ${tokenHash}
      )
      RETURNING *
    `;
    const participant = rows[0];
    await this.redis.setWithTtl(
      this.redis.participantTokenKey(sessionId, tokenHash),
      participant.id,
      this.tokenCacheTtlSeconds
    );
    return {
      participant,
      participantToken
    };
  }

  private async findParticipantByHash(
    sessionId: string,
    tokenHash: string
  ): Promise<ParticipantRow | null> {
    const rows = await this.prisma.$queryRaw<ParticipantRow[]>`
      SELECT *
      FROM "Participant"
      WHERE "sessionId" = ${sessionId}
        AND "clientTokenHash" = ${tokenHash}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private async readPresentParticipants(sessionId: string): Promise<Set<string>> {
    const rawValue = await this.redis.get(this.redis.audiencePresenceKey(sessionId));
    if (rawValue === null) {
      return new Set();
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown;
      if (!Array.isArray(parsedValue)) {
        return new Set();
      }
      return new Set(
        parsedValue.filter((participantId) => typeof participantId === "string")
      );
    } catch {
      return new Set();
    }
  }

  private async writePresentParticipants(
    sessionId: string,
    presentParticipants: Set<string>
  ): Promise<void> {
    const key = this.redis.audiencePresenceKey(sessionId);
    if (presentParticipants.size === 0) {
      await this.redis.delete(key);
      return;
    }

    await this.redis.setWithTtl(
      key,
      JSON.stringify([...presentParticipants].sort()),
      this.presenceCacheTtlSeconds
    );
  }

  private async findJoinableSession(code: string): Promise<PublicSessionRow> {
    return this.findSessionByCode(code);
  }

  private async findSessionByCode(code: string): Promise<PublicSessionRow> {
    const rows = await this.prisma.$queryRaw<PublicSessionRow[]>`
      SELECT
        ls."id",
        ls."presentationId",
        ls."code",
        ls."status",
        ls."currentSlideId",
        ls."responsesOpen",
        ls."endedReason",
        p."themeKey"
      FROM "LiveSession" ls
      JOIN "Presentation" p ON p."id" = ls."presentationId"
      WHERE ls."code" = ${code.toUpperCase()}
      LIMIT 1
    `;
    const session = rows[0];
    if (session === undefined) {
      throw domainErrors.invalidRoomCode({ code: code.toUpperCase() });
    }
    return session;
  }

  private async toPublicSessionResponse(
    session: PublicSessionRow
  ): Promise<PublicSessionResponse> {
    const currentSlide =
      session.currentSlideId === null
        ? null
        : toPublicSlideResponse(
            await this.findSlide(session.presentationId, session.currentSlideId)
          );

    return {
      sessionId: session.id,
      code: session.code,
      status: session.status,
      currentState: currentStateFor(session),
      currentSlideId: session.currentSlideId,
      responsesOpen: session.responsesOpen,
      currentSlide,
      endedReason: session.endedReason,
      themeKey: session.themeKey
    };
  }

  private async findSlide(
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
      throw domainErrors.inactiveSlide({ slideId });
    }
    return slide;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeRequiredParticipantToken(token: string): string {
  const normalizedToken = normalizeParticipantToken(token);
  if (normalizedToken === undefined) {
    throw domainErrors.validationError("Participant token is required");
  }
  return normalizedToken;
}

function normalizeParticipantToken(token: string): string | undefined {
  const normalizedToken = token.trim();
  return normalizedToken.length === 0 ? undefined : normalizedToken;
}

function createParticipantToken(): string {
  return randomBytes(32).toString("base64url");
}

function currentStateFor(session: PublicSessionRow): PublicStateValue {
  if (session.status === "ENDED" || session.status === "INCOMPLETE") {
    return "ended";
  }
  if (session.currentSlideId === null) {
    return "waiting";
  }
  return session.responsesOpen ? "active" : "closed";
}

function toPublicSlideResponse(row: SlideRow): PublicSlideResponse {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    prompt: row.prompt,
    position: row.position,
    config: row.config
  };
}
