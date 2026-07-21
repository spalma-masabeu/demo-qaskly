"use client";

import { useState, type ComponentType } from "react";
import { SlideType, type OpenEndedResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type { OpenEndedConfig, OpenEndedResult } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ResponseList } from "@/components/charts/response-list";

function OpenEndedEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<OpenEndedConfig>) {
  const error = errors?.["maxLength"];
  return (
    <div className="space-y-2">
      <Label htmlFor="open-ended-max-length">
        Longitud máxima de respuesta
      </Label>
      <p className="text-sm text-gray-500">Entre 1 y 1000 caracteres.</p>
      <Input
        id="open-ended-max-length"
        type="number"
        min={1}
        max={1000}
        value={config.maxLength}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange({ ...config, maxLength: v });
        }}
        disabled={disabled}
        error={error}
        aria-label="Longitud máxima"
      />
    </div>
  );
}

function OpenEndedPreview({ slide }: PreviewProps) {
  const config = slide.config as OpenEndedConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">{slide.prompt || "Sin pregunta"}</p>
      <div className="rounded-lg border border-gray-200 px-3.5 py-2.5 text-base text-gray-700">
        Respuesta libre…
      </div>
      <p className="text-sm text-gray-400">Máx. {config.maxLength} caracteres</p>
    </div>
  );
}

function OpenEndedParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<OpenEndedConfig>) {
  const [text, setText] = useState("");
  const remaining = config.maxLength - text.length;

  function handleSubmit() {
    if (!text.trim()) return;
    const response: OpenEndedResponse = { text: text.trim() };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={config.maxLength}
        disabled={disabled}
        rows={4}
        placeholder="Escribe tu respuesta aquí…"
        aria-label={slide.prompt}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-800 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${remaining < 20 ? "text-warning" : "text-gray-400"}`}
        >
          {remaining} caracteres restantes
        </span>
        <Button
          onClick={handleSubmit}
          disabled={disabled || loading || !text.trim()}
          loading={loading}
          size="md"
        >
          Enviar
        </Button>
      </div>
    </div>
  );
}

function OpenEndedResultDisplay({ result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const oeResult = result as OpenEndedResult;
  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-2"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {oeResult.totalResponses} respuesta{oeResult.totalResponses !== 1 ? "s" : ""}
        </p>
      )}
      <ResponseList
        responses={oeResult.responses}
        variant={variant}
        maxVisible={isImmersive ? 9 : 20}
      />
    </div>
  );
}

registerSlideComponents(SlideType.OpenEnded, {
  EditorForm: OpenEndedEditorForm as ComponentType<EditorFormProps>,
  Preview: OpenEndedPreview,
  ParticipantForm: OpenEndedParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: OpenEndedResultDisplay,
});

export {
  OpenEndedEditorForm,
  OpenEndedPreview,
  OpenEndedParticipantForm,
  OpenEndedResultDisplay,
};
