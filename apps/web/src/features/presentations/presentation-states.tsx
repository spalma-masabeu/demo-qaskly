"use client";

import { Presentation } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { CreatePresentationButton } from "./create-presentation-button";

export function PresentationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-brand-purple-400">
        <Presentation className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        Sin presentaciones aún
      </h3>
      <p className="mb-5 max-w-sm text-base text-gray-500">
        Crea tu primera presentación para empezar a interactuar con tu audiencia
        en vivo.
      </p>
      <div className="[&>div]:items-center">
        <CreatePresentationButton />
      </div>
    </div>
  );
}

export function PresentationsLoadingState() {
  return <LoadingState label="Cargando presentaciones…" />;
}

interface PresentationsErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function PresentationsErrorState({
  title = "No se pudieron cargar las presentaciones",
  message,
  onRetry,
}: PresentationsErrorStateProps) {
  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
    />
  );
}
