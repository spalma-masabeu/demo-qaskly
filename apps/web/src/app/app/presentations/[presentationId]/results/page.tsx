import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPresentationDetail } from "@/lib/api/presentations";
import { listResultLogs } from "@/lib/api/results";
import { isApiError, type ResultLog } from "@/lib/api/types";
import { getApiAccessToken } from "@/lib/auth/access-token";
import {
  PROTECTED_VIEW_CACHE_TAGS,
  protectedViewFetchOptions,
} from "@/lib/cache/protected-view-cache";
import { ROUTES } from "@/lib/routes";
import { PresentationHeader } from "@/features/presentation-shell/presentation-header";
import { ResultLogTable } from "@/features/results/result-log-table";

export const metadata: Metadata = {
  title: "Resultados",
  description: "Revisa sesiones históricas y métricas de participación.",
};

interface ResultsPageProps {
  params: Promise<{ presentationId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { presentationId } = await params;

  let presentation;
  let rows: ResultLog[] = [];
  let loadError: string | null = null;

  try {
    const token = await getApiAccessToken();
    presentation = await getPresentationDetail(
      presentationId,
      token,
      protectedViewFetchOptions(
        PROTECTED_VIEW_CACHE_TAGS.presentationDetail(presentationId)
      )
    );
    try {
      rows = await listResultLogs(
        presentationId,
        token,
        protectedViewFetchOptions(
          PROTECTED_VIEW_CACHE_TAGS.presentationResults(presentationId)
        )
      );
    } catch (err) {
      loadError = isApiError(err)
        ? err.message
        : "No se pudieron cargar las sesiones históricas.";
    }
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  async function refreshResultsAction(): Promise<ResultLog[]> {
    "use server";
    const token = await getApiAccessToken();
    return listResultLogs(presentationId, token);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PresentationHeader
        presentationId={presentationId}
        title={presentation.title}
        isEditable={!presentation.hasLiveSessions}
        backHref={ROUTES.APP.MAKER(presentationId)}
        backLabel="Volver al editor"
      />
      <main className="flex-1 bg-surface-subtle">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Resultados históricos
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Sesiones
            </h1>
            <p className="mt-2 text-base text-gray-500">
              Revisa participación, respuestas y engagement por sesión.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:p-4">
            <ResultLogTable
              presentationId={presentationId}
              initialRows={rows}
              initialError={loadError}
              refreshAction={refreshResultsAction}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
