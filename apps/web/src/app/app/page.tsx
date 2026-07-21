import type { Metadata } from "next";
import Link from "next/link";
import {
  AlignLeft,
  ArrowRight,
  BarChart3,
  Cloud,
  ListChecks,
  SlidersHorizontal,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth/require-user";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Panel para crear presentaciones interactivas en Qaskly.",
};

// First-slice slide types (see plan/implementation-plan.md D4). Home is an
// intentionally light handoff surface, so these are presentation-only cards.
const FEATURES = [
  {
    label: "Opción múltiple",
    description: "Vota entre varias alternativas.",
    icon: ListChecks,
    tint: "bg-brand-purple-100 text-brand-purple-700",
  },
  {
    label: "Respuesta abierta",
    description: "Recoge respuestas en texto libre.",
    icon: AlignLeft,
    tint: "bg-brand-blue-100 text-brand-blue-700",
  },
  {
    label: "Nube de palabras",
    description: "Resalta las palabras más repetidas.",
    icon: Cloud,
    tint: "bg-brand-purple-100 text-brand-purple-700",
  },
  {
    label: "Escalas",
    description: "Mide acuerdo en un rango numérico.",
    icon: SlidersHorizontal,
    tint: "bg-brand-blue-100 text-brand-blue-700",
  },
] as const;

export default async function AppHomePage() {
  const user = await requireUser();
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "presentador";

  return (
    <PageContainer>
      <PageHeader
        title={`¡Hola, ${firstName}!`}
        description="Crea presentaciones interactivas y preséntalas en vivo."
        actions={
          <Link href={ROUTES.APP.PRESENTATIONS}>
            <Button>
              Nueva presentación
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Tipos de diapositiva
          </h2>
          <Link
            href={ROUTES.APP.PRESENTATIONS}
            className="inline-flex items-center gap-1.5 text-base font-medium text-primary hover:text-primary-hover"
          >
            Ver presentaciones
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.label} className="p-5">
                <span
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    feature.tint,
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Icon className="h-7 w-7" />
                </span>
                <p className="mt-4 text-base font-semibold text-gray-900">
                  {feature.label}
                </p>
                <p className="mt-1 text-base text-gray-500">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <Card variant="elevated" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white"
              aria-hidden="true"
            >
              <BarChart3 className="h-7 w-7" />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">
                Presenta en vivo y revisa resultados
              </p>
              <p className="mt-1 text-base text-gray-500">
                Lanza una sesión, recibe respuestas en tiempo real y consulta el
                histórico cuando termines.
              </p>
            </div>
          </div>
          <Link href={ROUTES.APP.PRESENTATIONS} className="shrink-0">
            <Button variant="secondary">Ir a presentaciones</Button>
          </Link>
        </Card>
      </section>
    </PageContainer>
  );
}
