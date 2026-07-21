import { Injectable } from "@nestjs/common";
import {
  SlideType,
  type ChoiceOption,
  type GuessTheNumberConfig,
  type MultipleChoiceConfig,
  type MultipleChoiceResponse,
  type OpenEndedResponse,
  type RankingConfig,
  type RankingResponse,
  type ScalesConfig,
  type ScalesResponse,
  type SlideResult,
  type TwoByTwoResponse,
  type WordCloudResponse
} from "@qaskly/shared";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";

type SessionStatusValue = "CREATED" | "LIVE" | "ENDED" | "INCOMPLETE";

export interface ResultSlideRow {
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

export interface ResultResponseRow {
  id: string;
  sessionId: string;
  slideId: string;
  participantId: string;
  type: SlideType;
  value: unknown;
  createdAt: Date;
}

interface ResultSessionRow {
  id: string;
  presentationId: string;
  ownerId: string;
  status: SessionStatusValue;
}

interface PresentationOwnerRow {
  id: string;
  ownerId: string;
}

interface ResultLogRow {
  id: string;
  presentationId: string;
  status: SessionStatusValue;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participantCount: bigint | number;
  responseCount: bigint | number;
  slideCount: bigint | number;
}

export interface SlideResultResponse {
  sessionId: string;
  slideId: string;
  result: SlideResult;
}

export interface SessionResultsResponse {
  sessionId: string;
  presentationId: string;
  status: SessionStatusValue;
  slides: Array<{
    slideId: string;
    position: number;
    type: SlideType;
    result: SlideResult;
  }>;
}

export interface ResultLogResponse {
  sessionId: string;
  presentationId: string;
  participantCount: number;
  responseCount: number;
  startedAt: string;
  endedAt: string;
  completionState: "completed" | "incomplete";
  engagementRate: number;
}

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedPresentationResultLogs(
    presenter: CurrentPresenter,
    presentationId: string
  ): Promise<ResultLogResponse[]> {
    const presentation = await this.findPresentationOwner(presentationId);
    if (presentation.ownerId !== presenter.id) {
      throw domainErrors.forbiddenOwnerAction({
        presenterId: presenter.id,
        ownerId: presentation.ownerId
      });
    }

    const rows = await this.prisma.$queryRaw<ResultLogRow[]>`
      SELECT
        ls."id",
        ls."presentationId",
        ls."status",
        ls."startedAt",
        ls."endedAt",
        ls."createdAt",
        ls."updatedAt",
        COUNT(DISTINCT participant."id")::bigint AS "participantCount",
        COUNT(DISTINCT response."id")::bigint AS "responseCount",
        COUNT(DISTINCT slide."id")::bigint AS "slideCount"
      FROM "LiveSession" ls
      LEFT JOIN "Participant" participant ON participant."sessionId" = ls."id"
      LEFT JOIN "Response" response ON response."sessionId" = ls."id"
      LEFT JOIN "Slide" slide ON slide."presentationId" = ls."presentationId"
      WHERE ls."presentationId" = ${presentationId}
      GROUP BY
        ls."id",
        ls."presentationId",
        ls."status",
        ls."startedAt",
        ls."endedAt",
        ls."createdAt",
        ls."updatedAt"
      ORDER BY COALESCE(ls."startedAt", ls."createdAt") DESC, ls."createdAt" DESC
    `;

    return rows.map(toResultLogResponse);
  }

  async getOwnedSessionResults(
    presenter: CurrentPresenter,
    sessionId: string
  ): Promise<SessionResultsResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    const slides = await this.findSessionSlides(session.presentationId);
    const results = await Promise.all(
      slides.map(async (slide) => ({
        slideId: slide.id,
        position: slide.position,
        type: slide.type,
        result: await this.rebuildSlideResultFromDurableResponses(session.id, slide)
      }))
    );

