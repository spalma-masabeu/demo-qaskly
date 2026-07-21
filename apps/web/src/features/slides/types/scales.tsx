"use client";

import { useState, type ComponentType } from "react";
import { SlideType, type ScalesResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type { ScalesConfig, ScalesResult } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ScaleDistributionChart,
  type ScaleDistributionDatum,
} from "@/components/charts/scale-distribution-chart";

function ScalesEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<ScalesConfig>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="scales-min">Valor mínimo</Label>
          <Input
            id="scales-min"
            type="number"
            value={config.min}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange({ ...config, min: v });
            }}
            disabled={disabled}
            error={errors?.["min"]}
            aria-label="Valor mínimo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="scales-max">Valor máximo</Label>
          <Input
            id="scales-max"
            type="number"
            value={config.max}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange({ ...config, max: v });
            }}
            disabled={disabled}
            error={errors?.["max"]}
            aria-label="Valor máximo"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="scales-min-label">Etiqueta mínima</Label>
        <Input
          id="scales-min-label"
          value={config.minLabel}
          maxLength={80}
          onChange={(e) => onChange({ ...config, minLabel: e.target.value })}
          disabled={disabled}
          error={errors?.["minLabel"]}
          placeholder="p.ej. Totalmente en desacuerdo"
          aria-label="Etiqueta mínima"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="scales-max-label">Etiqueta máxima</Label>
        <Input
          id="scales-max-label"
          value={config.maxLabel}
          maxLength={80}
          onChange={(e) => onChange({ ...config, maxLabel: e.target.value })}
          disabled={disabled}
          error={errors?.["maxLabel"]}
          placeholder="p.ej. Totalmente de acuerdo"
          aria-label="Etiqueta máxima"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="scales-step">
          Paso <span className="font-normal text-gray-400">(opcional)</span>
        </Label>
        <Input
          id="scales-step"
          type="number"
          min={0.1}
          step={0.1}
          value={config.step ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...config, step: val === "" ? undefined : Number(val) });
          }}
          disabled={disabled}
          error={errors?.["step"]}
          placeholder="p.ej. 1"
          aria-label="Paso de escala"
        />
      </div>
    </div>
  );
}

function ScalesPreview({ slide }: PreviewProps) {
  const config = slide.config as ScalesConfig;
  const steps = Math.min(config.max - config.min + 1, 10);
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">{slide.prompt || "Sin pregunta"}</p>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-gray-500">{config.minLabel || config.min}</span>
        <div className="flex flex-1 justify-between gap-1">
          {Array.from({ length: steps }).map((_, i) => (
            <div
              key={i}
              className="h-8 flex-1 rounded-lg border border-gray-200"
            />
          ))}
        </div>
        <span className="shrink-0 text-sm text-gray-500">{config.maxLabel || config.max}</span>
      </div>
    </div>
  );
}

function ScalesParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<ScalesConfig>) {
  const [selected, setSelected] = useState<number | null>(null);

  const step = config.step ?? 1;
  const values: number[] = [];
  for (let v = config.min; v <= config.max; v += step) {
    values.push(Math.round(v * 100) / 100);
  }
  const cappedValues = values.slice(0, 20);

  function handleSubmit() {
    if (selected === null) return;
    const response: ScalesResponse = { value: selected };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{config.minLabel || config.min}</span>
          <span>{config.maxLabel || config.max}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={slide.prompt}>
          {cappedValues.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelected(v)}
              disabled={disabled}
              aria-label={`Valor ${v}`}
              aria-pressed={selected === v}
              className={[
                "flex h-12 w-12 items-center justify-center rounded-xl border text-base font-semibold transition-colors",
                selected === v
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary-light",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              ].join(" ")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading || selected === null}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar valor
      </Button>
    </div>
  );
}

function ScalesResultDisplay({ slide, result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const scResult = result as ScalesResult;
  const scConfig = slide.config as ScalesConfig;
  const data: ScaleDistributionDatum[] = scResult.distribution.map((d) => ({
    value: d.value,
    count: d.count,
  }));

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-2"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {scResult.totalResponses} respuesta{scResult.totalResponses !== 1 ? "s" : ""}
          {scResult.average !== null && (
            <> · Promedio: <strong>{scResult.average.toFixed(1)}</strong></>
          )}
        </p>
      )}
      <ScaleDistributionChart
        data={data}
        average={scResult.average}
        height={isImmersive ? 330 : 160}
        minLabel={scConfig.minLabel}
        maxLabel={scConfig.maxLabel}
        variant={variant}
      />
    </div>
  );
}

registerSlideComponents(SlideType.Scales, {
  EditorForm: ScalesEditorForm as ComponentType<EditorFormProps>,
  Preview: ScalesPreview,
  ParticipantForm: ScalesParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: ScalesResultDisplay,
});

export {
  ScalesEditorForm,
  ScalesPreview,
  ScalesParticipantForm,
  ScalesResultDisplay,
};
