"use client";

import { useState, type ComponentType } from "react";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Line } from "@visx/shape";
import { motion, useReducedMotion } from "motion/react";
import { useMotionNumber } from "@/components/charts/use-motion-number";
import { SlideType, type GuessTheNumberResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type {
  GuessTheNumberConfig,
  GuessTheNumberResult,
} from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function GuessTheNumberEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<GuessTheNumberConfig>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="guess-min">Mínimo</Label>
          <Input
            id="guess-min"
            type="number"
            value={config.min}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value)) onChange({ ...config, min: value });
            }}
            disabled={disabled}
            error={errors?.["min"]}
            aria-label="Valor mínimo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="guess-max">Máximo</Label>
          <Input
            id="guess-max"
            type="number"
            value={config.max}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value)) onChange({ ...config, max: value });
            }}
            disabled={disabled}
            error={errors?.["max"]}
            aria-label="Valor máximo"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="guess-correct">
          Respuesta correcta{" "}
          <span className="font-normal text-gray-400">(opcional)</span>
        </Label>
        <Input
          id="guess-correct"
          type="number"
          value={config.correctValue ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange({
              ...config,
              correctValue: raw === "" ? undefined : Number(raw),
            });
          }}
          disabled={disabled}
          error={errors?.["correctValue"]}
          aria-label="Respuesta correcta"
        />
      </div>
    </div>
  );
}

function GuessTheNumberPreview({ slide }: PreviewProps) {
  const config = slide.config as GuessTheNumberConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">
        {slide.prompt || "Sin pregunta"}
      </p>
      <div className="rounded-lg border border-gray-200 px-3.5 py-2.5 text-base text-gray-700">
        Número entre {config.min} y {config.max}
      </div>
      {config.correctValue !== undefined && (
        <p className="text-sm text-gray-400">
          Respuesta correcta configurada
        </p>
      )}
    </div>
  );
}

function GuessTheNumberParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<GuessTheNumberConfig>) {
  const [guess, setGuess] = useState("");
  const numericGuess = guess === "" ? null : Number(guess);
  const isValid =
    numericGuess !== null &&
    !isNaN(numericGuess) &&
    numericGuess >= config.min &&
    numericGuess <= config.max;

  function handleSubmit() {
    if (!isValid || numericGuess === null) return;
    const response: GuessTheNumberResponse = { guess: numericGuess };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="participant-guess">{slide.prompt}</Label>
        <Input
          id="participant-guess"
          type="number"
          min={config.min}
          max={config.max}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={disabled}
          placeholder={`${config.min} - ${config.max}`}
          aria-label={slide.prompt}
        />
        <p className="text-sm text-gray-400">
          Ingresa un número entre {config.min} y {config.max}.
        </p>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading || !isValid}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar número
      </Button>
    </div>
  );
}

function GuessTheNumberResultDisplay({
  slide,
  result,
  variant = "compact",
  phase,
}: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const guessResult = result as GuessTheNumberResult;
  const config = slide.config as GuessTheNumberConfig;
  const revealAnswer = !isImmersive || phase === "closed";

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-3"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {guessResult.totalResponses} respuesta
          {guessResult.totalResponses !== 1 ? "s" : ""}
          {guessResult.averageGuess !== null && (
            <>
              {" "}
              · Promedio: <strong>{guessResult.averageGuess.toFixed(1)}</strong>
            </>
          )}
          {revealAnswer && guessResult.correctValue !== null && (
            <>
              {" "}
              · Correcta: <strong>{guessResult.correctValue}</strong>
            </>
          )}
        </p>
      )}
      <GuessNumberPlot
        result={guessResult}
        config={config}
        variant={variant}
        revealAnswer={revealAnswer}
      />
    </div>
  );
}

