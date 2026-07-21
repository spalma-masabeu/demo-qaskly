"use server";

import { redirect } from "next/navigation";
import { getApiAccessToken } from "@/lib/auth/access-token";
import {
  listPresentations,
  createPresentation,
  updatePresentation,
  deletePresentation,
  duplicatePresentation,
} from "@/lib/api/presentations";
import { isApiError, type PaginatedPresentations } from "@/lib/api/types";
import {
  PROTECTED_VIEW_CACHE_TAGS,
  protectedViewFetchOptions,
  refreshAfterPresentationCreate,
  refreshAfterPresentationDelete,
  refreshAfterPresentationDuplicate,
  refreshAfterPresentationUpdate,
  refreshLiveRouteShell,
} from "@/lib/cache/protected-view-cache";
import { ROUTES } from "@/lib/routes";

export async function fetchPresentationsPageAction(
  page: number
): Promise<PaginatedPresentations> {
  const token = await getApiAccessToken();
  return listPresentations(
    page,
    token,
    protectedViewFetchOptions(PROTECTED_VIEW_CACHE_TAGS.presentationsList)
  );
}

export async function createPresentationAction(
  title: string
): Promise<{ error?: string }> {
  let presentationId: string;
  try {
    const token = await getApiAccessToken();
    const presentation = await createPresentation(
      { title },
      token
    );
    presentationId = presentation.id;
    refreshAfterPresentationCreate();
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo crear la presentación." };
  }
  redirect(ROUTES.APP.MAKER(presentationId));
}

export async function updatePresentationTitleAction(
  id: string,
  title: string
): Promise<{ title?: string; error?: string }> {
  try {
    const token = await getApiAccessToken();
    const presentation = await updatePresentation(id, { title }, token);
    refreshAfterPresentationUpdate(id);
    refreshLiveRouteShell(id);
    return { title: presentation.title };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo actualizar el título." };
  }
}

export async function updatePresentationThemeAction(
  id: string,
  themeKey: string
): Promise<{ themeKey?: string; error?: string }> {
  try {
    const token = await getApiAccessToken();
    const presentation = await updatePresentation(id, { themeKey }, token);
    refreshAfterPresentationUpdate(id);
    refreshLiveRouteShell(id);
    return { themeKey: presentation.themeKey };
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo actualizar el tema." };
  }
}

export async function deletePresentationAction(id: string): Promise<{ error?: string }> {
  try {
    const token = await getApiAccessToken();
    await deletePresentation(id, token);
    refreshAfterPresentationDelete(id);
    return {};
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo eliminar la presentación." };
  }
}

export async function duplicatePresentationAction(id: string): Promise<{ error?: string }> {
  try {
    const token = await getApiAccessToken();
    const copy = await duplicatePresentation(id, token);
    refreshAfterPresentationDuplicate(copy.id);
    return {};
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo duplicar la presentación." };
  }
}

export async function duplicatePresentationAndOpenAction(
  id: string
): Promise<{ error?: string }> {
  let copyId: string;
  try {
    const token = await getApiAccessToken();
    const copy = await duplicatePresentation(id, token);
    copyId = copy.id;
    refreshAfterPresentationDuplicate(copyId);
  } catch (err) {
    if (isApiError(err)) return { error: err.message };
    return { error: "No se pudo duplicar la presentación." };
  }
  redirect(ROUTES.APP.MAKER(copyId));
}
