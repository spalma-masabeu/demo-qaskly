"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SlideType } from "@qaskly/shared";
import type { SlideViewModel } from "@/lib/api/types";
import { getSlideEntry, getSupportedSlideTypes } from "@/features/slides/slide-registry";

interface SlideThumbnailRailProps {
  slides: SlideViewModel[];
  activeSlideId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: SlideType) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function SlideThumbnailRail({
  slides,
  activeSlideId,
  onSelect,
  onAdd,
  onDelete,
  disabled,
}: SlideThumbnailRailProps) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const supportedTypes = getSupportedSlideTypes();

  return (
    <div className="flex h-full flex-col">
      {/* Desktop: vertical list. Mobile: horizontal scroll. */}
      <ol
        className="flex flex-row gap-2 overflow-x-auto p-2 md:flex-col md:overflow-x-visible md:overflow-y-auto"
        aria-label="Diapositivas"
      >
        {slides.map((slide, index) => {
          const isActive = slide.id === activeSlideId;
          const entry = getSlideEntry(slide.type);
          return (
            <li key={slide.id} className="group relative shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                disabled={disabled}
                aria-current={isActive ? "true" : undefined}
                aria-label={`Diapositiva ${index + 1}: ${entry.label}`}
                className={[
                  "relative flex w-28 flex-col gap-1 rounded-lg border p-2 text-left transition-all md:w-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-surface-muted",
                ].join(" ")}
              >
                {/* Active left border indicator */}
                {isActive && (
                  <span
                    className="absolute inset-y-0 left-0 w-0.5 rounded-l-lg bg-primary"
                    aria-hidden="true"
                  />
                )}

                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-500">{entry.label}</span>
                </span>

                <span className="line-clamp-2 text-sm text-gray-700">
                  {slide.prompt || (
                    <span className="text-gray-400 italic">Sin pregunta</span>
                  )}
                </span>
              </button>

              {/* Delete button — visible on hover, only when editable */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onDelete(slide.id)}
                  aria-label={`Eliminar diapositiva ${index + 1}`}
                  className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded bg-white/80 text-gray-400 opacity-0 ring-1 ring-gray-200 transition-opacity hover:bg-white hover:text-danger group-hover:flex group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Add slide button */}
      {!disabled && (
        <div className="shrink-0 p-2">
          <button
            type="button"
            onClick={() => setShowTypePicker((v) => !v)}
            aria-label="Agregar diapositiva"
            aria-expanded={showTypePicker}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-base text-gray-500 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="hidden md:inline">Agregar diapositiva</span>
          </button>

          {/* Inline picker — no absolute positioning to avoid overflow-hidden clipping */}
          {showTypePicker && (
            <div
              className="mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              role="menu"
              aria-label="Tipo de diapositiva"
            >
              {supportedTypes.map((type) => {
                const entry = getSlideEntry(type);
                const Icon = entry.Icon;
                return (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onAdd(type);
                      setShowTypePicker(false);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-base text-gray-700 transition-colors hover:bg-surface-muted"
                  >
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        entry.tint,
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium">{entry.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
