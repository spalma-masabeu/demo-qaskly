import { SlideType } from "./types";

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface MultipleChoiceConfig {
  options: ChoiceOption[];
  allowMultiple: boolean;
}

export interface WordCloudConfig {
  inputCount: number;
  maxWordLength: number;
}

export interface OpenEndedConfig {
  maxLength: number;
}

export interface ScalesConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  step?: number;
}

export interface RankingConfig {
  items: ChoiceOption[];
}

export interface GuessTheNumberConfig {
  min: number;
  max: number;
  correctValue?: number;
}

export interface TwoByTwoConfig {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xMinLabel: string;
  xMaxLabel: string;
  yMinLabel: string;
  yMaxLabel: string;
}

export interface SlideConfigByType {
  [SlideType.MultipleChoice]: MultipleChoiceConfig;
  [SlideType.WordCloud]: WordCloudConfig;
  [SlideType.OpenEnded]: OpenEndedConfig;
  [SlideType.Scales]: ScalesConfig;
  [SlideType.Ranking]: RankingConfig;
  [SlideType.GuessTheNumber]: GuessTheNumberConfig;
  [SlideType.TwoByTwo]: TwoByTwoConfig;
}

export type SlideConfig = SlideConfigByType[SlideType];
