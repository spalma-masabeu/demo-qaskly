"use client";

import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { scaleLinear, scaleBand } from "@visx/scale";
import { Tooltip, useTooltip } from "@visx/tooltip";
import { ParentSize } from "@visx/responsive";
import { motion, useReducedMotion } from "motion/react";
import { useMotionNumber } from "./use-motion-number";

export interface BarChartDatum {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface BarChartInnerProps {
  data: BarChartDatum[];
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  color?: string;
  variant: "compact" | "immersive";
}

const DEFAULT_MARGIN = { top: 8, right: 16, bottom: 8, left: 160 };
const DEFAULT_COLOR = "#7C3AED";

function BarChartInner({
  data,
  width,
  height,
  margin = DEFAULT_MARGIN,
  color = DEFAULT_COLOR,
  variant,
}: BarChartInnerProps) {
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<BarChartDatum>();

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const yScale = scaleBand<string>({
    domain: data.map((d) => d.label),
    range: [0, innerHeight],
    padding: variant === "immersive" ? 0.18 : 0.35,
  });

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const xScale = scaleLinear<number>({
    domain: [0, maxValue],
    range: [0, innerWidth],
  });

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group top={margin.top} left={margin.left}>
          {data.map((d) => {
            const barHeight = yScale.bandwidth();
            const barY = yScale(d.label) ?? 0;
            const barWidth = xScale(d.value);

            return (
              <AnimatedBarRow
                key={d.label}
                datum={d}
                barHeight={barHeight}
                barY={barY}
                barWidth={barWidth}
                color={d.color ?? color}
                innerWidth={innerWidth}
                marginLeft={margin.left}
                marginTop={margin.top}
                variant={variant}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
              />
            );
          })}
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <Tooltip top={tooltipTop} left={tooltipLeft}>
          <div className="text-xs">
            <span className="font-medium">{tooltipData.label}:</span>{" "}
            {tooltipData.value}
            {tooltipData.percentage !== undefined &&
              ` (${Math.round(tooltipData.percentage)}%)`}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

interface AnimatedBarRowProps {
  datum: BarChartDatum;
  barHeight: number;
  barY: number;
  barWidth: number;
  color: string;
  innerWidth: number;
  marginLeft: number;
  marginTop: number;
  variant: "compact" | "immersive";
  onShowTooltip: (args: {
    tooltipData: BarChartDatum;
    tooltipLeft: number;
    tooltipTop: number;
  }) => void;
  onHideTooltip: () => void;
}

function AnimatedBarRow({
  datum,
  barHeight,
  barY,
  barWidth,
  color,
  innerWidth,
  marginLeft,
  marginTop,
  variant,
  onShowTooltip,
  onHideTooltip,
}: AnimatedBarRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const animatedPercentage = useMotionNumber(datum.percentage ?? 0, 650, 0);
  const labelColor =
    variant === "immersive" ? "var(--presentation-fg, #111827)" : "#4B5563";
  const trackColor =
    variant === "immersive"
      ? "color-mix(in srgb, var(--presentation-fg, #111827) 16%, transparent)"
      : "#F3F4F6";
  const valueColor =
    variant === "immersive" ? "var(--presentation-fg, #111827)" : "#6B7280";
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.65, ease: "easeOut" as const };

  return (
    <Group>
      <text
        x={-8}
        y={barY + barHeight / 2}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={variant === "immersive" ? 17 : 12}
        fontWeight={variant === "immersive" ? 700 : 400}
        fill={labelColor}
        className="select-none"
      >
        {datum.label.length > (variant === "immersive" ? 24 : 20)
          ? datum.label.slice(0, variant === "immersive" ? 22 : 18) + "..."
          : datum.label}
      </text>

      <Bar
        x={0}
        y={barY}
        width={innerWidth}
        height={barHeight}
        fill={trackColor}
        rx={variant === "immersive" ? 8 : 4}
      />

      {barWidth > 0 && (
        <motion.rect
          x={0}
          y={barY}
          initial={{ width: 0 }}
          animate={{ width: barWidth }}
          transition={transition}
          height={barHeight}
          fill={variant === "immersive" ? "var(--presentation-accent, #7C3AED)" : color}
          rx={variant === "immersive" ? 8 : 4}
          onMouseEnter={() => {
            onShowTooltip({
              tooltipData: datum,
              tooltipLeft: marginLeft + barWidth,
              tooltipTop: marginTop + barY,
            });
          }}
          onMouseLeave={onHideTooltip}
          className="cursor-pointer hover:opacity-80"
        />
      )}

      {datum.percentage !== undefined && (
        <motion.text
          initial={{
            x: variant === "immersive" ? 14 : 6,
          }}
          animate={{
            x: Math.min(
              barWidth + (variant === "immersive" ? 10 : 6),
              innerWidth + 10
            ),
          }}
          transition={transition}
          y={barY + barHeight / 2}
          dominantBaseline="middle"
          fontSize={variant === "immersive" ? 17 : 11}
          fontWeight={variant === "immersive" ? 800 : 400}
          fill={valueColor}
          className="select-none"
        >
          {Math.round(animatedPercentage)}%
        </motion.text>
      )}
    </Group>
  );
}

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
  color?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  variant?: "compact" | "immersive";
}

export function BarChart({
  data,
  height = 240,
  color,
  margin,
  variant = "compact",
}: BarChartProps) {
  const chartHeight = Math.max(
    height,
    data.length * (variant === "immersive" ? 58 : 40) + 16
  );

  return (
    <div style={{ width: "100%", height: chartHeight }}>
      <ParentSize>
        {({ width }) => (
          <BarChartInner
            data={data}
            width={width || (variant === "immersive" ? 1100 : 320)}
            height={chartHeight}
            color={color}
            margin={
              margin ??
              (variant === "immersive"
                ? { top: 10, right: 72, bottom: 10, left: 220 }
                : undefined)
            }
            variant={variant}
          />
        )}
      </ParentSize>
    </div>
  );
}
