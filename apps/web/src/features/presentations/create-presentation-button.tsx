"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPresentationAction } from "./presentations-actions";

export function CreatePresentationButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Ingresa un nombre para la presentación.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createPresentationAction(trimmed);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={() => setOpen(true)} loading={isPending}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        Nueva presentación
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Dialog
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Nueva presentación"
        size="sm"
      >
        <div className="space-y-2">
          <label
            htmlFor="new-presentation-title"
            className="text-base font-medium text-gray-700"
          >
            Nombre
          </label>
          <Input
            id="new-presentation-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            autoFocus
            placeholder="Ej. Encuesta de cierre"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreate();
            }}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreate} loading={isPending}>
            Crear
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
