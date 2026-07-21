"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { type PaginatedPresentations } from "@/lib/api/types";
import { PresentationCard } from "./presentation-card";
import {
  PresentationsEmptyState,
  PresentationsErrorState,
} from "./presentation-states";
import {
  fetchPresentationsPageAction,
  deletePresentationAction,
  duplicatePresentationAction,
} from "./presentations-actions";

interface PresentationsGridProps {
  initialData: PaginatedPresentations;
}

interface PresentationGridError {
  title: string;
  message: string;
}

export function PresentationsGrid({ initialData }: PresentationsGridProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<PresentationGridError | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(data.total / data.pageSize);

  function loadPage(page: number) {
    startTransition(async () => {
      try {
        const next = await fetchPresentationsPageAction(page);
        setData(next);
        setError(null);
      } catch {
        setError({
          title: "No se pudieron cargar las presentaciones",
          message: "No se pudo cargar la página.",
        });
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePresentationAction(id);
      if (result.error) {
        setError({
          title: "No se pudo eliminar la presentación",
          message: result.error,
        });
        return;
      }
      try {
        const targetPage =
          data.items.length === 1 && data.page > 1 ? data.page - 1 : data.page;
        const refreshed = await fetchPresentationsPageAction(targetPage);
        setData(refreshed);
      } catch {
        setError({
          title: "No se pudieron cargar las presentaciones",
          message: "No se pudo actualizar la lista.",
        });
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicatePresentationAction(id);
      if (result.error) {
        setError({
          title: "No se pudo duplicar la presentación",
          message: result.error,
        });
        return;
      }
      try {
        const refreshed = await fetchPresentationsPageAction(data.page);
        setData(refreshed);
      } catch {
        setError({
          title: "No se pudieron cargar las presentaciones",
          message: "No se pudo actualizar la lista.",
        });
      }
    });
  }

  if (error) {
    return (
      <PresentationsErrorState
        title={error.title}
        message={error.message}
        onRetry={() => {
          setError(null);
          loadPage(data.page);
        }}
      />
    );
  }

  if (data.total === 0) {
    return <PresentationsEmptyState />;
  }

  return (
    <div className="space-y-6">
      <div
        className={[
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
          isPending ? "opacity-60 pointer-events-none" : "",
        ].join(" ")}
      >
        {data.items.map((presentation) => (
          <PresentationCard
            key={presentation.id}
            presentation={presentation}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2"
          aria-label="Paginación de presentaciones"
        >
          <IconButton
            aria-label="Página anterior"
            variant="ghost"
            onClick={() => loadPage(data.page - 1)}
            disabled={data.page <= 1 || isPending}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </IconButton>

          <span className="text-base text-gray-600">
            {data.page} / {totalPages}
          </span>

          <IconButton
            aria-label="Página siguiente"
            variant="ghost"
            onClick={() => loadPage(data.page + 1)}
            disabled={data.page >= totalPages || isPending}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </nav>
      )}
    </div>
  );
}
