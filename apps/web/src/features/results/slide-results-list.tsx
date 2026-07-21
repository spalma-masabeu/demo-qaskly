"use client";

// Side-effect imports: populate registry before first render.
import "@/features/slides/types/multiple-choice";
import "@/features/slides/types/open-ended";
import "@/features/slides/types/word-cloud";
import "@/features/slides/types/scales";
import "@/features/slides/types/ranking";
import "@/features/slides/types/guess-the-number";
import "@/features/slides/types/two-by-two";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSlideEntry } from "@/features/slides/slide-registry";
import type { SlideResultEntry } from "@/lib/api/types";

interface SlideResultsListProps {
  slideResults: SlideResultEntry[];
}

export function SlideResultsList({ slideResults }: SlideResultsListProps) {
  if (slideResults.length === 0) {
    return (
      <EmptyState
        title="Sin resultados por diapositiva"
        description="Esta sesión aún no tiene datos de respuestas para mostrar."
      />
    );
  }

  return (
    <section aria-label="Resultados por diapositiva" className="space-y-4">
      {slideResults.map(({ slide, result }) => {
        const entry = getSlideEntry(slide.type);
        const ResultDisplay = entry.ResultDisplay;

        return (
          <Card key={slide.id} className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-1">
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                Diapositiva {slide.position}
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {slide.title || slide.prompt}
              </h2>
              {slide.title && (
                <p className="text-base text-gray-500">{slide.prompt}</p>
              )}
            </div>

            {!result ? (
              <Placeholder>Sin respuestas registradas</Placeholder>
            ) : ResultDisplay ? (
              <ResultDisplay slide={slide} result={result} />
            ) : (
              <Placeholder>Visualización no disponible</Placeholder>
            )}
          </Card>
        );
      })}
    </section>
  );
}

function Placeholder({ children }: { children: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-gray-200">
      <p className="text-base text-gray-400">{children}</p>
    </div>
  );
}
