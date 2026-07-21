import {
  SlideType,
  type SlideConfig,
  type MultipleChoiceConfig,
  type WordCloudConfig,
  type OpenEndedConfig,
  type ScalesConfig,
  type RankingConfig,
  type GuessTheNumberConfig,
  type TwoByTwoConfig,
  type ChoiceOption,
  type MultipleChoiceResult,
  type WordCloudResult,
  type WordCloudWordResult,
  type OpenEndedResult,
  type TextResponseResult,
  type ScalesResult,
  type ScaleDistributionResult,
  type MultipleChoiceOptionResult,
  type RankingResult,
  type RankingItemResult,
  type GuessTheNumberResult,
  type GuessBucketResult,
  type TwoByTwoResult,
  type TwoByTwoPointResult,
} from "@qaskly/shared";

export {
  SlideType,
  type SlideConfig,
  type MultipleChoiceConfig,
  type WordCloudConfig,
  type OpenEndedConfig,
  type ScalesConfig,
  type RankingConfig,
  type GuessTheNumberConfig,
  type TwoByTwoConfig,
  type ChoiceOption,
  type MultipleChoiceResult,
  type WordCloudResult,
  type WordCloudWordResult,
  type OpenEndedResult,
  type TextResponseResult,
  type ScalesResult,
  type ScaleDistributionResult,
  type MultipleChoiceOptionResult,
  type RankingResult,
  type RankingItemResult,
  type GuessTheNumberResult,
  type GuessBucketResult,
  type TwoByTwoResult,
  type TwoByTwoPointResult,
};

// ---------- Error ----------

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

// ---------- Slide support ----------

export const SUPPORTED_SLIDE_TYPES = new Set<SlideType>([
  SlideType.MultipleChoice,
  SlideType.WordCloud,
  SlideType.OpenEnded,
  SlideType.Scales,
  SlideType.Ranking,
  SlideType.GuessTheNumber,
  SlideType.TwoByTwo,
]);

// ---------- Presentation ----------

export interface PresentationSummary {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  themeKey: string;
  status: "draft" | "ready" | "archived";
  slideCount: number;
  hasLiveSessions: boolean;
  updatedAt: string;
}

export interface PaginatedPresentations {
  items: PresentationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- Slide view model ----------

export interface SlideViewModel {
  id: string;
  type: SlideType;
  title?: string;
  prompt: string;
  position: number;
  config: SlideConfig;
  isSupportedInFirstSlice: boolean;
}

// ---------- Presentation detail ----------

export interface PresentationDetail {
  id: string;
  title: string;
  description?: string;
  themeKey: string;
  status: "draft" | "ready" | "archived";
  hasLiveSessions: boolean;
  slides: SlideViewModel[];
  updatedAt: string;
}

// ---------- Live session ----------

export type SessionStatus = "created" | "live" | "ended" | "incomplete";
export type SlideState = "waiting" | "active" | "closed" | "ended";

export interface LiveSessionState {
  sessionId: string;
  code: string;
  joinUrl: string;
  status: SessionStatus;
  currentState: SlideState;
  currentSlide?: SlideViewModel;
  responsesOpen: boolean;
  participantCount: number;
  results?: SlideResult | null;
}

// ---------- Results ----------

export type SlideResult =
  | MultipleChoiceResult
  | WordCloudResult
  | OpenEndedResult
  | ScalesResult
  | RankingResult
  | GuessTheNumberResult
  | TwoByTwoResult;

export interface ResultLog {
  sessionId: string;
  presentationId: string;
  participantCount: number;
  responseCount: number;
  startedAt: string;
  endedAt: string;
  completionState: "completed" | "incomplete";
  engagementRate: number;
}

export interface SlideResultEntry {
  slide: SlideViewModel;
  result: SlideResult | null;
}

export interface SessionInsights {
  topChoice?: string;
  averageScore?: number;
  participationRate: number;
  unansweredSlides: number;
}

export interface ResultDetail {
  summary: ResultLog;
  slideResults: SlideResultEntry[];
  insights: SessionInsights;
}
