import type { Metadata } from "next";
import { LandingChartPreviews } from "@/features/landing/landing-chart-previews";
import { LandingHeader } from "@/features/landing/landing-header";
import { LandingHero } from "@/features/landing/landing-hero";
import { LandingSections } from "@/features/landing/landing-sections";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Crea presentaciones interactivas y recibe respuestas en vivo.",
};

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main className="bg-surface-subtle">
        <LandingHero />
        <LandingChartPreviews />
        <LandingSections />
      </main>
    </>
  );
}
