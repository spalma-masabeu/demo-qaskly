"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { SlideType, type RankingResponse } from "@qaskly/shared";
import {
  registerSlideComponents,
  type EditorFormProps,
  type PreviewProps,
  type ParticipantFormProps,
  type ResultDisplayProps,
} from "@/features/slides/slide-registry";
import type {
  ChoiceOption,
  RankingConfig,
  RankingResult,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function RankingEditorForm({
  config,
  onChange,
  disabled,
  errors,
}: EditorFormProps<RankingConfig>) {
  function updateItem(index: number, label: string) {
    onChange({
      ...config,
      items: config.items.map((item, i) =>
        i === index ? { ...item, label } : item
      ),
    });
  }

  function addItem() {
    if (config.items.length >= 6) return;
    const next: ChoiceOption[] = [
      ...config.items,
      { id: crypto.randomUUID(), label: "" },
    ];
    onChange({ ...config, items: next });
  }

  function removeItem(index: number) {
    if (config.items.length <= 3) return;
    onChange({
      ...config,
      items: config.items.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Elementos a ordenar</Label>
        <p className="mb-2 text-sm text-gray-500">Mínimo 3, máximo 6.</p>
        <div className="space-y-2">
          {config.items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm text-gray-400">
                {i + 1}
              </span>
              <Input
                value={item.label}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Elemento ${i + 1}`}
                disabled={disabled}
                aria-label={`Elemento ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={disabled || config.items.length <= 3}
                aria-label={`Eliminar elemento ${i + 1}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-surface-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        {errors?.["items"] && (
          <p className="mt-1 text-sm text-danger" role="alert">
            {errors.items}
          </p>
        )}
        {config.items.length < 6 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addItem}
            disabled={disabled}
            className="mt-2 gap-1.5"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Agregar elemento
          </Button>
        )}
      </div>
    </div>
  );
}

function RankingPreview({ slide }: PreviewProps) {
  const config = slide.config as RankingConfig;
  return (
    <div className="space-y-3 p-4">
      <p className="text-base font-medium text-gray-900">
        {slide.prompt || "Sin pregunta"}
      </p>
      <ol className="space-y-2">
        {config.items.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-3.5 py-2.5 text-base text-gray-700"
          >
            <span className="w-6 shrink-0 text-center text-base text-gray-500">
              {index + 1}
            </span>
            {item.label || (
              <span className="italic text-gray-400">Elemento vacío</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RankingParticipantForm({
  slide,
  config,
  onSubmit,
  loading,
  disabled,
}: ParticipantFormProps<RankingConfig>) {
  const [ordered, setOrdered] = useState<ChoiceOption[]>(config.items);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
  }

  function handleSubmit() {
    const response: RankingResponse = {
      orderedItemIds: ordered.map((item) => item.id),
    };
    onSubmit(response);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2" role="list" aria-label={slide.prompt}>
        {ordered.map((item, index) => (
          <div
            key={item.id}
            role="listitem"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-base font-medium text-gray-800">
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={disabled || index === 0}
              aria-label={`Subir ${item.label}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={disabled || index === ordered.length - 1}
              aria-label={`Bajar ${item.label}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={disabled || loading}
        loading={loading}
        size="lg"
        className="w-full"
      >
        Enviar ranking
      </Button>
    </div>
  );
}

function RankingResultDisplay({ result, variant = "compact" }: ResultDisplayProps) {
  const isImmersive = variant === "immersive";
  const rankingResult = result as RankingResult;
  const previousOrderRef = useRef<string[]>([]);
  const itemCount = Math.max(rankingResult.items.length, 1);
  const maxScore = Math.max(rankingResult.totalResponses * itemCount, 1);
  const orderedItems = [...rankingResult.items].sort((a, b) => {
    const aScore = weightedRankingScore(a.rankCounts, itemCount);
    const bScore = weightedRankingScore(b.rankCounts, itemCount);
    if (aScore !== bScore) return bScore - aScore;
    if (a.averageRank === null && b.averageRank === null) return 0;
    if (a.averageRank === null) return 1;
    if (b.averageRank === null) return -1;
    return a.averageRank - b.averageRank;
  });
  const previousOrder = previousOrderRef.current;

  useEffect(() => {
    previousOrderRef.current = orderedItems.map((item) => item.id);
  }, [orderedItems]);

  return (
    <div className={isImmersive ? "w-full" : "flex flex-col gap-3"}>
      {!isImmersive && (
        <p className="text-sm text-gray-500">
          Total: {rankingResult.totalResponses} ranking
          {rankingResult.totalResponses !== 1 ? "s" : ""}
        </p>
      )}
      <ol
        className={
          isImmersive
            ? "mx-auto grid w-full max-w-[88rem] gap-4"
            : "space-y-3"
        }
      >
        {orderedItems.map((item, index) => {
          const previousIndex = previousOrder.indexOf(item.id);
          const rankDelta = previousIndex === -1 ? 0 : previousIndex - index;
          const score = weightedRankingScore(item.rankCounts, itemCount);
          const scoreScale = scaleLinear<number>({
            domain: [0, maxScore],
            range: [0, 100],
          });
          const barWidth = Math.round(scoreScale(score));

          return (
            <motion.li
              key={item.id}
              layout="position"
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 42,
                mass: 0.75,
              }}
              style={{
                zIndex: rankDelta > 0 ? 20 : rankDelta < 0 ? 0 : 5,
              }}
              className={[
                "relative grid gap-3 rounded-xl border bg-white",
                isImmersive
                  ? "grid-cols-[4.5rem_minmax(0,1fr)] items-center border-slate-200 px-6 py-4"
                  : "grid-cols-[3rem_minmax(0,1fr)] border-gray-200 px-4 py-3",
                isImmersive && rankDelta > 0
                  ? "shadow-2xl ring-2 ring-amber-200"
                  : "shadow-sm",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center rounded-full font-black",
                  isImmersive
                    ? "h-16 w-16 text-2xl"
                    : "h-10 w-10 text-lg",
                  index === 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-primary-light text-primary",
                ].join(" ")}
              >
                {index + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={[
                    "truncate font-bold text-gray-900",
                    isImmersive ? "text-3xl" : "text-base",
                  ].join(" ")}
                >
                  {item.label}
                </p>
                <svg
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                  className="mt-3 block h-4 w-full overflow-hidden rounded-full bg-gray-100"
                  aria-hidden="true"
                >
                  <Bar
                    x={0}
                    y={0}
                    width={barWidth}
                    height={12}
                    rx={6}
                    fill="var(--color-primary, #2563eb)"
                  />
                </svg>
                <p
                  className={[
                    "mt-1 text-gray-500",
                    isImmersive ? "text-base" : "text-xs",
                  ].join(" ")}
                >
                  Puntaje: {score}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function weightedRankingScore(
  rankCounts: RankingResult["items"][number]["rankCounts"],
  itemCount: number
): number {
  return rankCounts.reduce((sum, bucket) => {
    const weight = itemCount - bucket.rank + 1;
    return sum + bucket.count * weight;
  }, 0);
}

registerSlideComponents(SlideType.Ranking, {
  EditorForm: RankingEditorForm as ComponentType<EditorFormProps>,
  Preview: RankingPreview,
  ParticipantForm: RankingParticipantForm as ComponentType<ParticipantFormProps>,
  ResultDisplay: RankingResultDisplay,
});

export {
  RankingEditorForm,
  RankingPreview,
  RankingParticipantForm,
  RankingResultDisplay,
};
