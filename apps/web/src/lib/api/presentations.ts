import { apiClient } from "./client";
import {
  SUPPORTED_SLIDE_TYPES,
  type PaginatedPresentations,
  type PresentationSummary,
  type PresentationDetail,
} from "./types";

function adaptPresentationSummary(raw: Record<string, unknown>): PresentationSummary {
  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description ?? undefined) as string | undefined,
    thumbnail: (raw.thumbnail ?? raw.thumbnailUrl ?? undefined) as string | undefined,
    themeKey: raw.themeKey as string,
    status: String(raw.status).toLowerCase() as PresentationSummary["status"],
    slideCount: Number(raw.slideCount ?? 0),
    hasLiveSessions: Boolean(raw.hasLiveSessions),
    updatedAt: raw.updatedAt as string,
  };
}

function adaptPresentationDetail(raw: Record<string, unknown>): PresentationDetail {
  const summary = adaptPresentationSummary(raw);
  return {
    ...summary,
    slides: ((raw.slides ?? []) as PresentationDetail["slides"]).map((slide) => ({
      ...slide,
      isSupportedInFirstSlice: SUPPORTED_SLIDE_TYPES.has(slide.type),
    })),
  };
}

export async function listPresentations(
  page: number,
  accessToken: string,
  init?: RequestInit
): Promise<PaginatedPresentations> {
  const raw = await apiClient.get<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    pageSize: number;
  }>(
    `/presentations?page=${page}&pageSize=8`,
    accessToken,
    init
  );
  return {
    ...raw,
    items: raw.items.map(adaptPresentationSummary),
  };
}

export async function createPresentation(
  payload: { title: string; description?: string },
  accessToken: string
): Promise<PresentationSummary> {
  const raw = await apiClient.post<Record<string, unknown>>(
    "/presentations",
    payload,
    accessToken
  );
  return adaptPresentationSummary(raw);
}

export async function updatePresentation(
  id: string,
  payload: { title?: string; description?: string | null; themeKey?: string },
  accessToken: string
): Promise<PresentationSummary> {
  const raw = await apiClient.patch<Record<string, unknown>>(
    `/presentations/${id}`,
    payload,
    accessToken
  );
  return adaptPresentationSummary(raw);
}

export async function deletePresentation(
  id: string,
  accessToken: string
): Promise<void> {
  return apiClient.delete(`/presentations/${id}`, accessToken);
}

export async function duplicatePresentation(
  id: string,
  accessToken: string
): Promise<PresentationSummary> {
  const raw = await apiClient.post<Record<string, unknown>>(
    `/presentations/${id}/duplicate`,
    undefined,
    accessToken
  );
  return adaptPresentationSummary(raw);
}

export async function getPresentationDetail(
  id: string,
  accessToken: string,
  init?: RequestInit
): Promise<PresentationDetail> {
  const raw = await apiClient.get<Record<string, unknown>>(
    `/presentations/${id}`,
    accessToken,
    init
  );
  return adaptPresentationDetail(raw);
}
