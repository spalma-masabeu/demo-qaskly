"use client";

import { type ReactNode, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Play, BarChart2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { updatePresentationTitleAction } from "@/features/presentations/presentations-actions";

interface PresentationHeaderProps {
  presentationId: string;
  title: string;
  isEditable: boolean;
  backHref?: string;
  backLabel?: string;
  themeAction?: ReactNode;
}

export function PresentationHeader({
  presentationId,
  title,
  backHref = ROUTES.APP.PRESENTATIONS,
  backLabel = "Volver a presentaciones",
  themeAction,
}: PresentationHeaderProps) {
  const [currentTitle, setCurrentTitle] = useState(title);
  const [draftTitle, setDraftTitle] = useState(title);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditor() {
    setDraftTitle(currentTitle);
    setError(null);
    setEditing(true);
  }

  function saveTitle() {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setError("Ingresa un título.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePresentationTitleAction(
        presentationId,
        trimmed
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.title) {
        setCurrentTitle(result.title);
        setEditing(false);
      }
    });
  }

  return (
    <header className="sticky top-0 z-dropdown flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-surface-muted hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ArrowLeft className="h-6 w-6" aria-hidden="true" />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-1">
        <h1 className="truncate text-base font-semibold text-gray-900">
          {currentTitle}
        </h1>
        <IconButton
          aria-label="Editar título"
          size="sm"
          variant="ghost"
          onClick={openEditor}
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        {themeAction}

        <Link href={ROUTES.APP.RESULTS(presentationId)}>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Ver resultados"
            className="gap-1.5"
          >
            <BarChart2 className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Resultados</span>
          </Button>
        </Link>

        <Link href={ROUTES.APP.LIVE(presentationId)}>
          <Button
            variant="primary"
            size="sm"
            aria-label="Presentar"
            className="gap-1.5"
          >
            <Play className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Presentar</span>
          </Button>
        </Link>
      </div>
      <Dialog
        open={editing}
        onClose={() => {
          if (!isPending) setEditing(false);
        }}
        title="Editar título"
        size="sm"
      >
        <div className="space-y-2">
          <label
            htmlFor="presentation-title"
            className="text-base font-medium text-gray-700"
          >
            Título
          </label>
          <Input
            id="presentation-title"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            maxLength={160}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") saveTitle();
            }}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={saveTitle} loading={isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </Dialog>
    </header>
  );
}
