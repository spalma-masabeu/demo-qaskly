"use client";

import { useMemo } from "react";
import { Wordcloud } from "@visx/wordcloud";
import { scaleLinear } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface WordCloudDatum {
  text: string;
  count: number;
}

interface WordCloudInnerProps {
  words: WordCloudDatum[];
  width: number;
  height: number;
  variant: "compact" | "immersive";
}

const COLORS = [
  "var(--presentation-fg, #111827)",
  "var(--presentation-accent, #2563EB)",
  "color-mix(in srgb, var(--presentation-fg, #111827) 82%, var(--presentation-accent, #2563EB) 18%)",
  "color-mix(in srgb, var(--presentation-accent, #2563EB) 78%, var(--presentation-fg, #111827) 22%)",
  "color-mix(in srgb, var(--presentation-fg, #111827) 72%, var(--presentation-bg, #ffffff) 28%)",
];

function WordCloudInner({ words, width, height, variant }: WordCloudInnerProps) {
  const counts = words.map((w) => w.count);
  const maxCount = Math.max(...counts, 1);
  const minCount = Math.max(Math.min(...counts), 1);

  const fontSizeScale = scaleLinear<number>({
    domain: [minCount, maxCount],
    range: variant === "immersive" ? [22, 84] : [14, 48],
  });
  const random = useMemo(
    () => createSeededRandom(words.map((word) => word.text).join("|")),
    [words]
  );

  return (
    <svg width={width} height={height}>
      <Wordcloud
        words={words}
        width={width}
        height={height}
        fontSize={(datum) => fontSizeScale(datum.count)}
        font="Inter, system-ui, sans-serif"
        padding={variant === "immersive" ? 5 : 3}
        spiral="archimedean"
        rotate={0}
        random={random}
      >
        {(cloudWords) =>
          (
            <AnimatePresence initial={false}>
              {cloudWords.map((w, i) => (
                <AnimatedWord
                  key={w.text}
                  text={w.text ?? ""}
                  x={w.x ?? 0}
                  y={w.y ?? 0}
                  size={w.size ?? 16}
                  font={w.font}
                  color={COLORS[i % COLORS.length]}
                  weight={variant === "immersive" ? 800 : 400}
                  index={i}
                />
              ))}
            </AnimatePresence>
          )
        }
      </Wordcloud>
    </svg>
  );
}

interface AnimatedWordProps {
  text: string;
  x: number;
  y: number;
  size: number;
  font?: string;
  color: string;
  weight: number;
  index: number;
}

function AnimatedWord({
  text,
  x,
  y,
  size,
  font,
  color,
  weight,
  index,
}: AnimatedWordProps) {
  const prefersReducedMotion = useReducedMotion();
  const enterX = Math.cos(index * 1.7) * 80;
  const enterY = Math.sin(index * 1.7) * 56;
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.72, ease: "easeOut" as const };

  return (
    <motion.g
      initial={
        prefersReducedMotion
          ? false
          : { opacity: 0, x: x + enterX, y: y + enterY, scale: 0.74 }
      }
      animate={{ opacity: 1, x, y, scale: 1 }}
      exit={{ opacity: 0, scale: 0.72 }}
      transition={transition}
    >
      <motion.text
        initial={prefersReducedMotion ? false : { fontSize: size * 0.8 }}
        animate={{ fontSize: size }}
        transition={transition}
        fontFamily={font}
        fontWeight={weight}
        textAnchor="middle"
        fill={color}
        className="select-none"
      >
        {text}
      </motion.text>
    </motion.g>
  );
}

function createSeededRandom(seedText: string) {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
}

interface WordCloudChartProps {
  words: WordCloudDatum[];
  height?: number;
  variant?: "compact" | "immersive";
}

export function WordCloudChart({
  words,
  height = 300,
  variant = "compact",
}: WordCloudChartProps) {
  if (words.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ParentSize>
        {({ width }) => (
          <WordCloudInner
            words={words}
            width={width || (variant === "immersive" ? 1100 : 320)}
            height={height}
            variant={variant}
          />
        )}
      </ParentSize>
    </div>
  );
}
