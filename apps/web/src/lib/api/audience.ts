import { apiClient } from "./client";
import type { SlideViewModel } from "./types";

export interface JoinRoomResponse {
  participantId: string;
  participantToken: string;
  sessionId: string;
  token?: string;
  currentSlide?: SlideViewModel;
  responsesOpen: boolean;
  themeKey?: string;
}

export async function joinRoom(
  code: string,
  payload: { participantToken?: string; displayName?: string }
): Promise<JoinRoomResponse> {
  const raw = await apiClient.post<Record<string, unknown>>(`/public/sessions/${code}/join`, payload);
  const result: JoinRoomResponse = {
    participantId: (raw.participantId ?? raw.id) as string,
    participantToken: (raw.participantToken ?? raw.token) as string,
    sessionId: (raw.sessionId ?? raw.session_id ?? "") as string,
    currentSlide: raw.currentSlide as SlideViewModel | undefined,
    responsesOpen: raw.responsesOpen !== false,
    themeKey: raw.themeKey as string | undefined,
  };
  return result;
}
