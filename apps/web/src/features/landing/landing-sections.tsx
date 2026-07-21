"use client";

import { BarChart2, ChevronDown, Layers, Share2, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import { Reveal } from "./reveal";

const steps = [
  {
    number: "01",
    accent: "text-primary",
    ring: "ring-primary/20 bg-primary-light",
    title: "Crea tu presentación",
    description:
      "Agrega slides de opción múltiple, respuesta abierta, word cloud, escalas, ranking y más en minutos.",
  },
  {
    number: "02",
    accent: "text-secondary",
    ring: "ring-secondary/20 bg-secondary-light",
    title: "Comparte el código de sala",
    description:
      "Tu audiencia entra desde cualquier celular o computador, sin instalar nada ni crear cuenta.",
  },
  {
    number: "03",
    accent: "text-accent-cyan",
    ring: "ring-accent-cyan/20 bg-accent-cyan/10",
    title: "Ve los resultados en vivo",
    description:
      "Las respuestas llegan en tiempo real con gráficos. Revisa el historial de sesiones cuando quieras.",
  },
];

const features = [
  {
    Icon: Layers,
    tile: "bg-primary-light text-primary",
    title: "7 tipos de slides",
    description:
      "Opción múltiple, respuesta abierta, word cloud, escalas, ranking, 2×2 y adivina el número.",
  },
  {
    Icon: Zap,
    tile: "bg-accent-amber/15 text-accent-amber",
    title: "Sin fricción para el público",
    description:
      "Código de sala o QR. Sin app, sin cuenta, sin contraseña — solo participar.",
  },
  {
    Icon: BarChart2,
    tile: "bg-secondary-light text-secondary",
    title: "Gráficos al instante",
    description:
      "Barras, nubes de palabras y distribuciones se actualizan en tiempo real a medida que llegan respuestas.",
  },
  {
    Icon: Share2,
    tile: "bg-accent-cyan/15 text-accent-cyan",
    title: "Historial completo",
    description:
      "Cada sesión queda guardada. Compara resultados entre presentaciones y analiza el engagement.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "¿Necesita cuenta el público?",
    a: "No. Los participantes entran solo con el código de sala, sin registro ni contraseña.",
  },
  {
    q: "¿Cómo inicio sesión?",
    a: "Qaskly usa un código de un solo uso enviado a tu email, sin contraseña que recordar.",
  },
  {
    q: "¿Puedo reutilizar una presentación?",
    a: "Sí. Lanza la misma presentación en múltiples sesiones y revisa el historial de cada una por separado.",
  },
  {
    q: "¿Cuántos participantes soporta una sesión?",
    a: "Las sesiones están diseñadas para grupos medianos. No hay un límite duro en el MVP actual.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-200 hover:border-primary/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-base font-semibold text-gray-900">{q}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-primary transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingSections() {
  return (
    <>
      {/* How it works */}
      <section
        id="como-funciona"
        className="flex min-h-screen snap-section items-center bg-surface px-6 py-24"
      >
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Cómo funciona
            </p>
            <h2 className="font-heading text-4xl font-bold text-gray-900">
              De cero a sesión en vivo en minutos
            </h2>
          </Reveal>
          <ol className="relative grid gap-10 sm:grid-cols-3">
            {/* Connecting line on desktop */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-7 -z-10 hidden h-px bg-gradient-to-r from-primary/30 via-secondary/30 to-accent-cyan/30 sm:block"
            />
            {steps.map(({ number, title, description, accent, ring }, i) => (
              <Reveal as="li" key={number} delay={i * 0.12} className="relative flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl font-heading text-xl font-extrabold ring-4 ${ring} ${accent}`}
                >
                  {number}
                </span>
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {description}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="relative flex min-h-screen snap-section items-center overflow-hidden bg-surface-muted px-6 py-24">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dot-grid opacity-70" />
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Funcionalidades
            </p>
            <h2 className="font-heading text-4xl font-bold text-gray-900">
              Todo lo que necesitas para presentar mejor
            </h2>
          </Reveal>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ Icon, title, description, tile }, i) => (
              <Reveal
                as="li"
                key={title}
                delay={i * 0.1}
                className="group h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-brand-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-brand-lg"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${tile}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-heading text-base font-bold text-gray-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {description}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative flex min-h-screen snap-section items-center overflow-hidden bg-aurora-gradient px-6 py-24 text-center">
        <div aria-hidden="true" className="absolute inset-0 -z-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:26px_26px]" />
        <Reveal className="relative mx-auto max-w-2xl">
          <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
            <Zap className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mb-4 font-heading text-4xl font-bold text-white sm:text-5xl">
            Listo para tu primera sesión
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/85">
            Crea tu cuenta gratis y lanza tu primera presentación interactiva hoy.
          </p>
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex h-12 cursor-pointer items-center rounded-xl bg-white px-8 text-base font-bold text-primary shadow-brand-lg transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Comenzar gratis
          </Link>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="flex min-h-screen snap-section items-center bg-surface px-6 py-24">
        <div className="mx-auto w-full max-w-2xl">
          <Reveal className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-bold text-gray-900">
              Preguntas frecuentes
            </h2>
          </Reveal>
          <div className="space-y-4">
            {faqs.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.08}>
                <FaqItem q={item.q} a={item.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