function GuessNumberPlot({
  result,
  config,
  variant,
  revealAnswer,
}: {
  result: GuessTheNumberResult;
  config: GuessTheNumberConfig;
  variant: "compact" | "immersive";
  revealAnswer: boolean;
}) {
  const isImmersive = variant === "immersive";
  const prefersReducedMotion = useReducedMotion();
  const width = 720;
  const height = isImmersive ? 270 : 230;
  const paddingX = isImmersive ? 64 : 52;
  const baselineY = isImmersive ? 172 : 136;
  const maxCount = Math.max(...result.guesses.map((bucket) => bucket.count), 1);
  const xScale =
    config.max === config.min
      ? () => width / 2
      : scaleLinear<number>({
          domain: [config.min, config.max],
          range: [paddingX, width - paddingX],
        });

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: "easeOut" as const };

  const rawAvgX = result.averageGuess !== null
    ? xScale(result.averageGuess)
    : xScale((config.min + config.max) / 2);
  const animatedAvgX = useMotionNumber(rawAvgX, 500, rawAvgX);

  return (
    <div className={isImmersive ? "w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm" : "w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm"}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full">
        <Line
          x1={paddingX}
          y1={baselineY}
          x2={width - paddingX}
          y2={baselineY}
          stroke="#CBD5E1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {[config.min, config.max].map((value) => (
          <Group key={value}>
            <Line
              x1={xScale(value)}
              y1={baselineY - 12}
              x2={xScale(value)}
              y2={baselineY + 12}
              stroke="#94A3B8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x={xScale(value)}
              y={baselineY + 42}
              textAnchor="middle"
              fontSize={isImmersive ? 22 : 15}
              fontWeight="700"
              fill="#475569"
            >
              {value}
            </text>
          </Group>
        ))}
        {revealAnswer && result.correctValue !== null && (
          <Group>
            <Line
              x1={xScale(result.correctValue)}
              y1={baselineY - 78}
              x2={xScale(result.correctValue)}
              y2={baselineY + 28}
              stroke="#16A34A"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
            <text
              x={xScale(result.correctValue)}
              y={baselineY - 92}
              textAnchor="middle"
              fontSize={isImmersive ? 16 : 13}
              fontWeight="800"
              fill="#15803D"
            >
              Correcta: {result.correctValue}
            </text>
          </Group>
        )}
        {result.averageGuess !== null && (
          <Group>
            <polygon
              points={`${animatedAvgX},${baselineY + 2} ${animatedAvgX - 10},${baselineY + 24} ${animatedAvgX + 10},${baselineY + 24}`}
              fill="#2563EB"
            />
            <text
              x={animatedAvgX}
              y={baselineY + (isImmersive ? 48 : 62)}
              textAnchor="middle"
              fontSize={isImmersive ? 16 : 13}
              fontWeight="800"
              fill="#1D4ED8"
            >
              Promedio {result.averageGuess.toFixed(1)}
            </text>
          </Group>
        )}
        {result.guesses.map((bucket, i) => {
          const radius = 12 + (bucket.count / maxCount) * (isImmersive ? 22 : 20);
          const cx = xScale(bucket.value);
          const cy = baselineY - radius - 18;
          return (
            <Group key={bucket.value}>
              <motion.circle
                cx={cx}
                initial={prefersReducedMotion ? false : { r: 0, cy: baselineY - 18, opacity: 0 }}
                animate={{
                  r: bucket.count > 0 ? radius : 0,
                  cy,
                  opacity: bucket.count > 0 ? (revealAnswer && bucket.isCorrect ? 0.9 : 0.74) : 0,
                }}
                transition={{ ...transition, delay: prefersReducedMotion ? 0 : i * 0.07 }}
                fill={revealAnswer && bucket.isCorrect ? "#16A34A" : "#7C3AED"}
                stroke="#FFFFFF"
                strokeWidth={isImmersive ? "2" : "3"}
              />
              <motion.text
                x={cx}
                initial={prefersReducedMotion ? false : { y: baselineY - 12, opacity: 0 }}
                animate={{
                  y: cy + 6,
                  opacity: bucket.count > 0 ? 1 : 0,
                }}
                transition={{ ...transition, delay: prefersReducedMotion ? 0 : i * 0.07 }}
                textAnchor="middle"
                fontSize={isImmersive ? 16 : 14}
                fontWeight="900"
                fill="#FFFFFF"
              >
                {bucket.count}
              </motion.text>
              <text
                x={cx}
                y={baselineY - 6}
                textAnchor="middle"
                fontSize={isImmersive ? 14 : 12}
                fontWeight="800"
                fill="#334155"
              >
                {bucket.value}
              </text>
            </Group>
          );
        })}
      </svg>
      {!isImmersive && (
        <p className="mt-2 text-center text-sm text-gray-500">
          Cada burbuja es un número elegido; su tamaño indica cuántas respuestas recibió.
        </p>
      )}
    </div>
  );
}

registerSlideComponents(SlideType.GuessTheNumber, {
  EditorForm: GuessTheNumberEditorForm as ComponentType<EditorFormProps>,
  Preview: GuessTheNumberPreview,
  ParticipantForm: GuessTheNumberParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: GuessTheNumberResultDisplay,
});

export {
  GuessTheNumberEditorForm,
  GuessTheNumberPreview,
  GuessTheNumberParticipantForm,
  GuessTheNumberResultDisplay,
};
