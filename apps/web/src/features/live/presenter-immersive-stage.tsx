"use client";

import { ChevronRight, StopCircle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSlideEntry } from "@/features/slides/slide-registry";
import { getPresentationThemeVars } from "@/features/presentation-shell/presentation-theme";
import type { SlideResult, SlideViewModel } from "@/lib/api/types";

interface PresenterImmersiveStageProps {
  slide: SlideViewModel;
  code: string;
  result: SlideResult | null;
  phase: "active" | "closed";
  hasNextSlide: boolean;
  actionPending: boolean;
  onCloseSlide: () => void;
  onNextSlide: () => void;
  onEndSession: () => void;
  themeKey: string;
}

export function PresenterImmersiveStage({
  slide,
  code,
  result,
  phase,
  hasNextSlide,
  actionPending,
  onCloseSlide,
  onNextSlide,
  onEndSession,
  themeKey,
}: PresenterImmersiveStageProps) {
  const entry = getSlideEntry(slide.type);
  const ResultDisplay = entry.ResultDisplay;

  return (
    <main
      className="flex h-dvh flex-col overflow-hidden"
      style={{
        ...getPresentationThemeVars(themeKey),
        backgroundColor: "var(--presentation-fg)",
        color: "var(--presentation-bg)",
      }}
    >
      <header
        className="grid gap-3 border-b px-5 py-4 md:grid-cols-[1fr_auto] md:items-center md:px-8 md:py-5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--presentation-fg) 90%, var(--presentation-accent) 10%)",
          borderColor: "color-mix(in srgb, var(--presentation-bg) 22%, transparent)",
        }}
      >
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] opacity-80 md:text-sm">
            <span>Codigo</span>
            <span className="tracking-[0.28em]">{code}</span>
          </div>
          <h1 className="line-clamp-2 max-w-6xl text-2xl font-black leading-tight md:text-4xl">
            {slide.prompt || slide.title || "Sin titulo"}
          </h1>
        </div>

        <div className="flex flex-wrap items-stretch gap-3 md:justify-end">
          {phase === "active" ? (
            <Button
              onClick={onCloseSlide}
              disabled={actionPending}
              loading={actionPending}
              size="md"
              className="min-h-12 gap-2 px-4"
              style={{
                backgroundColor: "var(--presentation-bg)",
                color: "var(--presentation-fg)",
              }}
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              Cerrar respuestas
            </Button>
          ) : hasNextSlide ? (
            <Button
              onClick={onNextSlide}
              disabled={actionPending}
              loading={actionPending}
              size="md"
              className="min-h-12 gap-2 px-4"
              style={{
                backgroundColor: "var(--presentation-bg)",
                color: "var(--presentation-fg)",
              }}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              Siguiente diapositiva
            </Button>
          ) : (
            <Button
              onClick={onEndSession}
              disabled={actionPending}
              loading={actionPending}
              size="md"
              className="min-h-12 gap-2 px-4"
              style={{
                backgroundColor: "var(--presentation-bg)",
                color: "var(--presentation-fg)",
              }}
            >
              <StopCircle className="h-4 w-4" aria-hidden="true" />
              Finalizar sesión
            </Button>
          )}
        </div>
      </header>

      <section
        className="min-h-0 flex-1 overflow-hidden p-3 md:p-4"
        style={{ backgroundColor: "var(--presentation-bg)", color: "var(--presentation-fg)" }}
      >
        <div
          className="flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border p-3 shadow-sm md:p-4"
          style={{
            backgroundColor: "color-mix(in srgb, var(--presentation-bg) 94%, var(--presentation-accent) 6%)",
            borderColor: "color-mix(in srgb, var(--presentation-accent) 24%, transparent)",
          }}
        >
          {result && ResultDisplay ? (
            <div className="w-full min-w-0 max-w-[96rem] max-h-full overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
              <ResultDisplay
                slide={slide}
                result={result}
                variant="immersive"
                phase={phase}
              />
            </div>
          ) : result && !ResultDisplay ? (
            <div className="flex min-h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200">
              <p className="text-lg font-medium text-slate-400">
                Visualización no disponible para este tipo de diapositiva
              </p>
            </div>
          ) : (
            <div className="flex min-h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-slate-200">
              <p className="text-lg font-medium text-slate-400">
                Esperando respuestas
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
