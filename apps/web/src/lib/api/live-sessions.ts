import { apiClient } from "./client";
import type { LiveSessionState, SessionStatus, SlideState, SlideViewModel, SlideResult } from "./types";

function adaptSession(raw: Record<string, unknown>): LiveSessionState {
  return {
    sessionId: (raw.id ?? raw.sessionId) as string,
    code: raw.code as string,
    joinUrl: raw.code as string,
    status: String(raw.status).toLowerCase() as SessionStatus,
    currentState: raw.currentState as SlideState,
    currentSlide: (raw.currentSlide ?? undefined) as SlideViewModel | undefined,
    responsesOpen: true,
    participantCount: Number(raw.participantCount ?? 0),
    results: (raw.results ?? null) as SlideResult | null | undefined,
  };
}

export async function createLiveSession(
  presentationId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/presentations/${presentationId}/sessions`,
    {},
    accessToken
  );
  return adaptSession(raw);
}

export async function getLiveSession(
  sessionId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.get<Record<string, unknown>>(`/sessions/${sessionId}`, accessToken);
  return adaptSession(raw);
}

export async function getActiveLiveSession(
  presentationId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.get<Record<string, unknown>>(
    `/presentations/${presentationId}/sessions/active`,
    accessToken
  );
  return adaptSession(raw);
}

export async function startSession(
  sessionId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/sessions/${sessionId}/start`,
    undefined,
    accessToken
  );
  return adaptSession(raw);
}

export async function closeSlide(
  sessionId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/sessions/${sessionId}/close-slide`,
    undefined,
    accessToken
  );
  return adaptSession(raw);
}

export async function nextSlide(
  sessionId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/sessions/${sessionId}/next-slide`,
    undefined,
    accessToken
  );
  return adaptSession(raw);
}

export async function endSession(
  sessionId: string,
  accessToken: string
): Promise<LiveSessionState> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/sessions/${sessionId}/end`,
    undefined,
    accessToken
  );
  return adaptSession(raw);
}

export async function getLiveSlideResult(
  sessionId: string,
  slideId: string,
  accessToken: string
): Promise<SlideResult> {
  const raw = await apiClient.get<{ result: SlideResult }>(
    `/sessions/${sessionId}/slides/${slideId}/results`,
    accessToken
  );
  return raw.result;
}
