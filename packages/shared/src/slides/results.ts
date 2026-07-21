import { SlideType } from "./types";

export interface ResultBase {
  type: SlideType;
  totalResponses: number;
}

export interface MultipleChoiceOptionResult {
  id: string;
  label: string;
  count: number;
  percentage: number;
}

export interface MultipleChoiceResult extends ResultBase {
  type: SlideType.MultipleChoice;
  options: MultipleChoiceOptionResult[];
}

export interface WordCloudWordResult {
  text: string;
  count: number;
}

export interface WordCloudResult extends ResultBase {
  type: SlideType.WordCloud;
  totalWords: number;
  words: WordCloudWordResult[];
}

export interface TextResponseResult {
  id: string;
  participantId: string;
  text: string;
  createdAt: string;
}

export interface OpenEndedResult extends ResultBase {
  type: SlideType.OpenEnded;
  responses: TextResponseResult[];
}

export interface ScaleDistributionResult {
  value: number;
  count: number;
}

export interface ScalesResult extends ResultBase {
  type: SlideType.Scales;
  average: number | null;
  distribution: ScaleDistributionResult[];
}

export interface RankingItemResult {
  id: string;
  label: string;
  averageRank: number | null;
  rankCounts: Array<{
    rank: number;
    count: number;
  }>;
}

export interface RankingResult extends ResultBase {
  type: SlideType.Ranking;
  items: RankingItemResult[];
}

export interface GuessBucketResult {
  value: number;
  count: number;
  isCorrect: boolean | null;
}

export interface GuessTheNumberResult extends ResultBase {
  type: SlideType.GuessTheNumber;
  averageGuess: number | null;
  correctValue: number | null;
  guesses: GuessBucketResult[];
}

export interface TwoByTwoPointResult {
  responseId: string;
  participantId: string;
  x: number;
  y: number;
}

export interface TwoByTwoResult extends ResultBase {
  type: SlideType.TwoByTwo;
  averageX: number | null;
  averageY: number | null;
  points: TwoByTwoPointResult[];
}

export interface SlideResultByType {
  [SlideType.MultipleChoice]: MultipleChoiceResult;
  [SlideType.WordCloud]: WordCloudResult;
  [SlideType.OpenEnded]: OpenEndedResult;
  [SlideType.Scales]: ScalesResult;
  [SlideType.Ranking]: RankingResult;
  [SlideType.GuessTheNumber]: GuessTheNumberResult;
  [SlideType.TwoByTwo]: TwoByTwoResult;
}

export type SlideResult = SlideResultByType[SlideType];
