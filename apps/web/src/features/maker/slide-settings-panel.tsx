"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { getSlideConfigValidationErrors } from "@qaskly/shared";
import type { SlideViewModel, SlideConfig } from "@/lib/api/types";
import { SUPPORTED_SLIDE_TYPES } from "@/lib/api/types";
import { getSlideEntry } from "@/features/slides/slide-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SaveState = "idle" | "saving" | "saved" | "error";

interface SlideSettingsPanelProps {
  slide: SlideViewModel;
  isEditable: boolean;
  onSave: (updated: {
    prompt: string;
    title?: string;
    config: SlideConfig;
  }) => Promise<void>;
}

export function SlideSettingsPanel({
  slide,
  isEditable,
  onSave,
}: SlideSettingsPanelProps) {
  const [prompt, setPrompt] = useState(slide.prompt);
  const [title, setTitle] = useState(slide.title ?? "");
  const [config, setConfig] = useState<SlideConfig>(slide.config);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Reset local state when active slide changes
  useEffect(() => {
    setPrompt(slide.prompt);
    setTitle(slide.title ?? "");
    setConfig(slide.config);
    setConfigErrors({});
    setSaveState("idle");
    setSaveError(null);
  }, [slide.id]);

  function handleConfigChange(next: SlideConfig) {
    setConfig(next);
    const errors = getSlideConfigValidationErrors(slide.type, next);
    setConfigErrors(errorsToFieldMap(errors));
  }

  function handleSave() {
    const errors = getSlideConfigValidationErrors(slide.type, config);
    if (errors.length > 0) {
      setConfigErrors(errorsToFieldMap(errors));
      return;
    }

    startTransition(async () => {
      setSaveState("saving");
      setSaveError(null);
      try {
        await onSave({ prompt, title: title || undefined, config });
        setSaveState("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        setSaveState("error");
        setSaveError(
          err instanceof Error ? err.message : "No se pudo guardar."
        );
      }
    });
  }

  const entry = getSlideEntry(slide.type);
  const EditorForm = entry.EditorForm;
  const isUnsupported = !SUPPORTED_SLIDE_TYPES.has(slide.type);
  const disabled = !isEditable || isPending;

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">
      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            {entry.label}
          </p>
        </div>

        {isUnsupported ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-base font-medium text-gray-500">{entry.label}</p>
            <p className="mt-1 text-sm text-gray-400">
              Disponible en una próxima versión. No se puede editar este tipo de
              diapositiva.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="slide-title">
                Título{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="slide-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la diapositiva"
                disabled={disabled}
                aria-label="Título de la diapositiva"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="slide-prompt" required>
                Pregunta
              </Label>
              <Textarea
                id="slide-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="¿Cuál es tu pregunta?"
                disabled={disabled}
                aria-label="Pregunta de la diapositiva"
              />
            </div>

            {EditorForm && (
              <div className="border-t border-gray-100 pt-4">
                <EditorForm
                  slide={slide}
                  config={config as never}
                  onChange={handleConfigChange as never}
                  disabled={disabled}
                  errors={configErrors}
                />
              </div>
            )}
          </>
        )}
      </div>

      {!isUnsupported && (
        <div className="border-t border-gray-100 p-4">
          {saveError && (
            <p className="mb-2 text-sm text-danger" role="alert">
              {saveError}
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={disabled}
            loading={isPending}
            className="w-full"
            aria-label="Guardar cambios"
          >
            {saveState === "saved" ? "Guardado" : "Guardar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function errorsToFieldMap(errors: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const error of errors) {
    // Match "fieldA and fieldB ..." compound errors as well as single-field errors
    const match = error.match(/^(\w+)(?:\s+and\s+(\w+))?\s+/);
    if (match) {
      map[match[1]] = error;
      if (match[2]) map[match[2]] = error;
    }
  }
  return map;
}
