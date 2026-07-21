"use client";

import { useState, type ComponentType } from "react";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Bar, Line } from "@visx/shape";
import { motion, useReducedMotion } from "motion/react";
import { SlideType, type TwoByTwoResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type { TwoByTwoConfig, TwoByTwoResult } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function TwoByTwoEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<TwoByTwoConfig>) {
  function updateNumber(field: keyof TwoByTwoConfig, value: string) {
    const parsed = Number(value);
    if (!isNaN(parsed)) onChange({ ...config, [field]: parsed });
  }

  function updateText(field: keyof TwoByTwoConfig, value: string) {
    onChange({ ...config, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="two-x-min">X mínimo</Label>
          <Input
            id="two-x-min"
            type="number"
            value={config.xMin}
            onChange={(e) => updateNumber("xMin", e.target.value)}
            disabled={disabled}
            error={errors?.["xMin"]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="two-x-max">X máximo</Label>
          <Input
            id="two-x-max"
            type="number"
            value={config.xMax}
            onChange={(e) => updateNumber("xMax", e.target.value)}
            disabled={disabled}
            error={errors?.["xMax"]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="two-y-min">Y mínimo</Label>
          <Input
            id="two-y-min"
            type="number"
            value={config.yMin}
            onChange={(e) => updateNumber("yMin", e.target.value)}
            disabled={disabled}
            error={errors?.["yMin"]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="two-y-max">Y máximo</Label>
          <Input
            id="two-y-max"
            type="number"
            value={config.yMax}
            onChange={(e) => updateNumber("yMax", e.target.value)}
            disabled={disabled}
            error={errors?.["yMax"]}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Etiquetas</Label>
        <Input
          value={config.xMinLabel}
          onChange={(e) => updateText("xMinLabel", e.target.value)}
          disabled={disabled}
          error={errors?.["xMinLabel"]}
          placeholder="Etiqueta X mínima"
          aria-label="Etiqueta X mínima"
        />
        <Input
          value={config.xMaxLabel}
          onChange={(e) => updateText("xMaxLabel", e.target.value)}
          disabled={disabled}
          error={errors?.["xMaxLabel"]}
          placeholder="Etiqueta X máxima"
          aria-label="Etiqueta X máxima"
        />
        <Input
          value={config.yMinLabel}
          onChange={(e) => updateText("yMinLabel", e.target.value)}
          disabled={disabled}
          error={errors?.["yMinLabel"]}
          placeholder="Etiqueta Y mínima"
          aria-label="Etiqueta Y mínima"
        />
        <Input
          value={config.yMaxLabel}
          onChange={(e) => updateText("yMaxLabel", e.target.value)}
          disabled={disabled}
          error={errors?.["yMaxLabel"]}
          placeholder="Etiqueta Y máxima"
          aria-label="Etiqueta Y máxima"
        />
      </div>
    </div>
  );
}

function TwoByTwoPreview({ slide }: PreviewProps) {
  const config = slide.config as TwoByTwoConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">
        {slide.prompt || "Sin pregunta"}
      </p>
      <MatrixFrame config={config} points={[]} compact />
    </div>
  );
}

function TwoByTwoParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<TwoByTwoConfig>) {
  const [x, setX] = useState((config.xMin + config.xMax) / 2);
  const [y, setY] = useState((config.yMin + config.yMax) / 2);

  function handleSubmit() {
    const response: TwoByTwoResponse = { x, y };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-5">
      <MatrixFrame config={config} points={[{ x, y }]} compact />
      <div className="space-y-4">
        <AxisSlider
          label={slide.prompt}
          min={config.xMin}
          max={config.xMax}
          value={x}
          minLabel={config.xMinLabel}
          maxLabel={config.xMaxLabel}
          disabled={disabled}
          onChange={setX}
        />
        <AxisSlider
          label="Eje Y"
          min={config.yMin}
          max={config.yMax}
          value={y}
          minLabel={config.yMinLabel}
          maxLabel={config.yMaxLabel}
          disabled={disabled}
          onChange={setY}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar posición
      </Button>
    </div>
  );
}

function AxisSlider({
  label,
  min,
  max,
  value,
  minLabel,
  maxLabel,
  disabled,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  minLabel: string;
  maxLabel: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{minLabel}</span>
        <strong className="text-gray-800">{Math.round(value * 100) / 100}</strong>
        <span>{maxLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={label}
        className="w-full accent-primary"
      />
    </div>
  );
}

function TwoByTwoResultDisplay({ slide, result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const config = slide.config as TwoByTwoConfig;
  const twoResult = result as TwoByTwoResult;

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-2"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {twoResult.totalResponses} punto
          {twoResult.totalResponses !== 1 ? "s" : ""}
          {twoResult.averageX !== null && twoResult.averageY !== null && (
            <>
              {" "}
              · Promedio:{" "}
              <strong>
                ({twoResult.averageX.toFixed(1)}, {twoResult.averageY.toFixed(1)})
              </strong>
            </>
          )}
        </p>
      )}
      <MatrixFrame
        config={config}
        points={twoResult.points}
        average={
          twoResult.averageX === null || twoResult.averageY === null
            ? undefined
            : { x: twoResult.averageX, y: twoResult.averageY }
        }
        compact={!isImmersive}
      />
    </div>
  );
}

function MatrixFrame({
  config,
  points,
  average,
  compact,
}: {
  config: TwoByTwoConfig;
  points: Array<{ x: number; y: number }>;
  average?: { x: number; y: number };
  compact?: boolean;
}) {
  const width = 720;
  const height = compact ? 380 : 300;
  const gridLeft = compact ? 124 : 156;
  const gridRight = compact ? 42 : 44;
  const gridTop = compact ? 70 : 46;
  const gridBottom = compact ? 78 : 52;
  const innerWidth = width - gridLeft - gridRight;
  const innerHeight = height - gridTop - gridBottom;
  const prefersReducedMotion = useReducedMotion();
  const pointRadius = compact ? 7 : 9;
  const averageRadius = compact ? 10 : 12;
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: "easeOut" as const };
  const xScale =
    config.xMax === config.xMin
      ? () => gridLeft + innerWidth / 2
      : scaleLinear<number>({
          domain: [config.xMin, config.xMax],
          range: [gridLeft, gridLeft + innerWidth],
        });
  const yScale =
    config.yMax === config.yMin
      ? () => gridTop + innerHeight / 2
      : scaleLinear<number>({
          domain: [config.yMin, config.yMax],
          range: [gridTop + innerHeight, gridTop],
        });

  return (
    <div
      className={
        compact
          ? "w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
          : "flex h-full w-full items-center justify-center overflow-hidden"
      }
      style={compact ? undefined : { maxHeight: "min(100%, 48vh, 300px)" }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={compact ? "block h-auto w-full" : "block h-full w-auto max-w-full"}
      >
        <Group>
          <Bar
            x={gridLeft}
            y={gridTop}
            width={innerWidth}
            height={innerHeight}
            fill={compact ? "#F8FAFC" : "color-mix(in srgb, var(--presentation-fg, #ffffff) 8%, transparent)"}
          />
          <Line
            x1={gridLeft + innerWidth / 2}
            y1={gridTop}
            x2={gridLeft + innerWidth / 2}
            y2={gridTop + innerHeight}
            stroke={compact ? "#CBD5E1" : "color-mix(in srgb, var(--presentation-fg, #ffffff) 28%, transparent)"}
            strokeWidth="2"
          />
          <Line
            x1={gridLeft}
            y1={gridTop + innerHeight / 2}
            x2={gridLeft + innerWidth}
            y2={gridTop + innerHeight / 2}
            stroke={compact ? "#CBD5E1" : "color-mix(in srgb, var(--presentation-fg, #ffffff) 28%, transparent)"}
            strokeWidth="2"
          />
          <Bar
            x={gridLeft}
            y={gridTop}
            width={innerWidth}
            height={innerHeight}
            fill="none"
            stroke={compact ? "#94A3B8" : "color-mix(in srgb, var(--presentation-fg, #ffffff) 62%, transparent)"}
            strokeWidth="2"
          />
        </Group>
        <text
          x={gridLeft}
          y={height - 24}
          fontSize={compact ? "14" : "16"}
          fontWeight="800"
          fill={compact ? "#64748B" : "var(--presentation-fg, #111827)"}
        >
          {config.xMinLabel}
        </text>
        <text
          x={width - gridRight}
          y={height - 24}
          textAnchor="end"
          fontSize={compact ? "14" : "16"}
          fontWeight="800"
          fill={compact ? "#64748B" : "var(--presentation-fg, #111827)"}
        >
          {config.xMaxLabel}
        </text>
        <text
          x={gridLeft - 16}
          y={compact ? gridTop - 28 : gridTop + 18}
          textAnchor="end"
          fontSize={compact ? "14" : "16"}
          fontWeight="800"
          fill={compact ? "#64748B" : "var(--presentation-fg, #111827)"}
        >
          {config.yMaxLabel}
        </text>
        <text
          x={gridLeft - 16}
          y={gridTop + innerHeight - 8}
          textAnchor="end"
          fontSize={compact ? "14" : "16"}
          fontWeight="800"
          fill={compact ? "#64748B" : "var(--presentation-fg, #111827)"}
        >
          {config.yMinLabel}
        </text>
        {points.map((point, index) => (
          <motion.circle
            key={`${point.x}-${point.y}-${index}`}
            cx={xScale(point.x)}
            cy={yScale(point.y)}
            initial={prefersReducedMotion ? false : { r: 0, opacity: 0 }}
            animate={{ r: pointRadius, opacity: 0.75 }}
            transition={
              prefersReducedMotion
                ? transition
                : { ...transition, delay: Math.min(index * 0.035, 0.25) }
            }
            fill={compact ? "#7C3AED" : "var(--presentation-accent, #7C3AED)"}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        ))}
        {average && (
          <motion.circle
            initial={prefersReducedMotion ? false : { r: 0, opacity: 0 }}
            animate={{
              cx: xScale(average.x),
              cy: yScale(average.y),
              r: averageRadius,
              opacity: 1,
            }}
            transition={transition}
            fill="#16A34A"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        )}
      </svg>
    </div>
  );
}

registerSlideComponents(SlideType.TwoByTwo, {
  EditorForm: TwoByTwoEditorForm as ComponentType<EditorFormProps>,
  Preview: TwoByTwoPreview,
  ParticipantForm: TwoByTwoParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: TwoByTwoResultDisplay,
});

export {
  TwoByTwoEditorForm,
  TwoByTwoPreview,
  TwoByTwoParticipantForm,
  TwoByTwoResultDisplay,
};
