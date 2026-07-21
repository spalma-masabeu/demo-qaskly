import { apiClient } from "./client";
import { SlideType } from "./types";
import type {
  PresentationDetail,
  ResultDetail,
  ResultLog,
  SessionInsights,
  SlideResult,
  SlideResultEntry,
  SlideViewModel,
} from "./types";

type RawRecord = Record<string, unknown>;

interface RawSessionResultSlide {
  slideId: string;
  position: number;
  type: string;
  result: SlideResult | null;
}

export async function listResultLogs(
  presentationId: string,
  accessToken: string,
  init?: RequestInit
): Promise<ResultLog[]> {
  const raw = await apiClient.get<unknown>(
    `/presentations/${presentationId}/sessions`,
    accessToken,
    init
  );
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as RawRecord).items)
      ? ((raw as RawRecord).items as unknown[])
      : [];

  return items.map((item) => adaptResultLog(item as RawRecord, presentationId));
}

export async function getSessionResultDetail(
  sessionId: string,
  accessToken: string,
  presentation: PresentationDetail,
  init?: RequestInit
): Promise<ResultDetail> {
  const [resultsRaw, sessionRaw, logs] = await Promise.all([
    apiClient
      .get<unknown>(`/sessions/${sessionId}/results`, accessToken, init)
      .catch(() => ({})),
    apiClient
      .get<unknown>(`/sessions/${sessionId}`, accessToken, init)
      .catch(() => null),
    listResultLogs(presentation.id, accessToken, init).catch(() => []),
  ]);

  return adaptResultDetail(
    resultsRaw as RawRecord,
    sessionRaw as RawRecord | null,
    presentation,
    logs.find((log) => log.sessionId === sessionId)
  );
}

function adaptResultDetail(
  raw: RawRecord,
  sessionRaw: RawRecord | null,
  presentation: PresentationDetail,
  summaryOverride?: ResultLog
): ResultDetail {
  if (isContractResultDetail(raw)) {
    const detail = raw as unknown as ResultDetail;
    return {
      summary: adaptResultLog(detail.summary as unknown as RawRecord, presentation.id),
      slideResults: detail.slideResults.map((entry) => ({
        slide: withFirstSliceFlag(entry.slide),
        result: entry.result,
      })),
      insights: detail.insights,
    };
  }

  const slides = Array.isArray(raw.slides)
    ? (raw.slides as RawSessionResultSlide[])
    : [];
  const slideResults = slides
    .map((entry) => toSlideResultEntry(entry, presentation.slides))
    .filter((entry): entry is SlideResultEntry => entry !== null);
  const responseCount = slideResults.reduce(
    (total, entry) => total + totalResponsesOf(entry.result),
    0
  );
  const participantCount = slideResults.reduce(
    (total, entry) => total + totalResponsesOf(entry.result),
    0
  );
  const possibleResponses = participantCount * Math.max(slideResults.length, 1);
  const status = String(raw.status ?? sessionRaw?.status ?? "").toUpperCase();
  const summary: ResultLog = summaryOverride ?? {
    sessionId: (raw.sessionId ?? sessionRaw?.id) as string,
    presentationId: (raw.presentationId ?? presentation.id) as string,
    participantCount,
    responseCount,
    startedAt: stringOrEmpty(sessionRaw?.startedAt ?? sessionRaw?.createdAt),
    endedAt: stringOrEmpty(sessionRaw?.endedAt ?? sessionRaw?.updatedAt),
    completionState: status === "ENDED" ? "completed" : "incomplete",
    engagementRate:
      possibleResponses === 0 ? 0 : Math.round((responseCount / possibleResponses) * 100),
  };

  return {
    summary,
    slideResults,
    insights: buildInsights(summary, slideResults),
  };
}

function adaptResultLog(raw: RawRecord, presentationId: string): ResultLog {
  const status = String(raw.status ?? raw.completionState ?? "").toUpperCase();
  const completionState =
    raw.completionState === "completed" || status === "ENDED"
      ? "completed"
      : "incomplete";

  return {
    sessionId: (raw.sessionId ?? raw.id) as string,
    presentationId: (raw.presentationId ?? presentationId) as string,
    participantCount: Number(raw.participantCount ?? 0),
    responseCount: Number(raw.responseCount ?? 0),
    startedAt: stringOrEmpty(raw.startedAt ?? raw.createdAt),
    endedAt: stringOrEmpty(raw.endedAt ?? raw.updatedAt),
    completionState,
    engagementRate: Number(raw.engagementRate ?? 0),
  };
}

function toSlideResultEntry(
  raw: RawSessionResultSlide,
  slides: SlideViewModel[]
): SlideResultEntry | null {
  const slide = slides.find((candidate) => candidate.id === raw.slideId);
  if (!slide) return null;
  return {
    slide: withFirstSliceFlag(slide),
    result: raw.result,
  };
}

function withFirstSliceFlag(slide: SlideViewModel): SlideViewModel {
  return {
    ...slide,
    isSupportedInFirstSlice: slide.isSupportedInFirstSlice ?? true,
  };
}

function buildInsights(
  summary: ResultLog,
  slideResults: SlideResultEntry[]
): SessionInsights {
  const topChoice = slideResults
    .map((entry) => entry.result)
    .find((result): result is Extract<SlideResult, { type: SlideType.MultipleChoice }> =>
      result?.type === SlideType.MultipleChoice
    )
    ?.options.reduce((best, option) => (option.count > best.count ? option : best))
    .label;
  const scaleResults = slideResults
    .map((entry) => entry.result)
    .filter((result): result is Extract<SlideResult, { type: SlideType.Scales }> =>
      result?.type === SlideType.Scales && typeof result.average === "number"
    );
  const averageScore =
    scaleResults.length === 0
      ? undefined
      : Math.round(
          (scaleResults.reduce((total, result) => total + (result.average ?? 0), 0) /
            scaleResults.length) *
            100
        ) / 100;

  return {
    topChoice,
    averageScore,
    participationRate: summary.engagementRate,
    unansweredSlides: slideResults.filter((entry) => totalResponsesOf(entry.result) === 0)
      .length,
  };
}

function totalResponsesOf(result: SlideResult | null): number {
  if (!result || !("totalResponses" in result)) return 0;
  return Number(result.totalResponses ?? 0);
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isContractResultDetail(raw: RawRecord): boolean {
  return (
    typeof raw.summary === "object" &&
    raw.summary !== null &&
    Array.isArray(raw.slideResults) &&
    typeof raw.insights === "object" &&
    raw.insights !== null
  );
}
