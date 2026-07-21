import { apiClient } from "./client";
import { type SlideViewModel, type SlideConfig, type SlideType } from "./types";

export interface CreateSlidePayload {
  type: SlideType;
  prompt: string;
  title?: string;
  position?: number;
  config: SlideConfig;
}

export interface UpdateSlidePayload {
  prompt?: string;
  title?: string;
  position?: number;
  config?: SlideConfig;
}

export async function createSlide(
  presentationId: string,
  payload: CreateSlidePayload,
  accessToken: string
): Promise<SlideViewModel> {
  return apiClient.post<SlideViewModel>(
    `/presentations/${presentationId}/slides`,
    payload,
    accessToken
  );
}

export async function updateSlide(
  slideId: string,
  payload: UpdateSlidePayload,
  accessToken: string
): Promise<SlideViewModel> {
  return apiClient.patch<SlideViewModel>(`/slides/${slideId}`, payload, accessToken);
}

export async function deleteSlide(
  slideId: string,
  accessToken: string
): Promise<void> {
  return apiClient.delete(`/slides/${slideId}`, accessToken);
}
