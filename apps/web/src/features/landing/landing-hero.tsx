"use client";

import { ChevronDown, Heart, PartyPopper, Radio, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

const INITIAL_OPTIONS = [
  { label: "Comunicar ideas claras", pct: 72 },
  { label: "Mantener la atención", pct: 55 },
  { label: "Medir el impacto", pct: 38 },
];

/** Live-feeling poll card: bars re-balance and the vote counter ticks up. */
function LivePollCard() {
  const prefersReducedMotion = useReducedMotion();
  const [options, setOptions] = useState(INITIAL_OPTIONS);
  const [votes, setVotes] = useState(24);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setOptions((prev) =>
        prev.map((o) => ({
          ...o,
          pct: Math.min(96, Math.max(18, o.pct + Math.round((Math.random() - 0.5) * 16))),
        })),
      );
      setVotes((v) => v + Math.ceil(Math.random() * 4));
    }, 2200);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-6 shadow-brand-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          Pregunta activa
        </p>
        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
          En vivo
        </span>
      </div>
      <h3 className="mb-5 font-heading text-lg font-bold text-gray-900">
        ¿Cuál es tu mayor desafío al presentar?
      </h3>
      <ul className="space-y-3">
        {options.map(({ label, pct }) => (
          <li key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-700">{label}</span>
              <span className="font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
              <motion.div
                className="h-2.5 rounded-full bg-brand-gradient"
                animate={{ width: `${pct}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: "easeOut" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-center justify-between text-xs text-gray-400">
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-gray-100 px-2 font-semibold text-gray-600">
          Sala QSKLY7
        </span>
        <span>{votes} respuestas en vivo</span>
      </p>
    </div>
  );
}

const FLOATERS = [
  { Icon: Heart, className: "right-2 top-14 text-accent-rose", delay: 0 },
  { Icon: ThumbsUp, className: "-left-4 top-24 text-secondary", delay: 1.2 },
  { Icon: PartyPopper, className: "-right-5 bottom-16 text-accent-amber", delay: 0.6 },
];

export function LandingHero() {
  return (
    <section className="relative flex min-h-screen snap-section items-center overflow-hidden px-6 pb-16 pt-24">
      {/* Animated mesh-blob backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="blob left-[-6rem] top-[-4rem] h-80 w-80 bg-brand-purple-300" />
        <div
          className="blob right-[-5rem] top-10 h-96 w-96 bg-brand-blue-300"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="blob bottom-[-6rem] left-1/3 h-80 w-80 bg-accent-cyan/40"
          style={{ animationDelay: "-3s" }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-60" />
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col items-center gap-14 lg:flex-row lg:gap-16">
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Presentaciones interactivas en vivo
            </p>
            <h1 className="mb-5 font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 sm:text-6xl">
              Haz que tu{" "}
              <span className="text-aurora-gradient">audiencia participe</span>,
              no solo escuche
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0">
              Crea preguntas en vivo, encuestas y nubes de palabras. Tu público
              responde desde el celular — tú ves los resultados al instante.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link
                href={ROUTES.LOGIN}
                className="group inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-brand-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:w-auto"
              >
                Comenzar gratis
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white/80 px-8 text-base font-semibold text-gray-700 backdrop-blur transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:w-auto"
              >
                Ver demo
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Sin tarjeta · El público entra sin cuenta · Resultados en tiempo real
            </p>
          </motion.div>

          <motion.div
            className="relative w-full flex-shrink-0 sm:w-96"
            initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="animate-float-slow">
              <LivePollCard />
            </div>
            {FLOATERS.map(({ Icon, className, delay }, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                className={`absolute flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-brand-lg ${className}`}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
              >
                <Icon className="h-5 w-5" />
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <a
        href="#visualizacion"
        aria-label="Ir a la siguiente sección"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 cursor-pointer text-primary/60 transition-colors hover:text-primary lg:block"
      >
        <ChevronDown className="h-7 w-7 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}
