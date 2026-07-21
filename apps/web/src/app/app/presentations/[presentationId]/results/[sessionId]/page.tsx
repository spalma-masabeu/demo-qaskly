import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { getPresentationDetail } from "@/lib/api/presentations";
import { getSessionResultDetail } from "@/lib/api/results";
import { isApiError } from "@/lib/api/types";
import { getApiAccessToken } from "@/lib/auth/access-token";
import {
  PROTECTED_VIEW_CACHE_TAGS,
  protectedViewFetchOptions,
} from "@/lib/cache/protected-view-cache";
import { ROUTES } from "@/lib/routes";
import { PresentationHeader } from "@/features/presentation-shell/presentation-header";
import { ResultSummaryCards } from "@/features/results/result-summary-cards";
import { SlideResultsList } from "@/features/results/slide-results-list";

export const metadata: Metadata = {
  title: "Detalle de sesión",
  description: "Consulta métricas y respuestas de una sesión histórica.",
};

interface ResultDetailPageProps {
  params: Promise<{ presentationId: string; sessionId: string }>;
}

export default async function ResultDetailPage({
  params,
}: ResultDetailPageProps) {
  const { presentationId, sessionId } = await params;

  let presentation;
  let detail;
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
      detail = await getSessionResultDetail(
        sessionId,
        token,
        presentation,
        protectedViewFetchOptions(
          PROTECTED_VIEW_CACHE_TAGS.presentationResults(presentationId),
          PROTECTED_VIEW_CACHE_TAGS.sessionResults(sessionId)
        )
      );
    } catch (err) {
      if (isApiError(err) && err.code === "NOT_FOUND") notFound();
      loadError = String(err);
    }
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PresentationHeader
        presentationId={presentationId}
        title={presentation.title}
        isEditable={!presentation.hasLiveSessions}
        backHref={ROUTES.APP.RESULTS(presentationId)}
        backLabel="Volver a resultados"
      />
      <main className="flex-1 bg-surface-subtle">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Resultados históricos
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Detalle de sesión
            </h1>
            <p className="mt-2 text-base text-gray-500">
              Métricas agregadas y resultados por diapositiva.
            </p>
          </div>

          {loadError || !detail ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <ErrorState
                title="No se pudo cargar la sesión"
                message={loadError ?? "Error desconocido."}
              />
            </div>
          ) : (
            <>
              <ResultSummaryCards summary={detail.summary} />
              <SlideResultsList slideResults={detail.slideResults} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
