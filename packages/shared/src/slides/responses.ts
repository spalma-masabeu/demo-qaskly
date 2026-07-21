import { SlideType } from "./types";

export interface MultipleChoiceResponse {
  selectedOptionIds: string[];
}

export interface WordCloudResponse {
  words: string[];
}

export interface OpenEndedResponse {
  text: string;
}

export interface ScalesResponse {
  value: number;
}

export interface RankingResponse {
  orderedItemIds: string[];
}

export interface GuessTheNumberResponse {
  guess: number;
}

export interface TwoByTwoResponse {
  x: number;
  y: number;
}

export interface SlideResponseByType {
  [SlideType.MultipleChoice]: MultipleChoiceResponse;
  [SlideType.WordCloud]: WordCloudResponse;
  [SlideType.OpenEnded]: OpenEndedResponse;
  [SlideType.Scales]: ScalesResponse;
  [SlideType.Ranking]: RankingResponse;
  [SlideType.GuessTheNumber]: GuessTheNumberResponse;
  [SlideType.TwoByTwo]: TwoByTwoResponse;
}

export type SlideResponse = SlideResponseByType[SlideType];
