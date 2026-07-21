"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleBand } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { motion, useReducedMotion } from "motion/react";
import { useMotionNumber } from "./use-motion-number";

export interface ScaleDistributionDatum {
  value: number;
  count: number;
}

interface ScaleDistributionInnerProps {
  data: ScaleDistributionDatum[];
  width: number;
  height: number;
  average: number | null;
  minLabel?: string;
  maxLabel?: string;
  variant: "compact" | "immersive";
}

const MARGIN = { top: 16, right: 16, bottom: 40, left: 16 };
const IMMERSIVE_MARGIN = { top: 36, right: 24, bottom: 58, left: 24 };
const BAR_COLOR = "#7C3AED";
const BAR_COLOR_HIGHLIGHT = "#1D4ED8";
const IMMERSIVE_LABEL_COLOR = "var(--presentation-fg, #111827)";
const IMMERSIVE_BAR_COLOR = "var(--presentation-accent, #7C3AED)";

function ScaleDistributionInner({
  data,
  width,
  height,
  average,
  minLabel,
  maxLabel,
  variant,
}: ScaleDistributionInnerProps) {
  const margin = variant === "immersive" ? IMMERSIVE_MARGIN : MARGIN;
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const xScale = scaleBand<number>({
    domain: data.map((d) => d.value),
    range: [0, innerWidth],
    padding: 0.2,
  });

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const yScale = scaleLinear<number>({
    domain: [0, maxCount],
    range: [innerHeight, 0],
  });

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group top={margin.top} left={margin.left}>
          {data.map((d) => {
            const barX = xScale(d.value) ?? 0;
            const barWidth = xScale.bandwidth();
            const barY = yScale(d.count);
            const barHeight = innerHeight - barY;
            const isAvg = d.count === maxCount;

            return (
              <AnimatedScaleBar
                key={d.value}
                count={d.count}
                value={d.value}
                barX={barX}
                barWidth={barWidth}
                barY={barY}
                barHeight={barHeight}
                innerHeight={innerHeight}
                isAvg={isAvg}
                variant={variant}
              />
            );
          })}

          {/* Min/max labels */}
          {minLabel && (
            <text
              x={0}
              y={innerHeight + (variant === "immersive" ? 48 : 32)}
              fontSize={variant === "immersive" ? 15 : 10}
              fill={variant === "immersive" ? IMMERSIVE_LABEL_COLOR : "#9CA3AF"}
              fontWeight={variant === "immersive" ? 700 : 400}
            >
              {minLabel}
            </text>
          )}
          {maxLabel && (
            <text
              x={innerWidth}
              y={innerHeight + (variant === "immersive" ? 48 : 32)}
              textAnchor="end"
              fontSize={variant === "immersive" ? 15 : 10}
              fill={variant === "immersive" ? IMMERSIVE_LABEL_COLOR : "#9CA3AF"}
              fontWeight={variant === "immersive" ? 700 : 400}
            >
              {maxLabel}
            </text>
          )}
        </Group>
      </svg>

      {average !== null && <AverageLabel average={average} variant={variant} />}
    </div>
  );
}

interface AnimatedScaleBarProps {
  count: number;
  value: number;
  barX: number;
  barWidth: number;
  barY: number;
  barHeight: number;
  innerHeight: number;
  isAvg: boolean;
  variant: "compact" | "immersive";
}

function AnimatedScaleBar({
  count,
  value,
  barX,
  barWidth,
  barY,
  barHeight,
  innerHeight,
  isAvg,
  variant,
}: AnimatedScaleBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const animatedCount = useMotionNumber(count, 650, 0);
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.65, ease: "easeOut" as const };

  return (
    <Group>
      <motion.rect
        x={barX}
        initial={{ y: innerHeight, height: 0, opacity: 0.85 }}
        animate={{ y: barY, height: barHeight, opacity: 1 }}
        transition={transition}
        width={barWidth}
        fill={
          variant === "immersive"
            ? IMMERSIVE_BAR_COLOR
            : isAvg
              ? BAR_COLOR_HIGHLIGHT
              : BAR_COLOR
        }
        fillOpacity={isAvg ? 1 : 0.7}
        rx={variant === "immersive" ? 8 : 3}
      />
      <text
        x={barX + barWidth / 2}
        y={innerHeight + (variant === "immersive" ? 26 : 16)}
        textAnchor="middle"
        fontSize={variant === "immersive" ? 20 : 11}
        fontWeight={variant === "immersive" ? 800 : 400}
        fill={variant === "immersive" ? IMMERSIVE_LABEL_COLOR : "#6B7280"}
        className="select-none"
      >
        {value}
      </text>
      {animatedCount > 0.2 && (
        <motion.text
          x={barX + barWidth / 2}
          initial={{ y: innerHeight - (variant === "immersive" ? 10 : 4) }}
          animate={{ y: barY - (variant === "immersive" ? 10 : 4) }}
          transition={transition}
          textAnchor="middle"
          fontSize={variant === "immersive" ? 18 : 10}
          fontWeight={variant === "immersive" ? 800 : 400}
          fill={variant === "immersive" ? IMMERSIVE_LABEL_COLOR : "#374151"}
          className="select-none"
        >
          {Math.round(animatedCount)}
        </motion.text>
      )}
    </Group>
  );
}

function AverageLabel({
  average,
  variant,
}: {
  average: number;
  variant: "compact" | "immersive";
}) {
  const animatedAverage = useMotionNumber(average);

  return (
    <p
      className={
        variant === "immersive"
          ? "mt-2 text-center text-xl font-black"
          : "mt-1 text-center text-xs text-gray-500"
      }
      style={variant === "immersive" ? { color: "var(--presentation-fg, #111827)" } : undefined}
    >
      Promedio:{" "}
      <span className="font-semibold text-secondary">
        {animatedAverage.toFixed(1)}
      </span>
    </p>
  );
}

interface ScaleDistributionChartProps {
  data: ScaleDistributionDatum[];
  average: number | null;
  height?: number;
  minLabel?: string;
  maxLabel?: string;
  variant?: "compact" | "immersive";
}

export function ScaleDistributionChart({
  data,
  average,
  height = 180,
  minLabel,
  maxLabel,
  variant = "compact",
}: ScaleDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ParentSize>
        {({ width }) => (
          <ScaleDistributionInner
            data={data}
            width={width || (variant === "immersive" ? 1100 : 320)}
            height={height}
            average={average}
            minLabel={minLabel}
            maxLabel={maxLabel}
            variant={variant}
          />
        )}
      </ParentSize>
    </div>
  );
}
