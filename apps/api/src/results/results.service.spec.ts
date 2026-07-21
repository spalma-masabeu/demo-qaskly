import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SlideType } from "@qaskly/shared";
import { ResultsService } from "./results.service.js";

const service = new ResultsService({} as never);

describe("ResultsService aggregation", () => {
  it("aggregates multiple choice counts and percentages", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.MultipleChoice, {
        options: [
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
          { id: "c", label: "Gamma" }
        ],
        allowMultiple: true
      }),
      [
        response(SlideType.MultipleChoice, { selectedOptionIds: ["a", "b"] }),
        response(SlideType.MultipleChoice, { selectedOptionIds: ["a"] })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.MultipleChoice,
      totalResponses: 2,
      options: [
        { id: "a", label: "Alpha", count: 2, percentage: 100 },
        { id: "b", label: "Beta", count: 1, percentage: 50 },
        { id: "c", label: "Gamma", count: 0, percentage: 0 }
      ]
    });
  });

  it("aggregates word cloud words case-insensitively", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.WordCloud, { inputCount: 3, maxWordLength: 20 }),
      [
        response(SlideType.WordCloud, { words: ["NestJS", "redis"] }),
        response(SlideType.WordCloud, { words: ["nestjs", "Postgres"] })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.WordCloud,
      totalResponses: 2,
      totalWords: 4,
      words: [
        { text: "nestjs", count: 2 },
        { text: "redis", count: 1 },
        { text: "postgres", count: 1 }
      ]
    });
  });

  it("returns open ended answers in submission order", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.OpenEnded, { maxLength: 100 }),
      [
        response(SlideType.OpenEnded, { text: "First" }, { id: "r1" }),
        response(SlideType.OpenEnded, { text: "Second" }, { id: "r2" })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.OpenEnded,
      totalResponses: 2,
      responses: [
        responseText("r1", "participant-1", "First"),
        responseText("r2", "participant-1", "Second")
      ]
    });
  });

  it("aggregates scale average and distribution", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.Scales, {
        min: 1,
        max: 5,
        minLabel: "Low",
        maxLabel: "High",
        step: 1
      }),
      [
        response(SlideType.Scales, { value: 3 }),
        response(SlideType.Scales, { value: 5 }),
        response(SlideType.Scales, { value: 5 })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.Scales,
      totalResponses: 3,
      average: 4.33,
      distribution: [
        { value: 1, count: 0 },
        { value: 2, count: 0 },
        { value: 3, count: 1 },
        { value: 4, count: 0 },
        { value: 5, count: 2 }
      ]
    });
  });

  it("aggregates ranking average rank and rank counts", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.Ranking, {
        items: [
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
          { id: "c", label: "Gamma" }
        ]
      }),
      [
        response(SlideType.Ranking, { orderedItemIds: ["a", "b", "c"] }),
        response(SlideType.Ranking, { orderedItemIds: ["b", "a", "c"] })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.Ranking,
      totalResponses: 2,
      items: [
        {
          id: "a",
          label: "Alpha",
          averageRank: 1.5,
          rankCounts: [
            { rank: 1, count: 1 },
            { rank: 2, count: 1 },
            { rank: 3, count: 0 }
          ]
        },
        {
          id: "b",
          label: "Beta",
          averageRank: 1.5,
          rankCounts: [
            { rank: 1, count: 1 },
            { rank: 2, count: 1 },
            { rank: 3, count: 0 }
          ]
        },
        {
          id: "c",
          label: "Gamma",
          averageRank: 3,
          rankCounts: [
            { rank: 1, count: 0 },
            { rank: 2, count: 0 },
            { rank: 3, count: 2 }
          ]
        }
      ]
    });
  });

  it("aggregates guess the number guesses and correctness", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.GuessTheNumber, { min: 0, max: 10, correctValue: 7 }),
      [
        response(SlideType.GuessTheNumber, { guess: 7 }),
        response(SlideType.GuessTheNumber, { guess: 5 }),
        response(SlideType.GuessTheNumber, { guess: 7 })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.GuessTheNumber,
      totalResponses: 3,
      averageGuess: 6.33,
      correctValue: 7,
      guesses: [
        { value: 5, count: 1, isCorrect: false },
        { value: 7, count: 2, isCorrect: true }
      ]
    });
  });

  it("aggregates 2x2 points and averages", () => {
    const result = service.aggregateSlideResult(
      slide(SlideType.TwoByTwo, {
        xMin: -1,
        xMax: 1,
        yMin: -1,
        yMax: 1,
        xMinLabel: "Left",
        xMaxLabel: "Right",
        yMinLabel: "Low",
        yMaxLabel: "High"
      }),
      [
        response(SlideType.TwoByTwo, { x: -1, y: 1 }, { id: "p1" }),
        response(SlideType.TwoByTwo, { x: 1, y: 0 }, { id: "p2" })
      ]
    );

    assert.deepEqual(result, {
      type: SlideType.TwoByTwo,
      totalResponses: 2,
      averageX: 0,
      averageY: 0.5,
      points: [
        { responseId: "p1", participantId: "participant-1", x: -1, y: 1 },
        { responseId: "p2", participantId: "participant-1", x: 1, y: 0 }
      ]
    });
  });
});

function slide(type: SlideType, config: unknown) {
  return {
    id: "slide-1",
    presentationId: "presentation-1",
    type,
    title: null,
    prompt: "Prompt?",
    position: 1,
    config,
    createdAt: new Date("2026-06-17T00:00:00.000Z"),
    updatedAt: new Date("2026-06-17T00:00:00.000Z")
  };
}

function response(
  type: SlideType,
  value: unknown,
  overrides: { id?: string; participantId?: string } = {}
) {
  return {
    id: overrides.id ?? "response-1",
    sessionId: "session-1",
    slideId: "slide-1",
    participantId: overrides.participantId ?? "participant-1",
    type,
    value,
    createdAt: new Date("2026-06-17T00:00:00.000Z")
  };
}

function responseText(id: string, participantId: string, text: string) {
  return {
    id,
    participantId,
    text,
    createdAt: "2026-06-17T00:00:00.000Z"
  };
}
