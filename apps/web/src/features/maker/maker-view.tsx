"use client";

// Side-effect imports: populate registry before first render
import "@/features/slides/types/multiple-choice";
import "@/features/slides/types/open-ended";
import "@/features/slides/types/word-cloud";
import "@/features/slides/types/scales";
import "@/features/slides/types/ranking";
import "@/features/slides/types/guess-the-number";
import "@/features/slides/types/two-by-two";

import { useState } from "react";
import { SlideType } from "@qaskly/shared";
import type { PresentationDetail, SlideViewModel, SlideConfig } from "@/lib/api/types";
import { SlideThumbnailRail } from "./slide-thumbnail-rail";
import { SlidePreviewFrame } from "./slide-preview-frame";
import { SlideSettingsPanel } from "./slide-settings-panel";
import { MakerReadonlyBanner } from "./maker-readonly-banner";
import {
  createSlideAction,
  updateSlideAction,
  deleteSlideAction,
} from "./slide-actions";

interface MakerViewProps {
  presentation: PresentationDetail;
}

export function MakerView({ presentation }: MakerViewProps) {
  const isEditable = !presentation.hasLiveSessions;
  const [slides, setSlides] = useState<SlideViewModel[]>(presentation.slides);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    presentation.slides[0]?.id ?? null
  );
  const [addError, setAddError] = useState<string | null>(null);

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? null;

  async function handleAddSlide(type: SlideType) {
    setAddError(null);
    const result = await createSlideAction(presentation.id, type);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    if (result.slide) {
      setSlides((prev) => [...prev, result.slide!]);
      setActiveSlideId(result.slide.id);
    }
  }

  async function handleDeleteSlide(slideId: string) {
    const result = await deleteSlideAction(presentation.id, slideId);
    if (result.error) {
      setAddError(result.error);
      return;
    }
    const next = slides.filter((s) => s.id !== slideId);
    setSlides(next);
    if (activeSlideId === slideId) {
      setActiveSlideId(next[0]?.id ?? null);
    }
  }

  async function handleSaveSlide(updated: {
    prompt: string;
    title?: string;
    config: SlideConfig;
  }) {
    if (!activeSlide) return;
    const result = await updateSlideAction(
      presentation.id,
      activeSlide.id,
      updated
    );
    if (result.error) throw new Error(result.error);
    if (result.slide) {
      setSlides((prev) =>
        prev.map((s) => (s.id === result.slide!.id ? result.slide! : s))
      );
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {presentation.hasLiveSessions && (
        <MakerReadonlyBanner presentationId={presentation.id} />
      )}

      {addError && (
        <div
          className="border-b border-danger/20 bg-danger-light/10 px-4 py-2 text-sm text-danger"
          role="alert"
        >
          {addError}
        </div>
      )}

      {/* Three-zone layout: rail / preview / settings */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail rail: horizontal on mobile, vertical sidebar on md+ */}
        <div className="w-full shrink-0 border-b border-gray-200 md:w-[20%] md:border-b-0 md:border-r md:border-gray-200 md:overflow-y-auto">
          <SlideThumbnailRail
            slides={slides}
            activeSlideId={activeSlideId}
            onSelect={setActiveSlideId}
            onAdd={handleAddSlide}
            onDelete={handleDeleteSlide}
            disabled={!isEditable}
          />
        </div>

        {/* Preview: hidden on mobile when settings open, center on md+ */}
        <div className="hidden flex-1 md:flex md:w-[55%] md:flex-col">
          <SlidePreviewFrame
            slide={activeSlide}
            themeKey={presentation.themeKey}
          />
        </div>

        {/* Settings panel: full width on mobile, right panel on md+ */}
        <div className="flex-1 border-t border-gray-200 bg-white md:w-[25%] md:flex-none md:border-l md:border-t-0 md:border-gray-200 md:overflow-y-auto">
          {activeSlide ? (
            <SlideSettingsPanel
              key={activeSlide.id}
              slide={activeSlide}
              isEditable={isEditable}
              onSave={handleSaveSlide}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-base text-gray-400">
                {slides.length === 0
                  ? "Agrega una diapositiva para comenzar."
                  : "Selecciona una diapositiva para editarla."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
