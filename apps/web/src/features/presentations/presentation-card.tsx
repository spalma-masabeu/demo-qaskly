"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Trash2, Presentation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { type PresentationSummary } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";

interface PresentationCardProps {
  presentation: PresentationSummary;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function PresentationCard({
  presentation,
  onDelete,
  onDuplicate,
}: PresentationCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const makerHref = ROUTES.APP.MAKER(presentation.id);

  return (
    <>
      <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-brand">
        <Link
          href={makerHref}
          className="block aspect-video w-full bg-gradient-to-br from-brand-purple-100 to-brand-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={`Abrir ${presentation.title}`}
        >
          <div className="flex h-full items-center justify-center text-brand-purple-300">
            <Presentation className="h-12 w-12" aria-hidden="true" />
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={makerHref}
              className="line-clamp-2 flex-1 text-base font-semibold text-gray-900 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {presentation.title}
            </Link>

            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconButton
                aria-label="Duplicar presentación"
                size="sm"
                variant="ghost"
                onClick={() => onDuplicate(presentation.id)}
              >
                <Copy className="h-5 w-5" aria-hidden="true" />
              </IconButton>
              <IconButton
                aria-label="Eliminar presentación"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            {presentation.slideCount}{" "}
            {presentation.slideCount === 1 ? "diapositiva" : "diapositivas"}
          </p>

          {presentation.hasLiveSessions && (
            <p className="text-sm text-brand-purple-600">
              Solo lectura · duplica para editar
            </p>
          )}
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          presentation.hasLiveSessions
            ? "Eliminar presentación con historial"
            : "Eliminar presentación"
        }
        size="sm"
      >
        <div className="space-y-3 text-base text-gray-600">
          <p>
            ¿Eliminar{" "}
            <span className="font-semibold text-gray-900">
              {presentation.title}
            </span>
            ?
          </p>
          {presentation.hasLiveSessions ? (
            <p>
              También se eliminarán sus sesiones, participantes, respuestas y
              resultados históricos. Esta acción no se puede deshacer.
            </p>
          ) : (
            <p>Esta acción no se puede deshacer.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              onDelete(presentation.id);
            }}
          >
            {presentation.hasLiveSessions ? "Eliminar todo" : "Eliminar"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
