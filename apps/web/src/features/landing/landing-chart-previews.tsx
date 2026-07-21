"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BarChart, ScaleDistributionChart, WordCloudChart } from "@/components/charts";
import { Reveal } from "./reveal";

const BAR_COLORS = ["#7C3AED", "#1D4ED8", "#06B6D4", "#F43F5E"];

const BAR_BASE = [
  { label: "React", value: 42 },
  { label: "Vue", value: 28 },
  { label: "Svelte", value: 19 },
  { label: "Angular", value: 11 },
];

const WORDS = [
  { text: "interactivo", count: 38 },
  { text: "rápido", count: 30 },
  { text: "claro", count: 26 },
  { text: "dinámico", count: 22 },
  { text: "simple", count: 18 },
  { text: "visual", count: 15 },
  { text: "en vivo", count: 12 },
  { text: "útil", count: 9 },
];

const SCALE_BASE = [
  { value: 1, count: 2 },
  { value: 2, count: 5 },
  { value: 3, count: 11 },
  { value: 4, count: 18 },
  { value: 5, count: 9 },
];

function jitter(value: number, spread: number, min: number) {
  return Math.max(min, Math.round(value + (Math.random() - 0.5) * spread));
}

export function LandingChartPreviews() {
  const prefersReducedMotion = useReducedMotion();
  const [bars, setBars] = useState(BAR_BASE);
  const [scale, setScale] = useState(SCALE_BASE);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setBars((prev) => prev.map((b) => ({ ...b, value: jitter(b.value, 10, 4) })));
      setScale((prev) => prev.map((s) => ({ ...s, count: jitter(s.count, 6, 1) })));
    }, 2600);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  const total = bars.reduce((sum, b) => sum + b.value, 0) || 1;
  const barData = bars.map((b, i) => ({
    label: b.label,
    value: b.value,
    percentage: (b.value / total) * 100,
    color: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const scaleTotal = scale.reduce((sum, s) => sum + s.count, 0) || 1;
  const scaleAvg =
    scale.reduce((sum, s) => sum + s.value * s.count, 0) / scaleTotal;

  return (
    <section
      id="visualizacion"
      className="relative flex min-h-screen snap-section items-center overflow-hidden bg-surface-subtle px-6 py-24"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="blob right-[-6rem] top-1/4 h-72 w-72 bg-brand-purple-200" />
        <div
          className="blob bottom-[-4rem] left-[-4rem] h-72 w-72 bg-brand-blue-200"
          style={{ animationDelay: "-5s" }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Resultados en vivo
          </p>
          <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">
            Visualízalo todo en tiempo real
          </h2>
          <p className="text-lg leading-relaxed text-gray-600">
            Los mismos gráficos que verás en sesión — barras, nubes de palabras y
            escalas — animados a medida que llegan las respuestas.
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal delay={0} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-brand-sm transition-shadow duration-200 hover:shadow-brand-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-gray-900">
                Opción múltiple
              </h3>
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
                Barras
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              ¿Qué framework prefieres?
            </p>
            <BarChart
              data={barData}
              height={188}
              margin={{ top: 6, right: 44, bottom: 6, left: 84 }}
            />
          </Reveal>

          <Reveal delay={0.1} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-brand-sm transition-shadow duration-200 hover:shadow-brand-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-gray-900">
                Nube de palabras
              </h3>
              <span className="rounded-full bg-secondary-light px-2 py-0.5 text-xs font-bold text-secondary">
                Word cloud
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              ¿Cómo describes Qaskly?
            </p>
            <WordCloudChart words={WORDS} height={200} />
          </Reveal>

          <Reveal delay={0.2} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-brand-sm transition-shadow duration-200 hover:shadow-brand-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-gray-900">
                Escala
              </h3>
              <span className="rounded-full bg-accent-cyan/15 px-2 py-0.5 text-xs font-bold text-accent-cyan">
                Distribución
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              ¿Qué tan probable es que lo recomiendes?
            </p>
            <ScaleDistributionChart
              data={scale}
              average={scaleAvg}
              height={200}
              minLabel="Nada"
              maxLabel="Mucho"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
