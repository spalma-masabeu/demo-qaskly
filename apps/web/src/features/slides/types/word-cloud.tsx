"use client";

import { useState, type ComponentType } from "react";
import { SlideType, type WordCloudResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type { WordCloudConfig, WordCloudResult } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WordCloudChart, type WordCloudDatum } from "@/components/charts/word-cloud-chart";

function WordCloudEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<WordCloudConfig>) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="word-cloud-input-count">Palabras por participante</Label>
        <p className="text-sm text-gray-500">Entre 1 y 3.</p>
        <Input
          id="word-cloud-input-count"
          type="number"
          min={1}
          max={3}
          value={config.inputCount}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange({ ...config, inputCount: v });
          }}
          disabled={disabled}
          error={errors?.["inputCount"]}
          aria-label="Palabras por participante"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="word-cloud-max-word-length">
          Longitud máxima de palabra
        </Label>
        <p className="text-sm text-gray-500">Entre 1 y 40 caracteres.</p>
        <Input
          id="word-cloud-max-word-length"
          type="number"
          min={1}
          max={40}
          value={config.maxWordLength}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange({ ...config, maxWordLength: v });
          }}
          disabled={disabled}
          error={errors?.["maxWordLength"]}
          aria-label="Longitud máxima de palabra"
        />
      </div>
    </div>
  );
}

function WordCloudPreview({ slide }: PreviewProps) {
  const config = slide.config as WordCloudConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">{slide.prompt || "Sin pregunta"}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="rounded-lg border border-gray-200 px-3.5 py-2.5 text-base text-gray-700"
          >
            palabra
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        {config.inputCount} palabra{config.inputCount > 1 ? "s" : ""} por participante · máx. {config.maxWordLength} caracteres
      </p>
    </div>
  );
}

function WordCloudParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<WordCloudConfig>) {
  const [words, setWords] = useState<string[]>(
    Array.from({ length: config.inputCount }, () => "")
  );

  function updateWord(index: number, value: string) {
    setWords((prev) => prev.map((w, i) => (i === index ? value : w)));
  }

  function handleSubmit() {
    const trimmed = words.map((w) => w.trim()).filter(Boolean);
    if (trimmed.length === 0) return;
    const response: WordCloudResponse = { words: trimmed };
    onSubmit(response);
  }

  const hasAny = words.some((w) => w.trim().length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {words.map((word, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-sm text-gray-400">
              {i + 1}
            </span>
            <Input
              value={word}
              onChange={(e) => updateWord(i, e.target.value)}
              maxLength={config.maxWordLength}
              disabled={disabled}
              placeholder={`Palabra ${i + 1}`}
              aria-label={`Palabra ${i + 1} para ${slide.prompt}`}
            />
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        Máx. {config.maxWordLength} caracteres por palabra
      </p>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading || !hasAny}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar palabras
      </Button>
    </div>
  );
}

function WordCloudResultDisplay({ result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const wcResult = result as WordCloudResult;
  const words: WordCloudDatum[] = wcResult.words.map((w) => ({
    text: w.text,
    count: w.count,
  }));

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-2"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          {wcResult.totalWords} palabra{wcResult.totalWords !== 1 ? "s" : ""} recibidas
        </p>
      )}
      <WordCloudChart
        words={words}
        height={isImmersive ? 340 : 220}
        variant={variant}
      />
    </div>
  );
}

registerSlideComponents(SlideType.WordCloud, {
  EditorForm: WordCloudEditorForm as ComponentType<EditorFormProps>,
  Preview: WordCloudPreview,
  ParticipantForm: WordCloudParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: WordCloudResultDisplay,
});

export {
  WordCloudEditorForm,
  WordCloudPreview,
  WordCloudParticipantForm,
  WordCloudResultDisplay,
};
