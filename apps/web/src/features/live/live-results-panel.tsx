"use client";

import { getSlideEntry } from "@/features/slides/slide-registry";
import type { SlideViewModel, SlideResult } from "@/lib/api/types";

interface LiveResultsPanelProps {
  slide: SlideViewModel;
  result: SlideResult | null | undefined;
  responseCount?: number;
}

export function LiveResultsPanel({
  slide,
  result,
  responseCount,
}: LiveResultsPanelProps) {
  const entry = getSlideEntry(slide.type);
  const ResultDisplay = entry.ResultDisplay;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Resultados en vivo
        </p>
        {responseCount !== undefined && (
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary">
            {responseCount} respuesta{responseCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!result ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            Los resultados aparecerán aquí cuando lleguen respuestas.
          </p>
        </div>
      ) : ResultDisplay ? (
        <ResultDisplay slide={slide} result={result} />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            Visualización no disponible para este tipo de diapositiva.
          </p>
        </div>
      )}
    </div>
  );
}
