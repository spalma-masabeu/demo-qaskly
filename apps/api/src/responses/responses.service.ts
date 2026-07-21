import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  getSlideResponseValidationErrors,
  type SlideType
} from "@qaskly/shared";
import { domainErrors } from "../common/domain-errors.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import type { SubmitResponseDto } from "./dto/response.dto.js";

type SessionStatusValue = "CREATED" | "LIVE" | "ENDED" | "INCOMPLETE";

interface ResponseSessionRow {
  id: string;
  presentationId: string;
  code: string;
  status: SessionStatusValue;
  currentSlideId: string | null;
  responsesOpen: boolean;
}

interface ResponseSlideRow {
  id: string;
  presentationId: string;
  type: SlideType;
  config: unknown;
}

interface ResponseRow {
  id: string;
  sessionId: string;
  slideId: string;
  participantId: string;
  type: SlideType;
  value: unknown;
  createdAt: Date;
}

export interface SubmitResponseResult {
  id: string;
  sessionId: string;
  slideId: string;
  participantId: string;
  type: SlideType;
  value: unknown;
  createdAt: string;
}

@Injectable()
export class ResponsesService {
  private readonly throttleTtlSeconds = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly participantsService: ParticipantsService
  ) {}

  async submitByCode(
    code: string,
    dto: SubmitResponseDto
  ): Promise<SubmitResponseResult> {
    const session = await this.findLiveSessionByCode(code);
    return this.submitForSession(session, dto);
  }

  async submitBySession(
    sessionId: string,
    dto: SubmitResponseDto
  ): Promise<SubmitResponseResult> {
    const session = await this.findLiveSessionById(sessionId);
    return this.submitForSession(session, dto);
  }

  private async submitForSession(
    session: ResponseSessionRow,
    dto: SubmitResponseDto
  ): Promise<SubmitResponseResult> {
    if (session.currentSlideId === null || dto.slideId !== session.currentSlideId) {
      throw domainErrors.inactiveSlide({
        sessionId: session.id,
        currentSlideId: session.currentSlideId,
        slideId: dto.slideId
      });
    }
    if (!session.responsesOpen) {
      throw domainErrors.closedSlide({ sessionId: session.id, slideId: dto.slideId });
    }

    const slide = await this.findSlide(session.presentationId, dto.slideId);
    const validationErrors = getSlideResponseValidationErrors(
      slide.type,
      slide.config as never,
      dto.value
    );
    if (validationErrors.length > 0) {
      throw domainErrors.invalidResponsePayload({ errors: validationErrors });
    }

    const participant = await this.participantsService.findParticipantByToken(
      session.id,
      dto.participantToken
    );
    await this.assertNoDuplicate(session.id, dto.slideId, participant.id);
    await this.assertNotThrottled(session.id, participant.id);

    try {
      const rows = await this.prisma.$queryRaw<ResponseRow[]>`
        INSERT INTO "Response" (
          "id",
          "sessionId",
          "slideId",
          "participantId",
          "type",
          "value"
        )
        VALUES (
          ${randomUUID()},
          ${session.id},
          ${dto.slideId},
          ${participant.id},
          ${slide.type}::"SlideType",
          ${JSON.stringify(dto.value)}::jsonb
        )
        RETURNING *
      `;
      return toSubmitResponseResult(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw domainErrors.duplicateResponse({
          sessionId: session.id,
          slideId: dto.slideId,
          participantId: participant.id
        });
      }
      throw error;
    }
  }

  private async findLiveSessionByCode(
    code: string
  ): Promise<ResponseSessionRow> {
    const rows = await this.prisma.$queryRaw<ResponseSessionRow[]>`
      SELECT
        "id",
        "presentationId",
        "code",
        "status",
        "currentSlideId",
        "responsesOpen"
      FROM "LiveSession"
      WHERE "code" = ${code.toUpperCase()}
      LIMIT 1
    `;
    return assertLiveSession(rows[0], { code: code.toUpperCase() });
  }

  private async findLiveSessionById(
    sessionId: string
  ): Promise<ResponseSessionRow> {
    const rows = await this.prisma.$queryRaw<ResponseSessionRow[]>`
      SELECT
        "id",
        "presentationId",
        "code",
        "status",
        "currentSlideId",
        "responsesOpen"
      FROM "LiveSession"
      WHERE "id" = ${sessionId}
      LIMIT 1
    `;
    return assertLiveSession(rows[0], { sessionId });
  }

  private async findSlide(
    presentationId: string,
    slideId: string
  ): Promise<ResponseSlideRow> {
    const rows = await this.prisma.$queryRaw<ResponseSlideRow[]>`
      SELECT "id", "presentationId", "type", "config"
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

  private async assertNoDuplicate(
    sessionId: string,
    slideId: string,
    participantId: string
  ): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Response"
      WHERE "sessionId" = ${sessionId}
        AND "slideId" = ${slideId}
        AND "participantId" = ${participantId}
    `;
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw domainErrors.duplicateResponse({ sessionId, slideId, participantId });
    }
  }

  private async assertNotThrottled(
    sessionId: string,
    participantId: string
  ): Promise<void> {
    const key = this.redis.responseThrottleKey(sessionId, participantId);
    const count = await this.redis.increment(key, this.throttleTtlSeconds);
    if (count > 1) {
      throw domainErrors.validationError("Responses are being submitted too quickly", {
        retryAfterSeconds: this.throttleTtlSeconds
      });
    }
  }
}

function assertLiveSession(
  session: ResponseSessionRow | undefined,
  details: unknown
): ResponseSessionRow {
  if (session === undefined || session.status !== "LIVE") {
    throw domainErrors.invalidRoomCode(details);
  }
  return session;
}

function toSubmitResponseResult(row: ResponseRow): SubmitResponseResult {
  return {
    id: row.id,
    sessionId: row.sessionId,
    slideId: row.slideId,
    participantId: row.participantId,
    type: row.type,
    value: row.value,
    createdAt: row.createdAt.toISOString()
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (hasErrorCode(error, "23505") || hasErrorCode(error, "P2002")) {
    return true;
  }
  return error instanceof Error && error.message.includes("Response_sessionId_slideId_participantId_key");
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
