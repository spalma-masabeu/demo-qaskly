import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { PROTECTED_VIEW_ROUTES, ROUTES } from "@/lib/routes";

type NextTaggedRequestInit = RequestInit & {
  next: {
    revalidate: number;
    tags: string[];
  };
};

export const PROTECTED_VIEW_CACHE_SECONDS = 60;

export const PROTECTED_VIEW_CACHE_TAGS = {
  presenterHome: "presenter-home",
  presentationsList: "presentations-list",
  presentationDetail: (presentationId: string) =>
    `presentation-detail:${presentationId}`,
  presentationResults: (presentationId: string) =>
    `presentation-results:${presentationId}`,
  sessionResults: (sessionId: string) => `session-results:${sessionId}`,
} as const;

export function protectedViewFetchOptions(
  ...tags: string[]
): NextTaggedRequestInit {
  return {
    next: {
      revalidate: PROTECTED_VIEW_CACHE_SECONDS,
      tags,
    },
  };
}

export function refreshPresenterHome(): void {
  revalidateTag(PROTECTED_VIEW_CACHE_TAGS.presenterHome);
  revalidatePath(PROTECTED_VIEW_ROUTES.INCLUDED.HOME);
}

export function refreshPresentationsList(): void {
  revalidateTag(PROTECTED_VIEW_CACHE_TAGS.presentationsList);
  revalidatePath(PROTECTED_VIEW_ROUTES.INCLUDED.PRESENTATIONS);
}

export function refreshPresentationDetail(presentationId: string): void {
  revalidateTag(PROTECTED_VIEW_CACHE_TAGS.presentationDetail(presentationId));
  revalidatePath(PROTECTED_VIEW_ROUTES.INCLUDED.MAKER(presentationId));
}

export function refreshPresentationResults(presentationId: string): void {
  revalidateTag(PROTECTED_VIEW_CACHE_TAGS.presentationResults(presentationId));
  revalidatePath(PROTECTED_VIEW_ROUTES.INCLUDED.RESULTS(presentationId));
}

export function refreshSessionResults(
  presentationId: string,
  sessionId: string
): void {
  revalidateTag(PROTECTED_VIEW_CACHE_TAGS.sessionResults(sessionId));
  revalidatePath(
    PROTECTED_VIEW_ROUTES.INCLUDED.RESULT_DETAIL(presentationId, sessionId)
  );
}

export function refreshAfterPresentationCreate(): void {
  refreshPresenterHome();
  refreshPresentationsList();
}

export function refreshAfterPresentationUpdate(presentationId: string): void {
  refreshPresentationsList();
  refreshPresentationDetail(presentationId);
}

export function refreshAfterPresentationDelete(presentationId: string): void {
  refreshPresenterHome();
  refreshPresentationsList();
  refreshPresentationDetail(presentationId);
  refreshPresentationResults(presentationId);
}

export function refreshAfterPresentationDuplicate(copyId?: string): void {
  refreshPresenterHome();
  refreshPresentationsList();
  if (copyId) {
    refreshPresentationDetail(copyId);
  }
}

export function refreshAfterSlidesChange(presentationId: string): void {
  refreshPresentationDetail(presentationId);
}

export function refreshAfterLiveSessionStart(presentationId: string): void {
  refreshPresentationsList();
  refreshPresentationDetail(presentationId);
}

export function refreshAfterSessionEnd(
  presentationId: string,
  sessionId: string
): void {
  refreshPresentationResults(presentationId);
  refreshSessionResults(presentationId, sessionId);
}

export function refreshLiveRouteShell(presentationId: string): void {
  revalidatePath(ROUTES.APP.LIVE(presentationId));
}