    return {
      sessionId: session.id,
      presentationId: session.presentationId,
      status: session.status,
      slides: results
    };
  }

  async getOwnedSlideResult(
    presenter: CurrentPresenter,
    sessionId: string,
    slideId: string
  ): Promise<SlideResultResponse> {
    const session = await this.findOwnedSession(presenter.id, sessionId);
    const slide = await this.findSessionSlide(session.presentationId, slideId);
    return {
      sessionId: session.id,
      slideId: slide.id,
      result: await this.rebuildSlideResultFromDurableResponses(session.id, slide)
    };
  }

  async getSlideResultForSession(
    sessionId: string,
    slideId: string
  ): Promise<SlideResult> {
    const session = await this.findSession(sessionId);
    const slide = await this.findSessionSlide(session.presentationId, slideId);
    return this.rebuildSlideResultFromDurableResponses(session.id, slide);
  }

  async rebuildSlideResult(
    sessionId: string,
    slideId: string
  ): Promise<SlideResult> {
    const session = await this.findSession(sessionId);
    const slide = await this.findSessionSlide(session.presentationId, slideId);
    return this.rebuildSlideResultFromDurableResponses(session.id, slide);
  }

  aggregateSlideResult(
    slide: ResultSlideRow,
    responses: ResultResponseRow[]
  ): SlideResult {
    switch (slide.type) {
      case SlideType.MultipleChoice:
        return aggregateMultipleChoice(slide.config, responses);
      case SlideType.WordCloud:
        return aggregateWordCloud(responses);
      case SlideType.OpenEnded:
        return aggregateOpenEnded(responses);
      case SlideType.Scales:
        return aggregateScales(slide.config, responses);
      case SlideType.Ranking:
        return aggregateRanking(slide.config, responses);
      case SlideType.GuessTheNumber:
        return aggregateGuessTheNumber(slide.config, responses);
      case SlideType.TwoByTwo:
        return aggregateTwoByTwo(responses);
    }
  }

  private async rebuildSlideResultFromDurableResponses(
    sessionId: string,
    slide: ResultSlideRow
  ): Promise<SlideResult> {
    return this.aggregateSlideResult(
      slide,
      await this.findSlideResponses(sessionId, slide.id)
    );
  }

  private async findOwnedSession(
    presenterId: string,
    sessionId: string
  ): Promise<ResultSessionRow> {
    const session = await this.findSession(sessionId);
    if (session.ownerId !== presenterId) {
      throw domainErrors.forbiddenOwnerAction({
        presenterId,
        ownerId: session.ownerId
      });
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

  private async findSession(sessionId: string): Promise<ResultSessionRow> {
    const rows = await this.prisma.$queryRaw<ResultSessionRow[]>`
      SELECT ls."id", ls."presentationId", ls."status", p."ownerId"
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

  private async findSessionSlides(
    presentationId: string
  ): Promise<ResultSlideRow[]> {
    return this.prisma.$queryRaw<ResultSlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
      ORDER BY "position" ASC
    `;
  }

  private async findSessionSlide(
    presentationId: string,
    slideId: string
  ): Promise<ResultSlideRow> {
    const rows = await this.prisma.$queryRaw<ResultSlideRow[]>`
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

  private async findSlideResponses(
    sessionId: string,
    slideId: string
  ): Promise<ResultResponseRow[]> {
    return this.prisma.$queryRaw<ResultResponseRow[]>`
      SELECT *
      FROM "Response"
      WHERE "sessionId" = ${sessionId}
        AND "slideId" = ${slideId}
      ORDER BY "createdAt" ASC
    `;
  }
}

function aggregateMultipleChoice(
  config: unknown,
  responses: ResultResponseRow[]
): SlideResult {
  const typedConfig = config as MultipleChoiceConfig;
  const totalResponses = responses.length;
  const counts = new Map<string, number>();
  for (const option of typedConfig.options) {
    counts.set(option.id, 0);
  }
  for (const row of responses) {
    const value = row.value as MultipleChoiceResponse;
    for (const optionId of value.selectedOptionIds) {
      counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
    }
  }
  return {
    type: SlideType.MultipleChoice,
    totalResponses,
    options: typedConfig.options.map((option) => ({
      id: option.id,
      label: option.label,
      count: counts.get(option.id) ?? 0,
      percentage:
        totalResponses === 0
          ? 0
          : round(((counts.get(option.id) ?? 0) / totalResponses) * 100)
    }))
  };
}

function aggregateWordCloud(responses: ResultResponseRow[]): SlideResult {
  const counts = new Map<string, number>();
  for (const row of responses) {
    const value = row.value as WordCloudResponse;
    for (const word of value.words) {
      const normalized = word.trim().toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return {
    type: SlideType.WordCloud,
    totalResponses: responses.length,
    totalWords: Array.from(counts.values()).reduce((total, count) => total + count, 0),
    words: Array.from(counts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((left, right) => right.count - left.count)
  };
}

function aggregateOpenEnded(responses: ResultResponseRow[]): SlideResult {
  return {
    type: SlideType.OpenEnded,
    totalResponses: responses.length,
    responses: responses.map((row) => ({
      id: row.id,
      participantId: row.participantId,
      text: (row.value as OpenEndedResponse).text,
      createdAt: row.createdAt.toISOString()
    }))
  };
}

function aggregateScales(
  config: unknown,
  responses: ResultResponseRow[]
): SlideResult {
  const typedConfig = config as ScalesConfig;
  const values = responses.map((row) => (row.value as ScalesResponse).value);
  const step = typedConfig.step ?? 1;
  const distribution = stepsBetween(typedConfig.min, typedConfig.max, step).map(
    (value) => ({
      value,
      count: values.filter((submitted) => submitted === value).length
    })
  );

  return {
    type: SlideType.Scales,
    totalResponses: responses.length,
    average: average(values),
    distribution
  };
}

function aggregateRanking(
  config: unknown,
  responses: ResultResponseRow[]
): SlideResult {
  const typedConfig = config as RankingConfig;
  const rankCountLength = typedConfig.items.length;
  return {
    type: SlideType.Ranking,
    totalResponses: responses.length,
    items: typedConfig.items.map((item: ChoiceOption) => {
      const ranks = responses.map(
        (row) =>
          (row.value as RankingResponse).orderedItemIds.indexOf(item.id) + 1
      );
      return {
        id: item.id,
        label: item.label,
        averageRank: average(ranks),
        rankCounts: Array.from({ length: rankCountLength }, (_value, index) => ({
          rank: index + 1,
          count: ranks.filter((rank) => rank === index + 1).length
        }))
      };
    })
  };
}

function aggregateGuessTheNumber(
  config: unknown,
  responses: ResultResponseRow[]
): SlideResult {
  const typedConfig = config as GuessTheNumberConfig;
  const guesses = responses.map(
    (row) => (row.value as { guess: number }).guess
  );
  const counts = new Map<number, number>();
  for (const guess of guesses) {
    counts.set(guess, (counts.get(guess) ?? 0) + 1);
  }
  const correctValue = typedConfig.correctValue ?? null;
  return {
    type: SlideType.GuessTheNumber,
    totalResponses: responses.length,
    averageGuess: average(guesses),
    correctValue,
    guesses: Array.from(counts.entries())
      .sort(([left], [right]) => left - right)
      .map(([value, count]) => ({
        value,
        count,
        isCorrect: correctValue === null ? null : value === correctValue
      }))
  };
}

function aggregateTwoByTwo(responses: ResultResponseRow[]): SlideResult {
  const points = responses.map((row) => {
    const value = row.value as TwoByTwoResponse;
    return {
      responseId: row.id,
      participantId: row.participantId,
      x: value.x,
      y: value.y
    };
  });
  return {
    type: SlideType.TwoByTwo,
    totalResponses: responses.length,
    averageX: average(points.map((point) => point.x)),
    averageY: average(points.map((point) => point.y)),
    points
  };
}

function stepsBetween(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += step) {
    values.push(value);
  }
  return values;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function toResultLogResponse(row: ResultLogRow): ResultLogResponse {
  const participantCount = Number(row.participantCount);
  const responseCount = Number(row.responseCount);
  const slideCount = Number(row.slideCount);
  const possibleResponses = participantCount * slideCount;

  return {
    sessionId: row.id,
    presentationId: row.presentationId,
    participantCount,
    responseCount,
    startedAt: (row.startedAt ?? row.createdAt).toISOString(),
    endedAt: (row.endedAt ?? row.updatedAt).toISOString(),
    completionState: row.status === "ENDED" ? "completed" : "incomplete",
    engagementRate:
      possibleResponses === 0 ? 0 : round((responseCount / possibleResponses) * 100)
  };
}
