import { Injectable } from "@nestjs/common";
import {
  ALLOWED_REACTIONS,
  type AllowedReaction
} from "@qaskly/shared";
import { domainErrors } from "../common/domain-errors.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

type SessionStatusValue = "CREATED" | "LIVE" | "ENDED" | "INCOMPLETE";

interface ReactionSessionRow {
  id: string;
  status: SessionStatusValue;
}

export interface SubmitReactionResult {
  sessionId: string;
  participantId: string;
  emoji: AllowedReaction;
}

export interface SubmitReactionInput {
  participantToken: string;
  emoji: string;
}

const allowedReactions = new Set<string>(ALLOWED_REACTIONS);

@Injectable()
export class ReactionsService {
  private readonly reactionBurstCapacity = 15;
  private readonly reactionRefillIntervalMs = 500;
  private readonly reactionThrottleTtlSeconds = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly participantsService: ParticipantsService
  ) {}

  async submitByCode(
    code: string,
    dto: SubmitReactionInput
  ): Promise<SubmitReactionResult> {
    const session = await this.findWaitingSessionByCode(code);
    return this.submitForSession(session, dto);
  }

  async submitBySession(
    sessionId: string,
    dto: SubmitReactionInput
  ): Promise<SubmitReactionResult> {
    const session = await this.findWaitingSessionById(sessionId);
    return this.submitForSession(session, dto);
  }

  private async submitForSession(
    session: ReactionSessionRow,
    dto: SubmitReactionInput
  ): Promise<SubmitReactionResult> {
    const emoji = assertAllowedReaction(dto.emoji);
    const participant = await this.participantsService.findParticipantByToken(
      session.id,
      dto.participantToken
    );
    await this.assertWithinBurstLimit(session.id, participant.id);

    return {
      sessionId: session.id,
      participantId: participant.id,
      emoji
    };
  }

  private async findWaitingSessionByCode(
    code: string
  ): Promise<ReactionSessionRow> {
    const rows = await this.prisma.$queryRaw<ReactionSessionRow[]>`
      SELECT "id", "status"
      FROM "LiveSession"
      WHERE "code" = ${code.toUpperCase()}
      LIMIT 1
    `;
    return assertWaitingSession(rows[0], { code: code.toUpperCase() });
  }

  private async findWaitingSessionById(
    sessionId: string
  ): Promise<ReactionSessionRow> {
    const rows = await this.prisma.$queryRaw<ReactionSessionRow[]>`
      SELECT "id", "status"
      FROM "LiveSession"
      WHERE "id" = ${sessionId}
      LIMIT 1
    `;
    return assertWaitingSession(rows[0], { sessionId });
  }

  private async assertWithinBurstLimit(
    sessionId: string,
    participantId: string
  ): Promise<void> {
    const key = this.redis.reactionThrottleKey(sessionId, participantId);
    const accepted = await this.redis.consumeTokenBucket(key, {
      capacity: this.reactionBurstCapacity,
      refillIntervalMs: this.reactionRefillIntervalMs,
      ttlSeconds: this.reactionThrottleTtlSeconds
    });
    if (!accepted) {
      throw domainErrors.validationError("Reactions are being sent too quickly", {
        retryAfterMilliseconds: this.reactionRefillIntervalMs
      });
    }
  }
}

function assertAllowedReaction(emoji: string): AllowedReaction {
  if (!allowedReactions.has(emoji)) {
    throw domainErrors.validationError("Reaction emoji is not allowed", {
      allowedReactions: ALLOWED_REACTIONS
    });
  }
  return emoji as AllowedReaction;
}

function assertWaitingSession(
  session: ReactionSessionRow | undefined,
  details: unknown
): ReactionSessionRow {
  if (session === undefined || session.status !== "CREATED") {
    throw domainErrors.invalidRoomCode(details);
  }
  return session;
}
