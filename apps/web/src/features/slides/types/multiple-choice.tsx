"use client";

import { useId, useState, type ComponentType } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SlideType, type MultipleChoiceResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type { MultipleChoiceConfig, ChoiceOption, MultipleChoiceResult } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, type BarChartDatum } from "@/components/charts/bar-chart";

function MultipleChoiceEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<MultipleChoiceConfig>) {
  const baseId = useId();

  function updateOption(index: number, label: string) {
    const next = config.options.map((opt, i) =>
      i === index ? { ...opt, label } : opt
    );
    onChange({ ...config, options: next });
  }

  function addOption() {
    if (config.options.length >= 7) return;
    const next: ChoiceOption[] = [
      ...config.options,
      { id: crypto.randomUUID(), label: "" },
    ];
    onChange({ ...config, options: next });
  }

  function removeOption(index: number) {
    if (config.options.length <= 3) return;
    const next = config.options.filter((_, i) => i !== index);
    onChange({ ...config, options: next });
  }

  function toggleAllowMultiple() {
    onChange({ ...config, allowMultiple: !config.allowMultiple });
  }

  const optionError = errors?.["options"];

  return (
    <div className="space-y-4">
      <div>
        <Label>Opciones</Label>
        <p className="mb-2 text-sm text-gray-500">Mínimo 3, máximo 7.</p>
        <div className="space-y-2">
          {config.options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm text-gray-400">
                {i + 1}
              </span>
              <Input
                value={opt.label}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Opción ${i + 1}`}
                disabled={disabled}
                aria-label={`Opción ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={disabled || config.options.length <= 3}
                aria-label={`Eliminar opción ${i + 1}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-surface-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {optionError && (
          <p className="mt-1 text-sm text-danger" role="alert">
            {optionError}
          </p>
        )}
        {config.options.length < 7 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOption}
            disabled={disabled}
            className="mt-2 gap-1.5"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar opción
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          id={`${baseId}-allow-multiple`}
          type="checkbox"
          checked={config.allowMultiple}
          onChange={toggleAllowMultiple}
          disabled={disabled}
          className="h-5 w-5 rounded border-gray-300 accent-primary"
        />
        <Label htmlFor={`${baseId}-allow-multiple`} className="cursor-pointer">
          Permitir múltiples respuestas
        </Label>
      </div>
    </div>
  );
}

function MultipleChoicePreview({ slide }: PreviewProps) {
  const config = slide.config as MultipleChoiceConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">{slide.prompt || "Sin pregunta"}</p>
      <ul className="space-y-2">
        {config.options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-lg border border-gray-200 px-3.5 py-2.5 text-base text-gray-700"
          >
            {opt.label || <span className="text-gray-400 italic">Opción vacía</span>}
          </li>
        ))}
      </ul>
      {config.allowMultiple && (
        <p className="text-sm text-gray-400">Selección múltiple habilitada</p>
      )}
    </div>
  );
}

function MultipleChoiceParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<MultipleChoiceConfig>) {
  const baseId = useId();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (config.allowMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelected([id]);
    }
  }

  function handleSubmit() {
    if (selected.length === 0) return;
    const response: MultipleChoiceResponse = { selectedOptionIds: selected };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" role="group" aria-label={slide.prompt}>
        {config.options.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              htmlFor={`${baseId}-${opt.id}`}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                checked
                  ? "border-primary bg-primary-light"
                  : "border-gray-200 bg-white hover:border-primary-light hover:bg-surface-muted",
                disabled ? "cursor-not-allowed opacity-50" : "",
              ].join(" ")}
            >
              <input
                id={`${baseId}-${opt.id}`}
                type={config.allowMultiple ? "checkbox" : "radio"}
                name={`${baseId}-choice`}
                checked={checked}
                onChange={() => toggle(opt.id)}
                disabled={disabled}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-base font-medium text-gray-800">{opt.label}</span>
            </label>
          );
        })}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading || selected.length === 0}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar respuesta
      </Button>
    </div>
  );
}

function MultipleChoiceResultDisplay({ result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const mcResult = result as MultipleChoiceResult;
  const data: BarChartDatum[] = mcResult.options.map((opt) => ({
    label: opt.label,
    value: opt.percentage,
    percentage: opt.percentage,
  }));

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-2"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {mcResult.totalResponses} respuesta{mcResult.totalResponses !== 1 ? "s" : ""}
        </p>
      )}
      <BarChart
        data={data}
        height={isImmersive ? Math.max(320, data.length * 58 + 16) : Math.max(180, data.length * 44 + 16)}
        variant={variant}
      />
    </div>
  );
}

registerSlideComponents(SlideType.MultipleChoice, {
  EditorForm: MultipleChoiceEditorForm as ComponentType<EditorFormProps>,
  Preview: MultipleChoicePreview,
  ParticipantForm: MultipleChoiceParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: MultipleChoiceResultDisplay,
});

export {
  MultipleChoiceEditorForm,
  MultipleChoicePreview,
  MultipleChoiceParticipantForm,
  MultipleChoiceResultDisplay,
};
