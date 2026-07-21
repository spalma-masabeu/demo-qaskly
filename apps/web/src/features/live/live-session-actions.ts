"use server";

import { getApiAccessToken } from "@/lib/auth/access-token";
import {
  createLiveSession,
  getLiveSession,
  getActiveLiveSession,
  startSession,
  closeSlide,
  nextSlide,
  endSession,
  getLiveSlideResult,
} from "@/lib/api/live-sessions";
import { isApiError, type LiveSessionState, type SlideResult } from "@/lib/api/types";
import {
  refreshAfterLiveSessionStart,
  refreshAfterSessionEnd,
} from "@/lib/cache/protected-view-cache";

type ActionResult = { state?: LiveSessionState; error?: string };
type ResultActionResult = { result?: SlideResult; error?: string };

export async function createLiveSessionAction(
  presentationId: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await createLiveSession(presentationId, token);
    refreshAfterLiveSessionStart(presentationId);
    return { state };
  } catch (err) {
    console.error("[live-session] createLiveSession error:", err);
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo crear la sesión." };
  }
}

export async function refreshLiveSessionAction(
  sessionId: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await getLiveSession(sessionId, token);
    return { state };
  } catch (err) {
    return {};
  }
}

export async function getActiveLiveSessionAction(
  presentationId: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await getActiveLiveSession(presentationId, token);
    return { state };
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") return {};
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo recuperar la sesión." };
  }
}

export async function startSessionAction(
  sessionId: string,
  presentationId?: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await startSession(sessionId, token);
    if (presentationId) {
      refreshAfterLiveSessionStart(presentationId);
    }
    return { state };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo iniciar la sesión." };
  }
}

export async function closeSlideAction(
  sessionId: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await closeSlide(sessionId, token);
    return { state };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo cerrar la diapositiva." };
  }
}

export async function nextSlideAction(
  sessionId: string,
  presentationId?: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await nextSlide(sessionId, token);
    if (
      presentationId &&
      (state.status === "ended" || state.status === "incomplete")
    ) {
      refreshAfterSessionEnd(presentationId, sessionId);
    }
    return { state };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo avanzar a la siguiente diapositiva." };
  }
}

export async function endSessionAction(
  sessionId: string,
  presentationId?: string
): Promise<ActionResult> {
  try {
    const token = await getApiAccessToken();
    const state = await endSession(sessionId, token);
    if (presentationId) {
      refreshAfterSessionEnd(presentationId, sessionId);
    }
    return { state };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo finalizar la sesión." };
  }
}

export async function refreshSlideResultAction(
  sessionId: string,
  slideId: string
): Promise<ResultActionResult> {
  try {
    const token = await getApiAccessToken();
    const result = await getLiveSlideResult(sessionId, slideId, token);
    return { result };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo cargar el resultado de la diapositiva." };
  }
}
