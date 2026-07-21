"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { updatePresentationThemeAction } from "@/features/presentations/presentations-actions";
import {
  getPresentationTheme,
  PRESENTATION_THEME_OPTIONS,
} from "./presentation-theme";

interface ThemeActionProps {
  presentationId: string;
  currentThemeKey: string;
  isEditable: boolean;
}

export function ThemeAction({
  presentationId,
  currentThemeKey,
  isEditable,
}: ThemeActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedThemeKey, setSelectedThemeKey] = useState(
    getPresentationTheme(currentThemeKey).key
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveTheme() {
    setError(null);
    startTransition(async () => {
      const result = await updatePresentationThemeAction(
        presentationId,
        selectedThemeKey
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!isEditable}
        aria-label="Cambiar tema"
        title={isEditable ? "Cambiar tema" : "Tema bloqueado en modo solo lectura"}
        className="gap-1.5"
        onClick={() => {
          setSelectedThemeKey(getPresentationTheme(currentThemeKey).key);
          setError(null);
          setOpen(true);
        }}
      >
        <Palette className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Tema</span>
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Elegir tema"
        size="md"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESENTATION_THEME_OPTIONS.map((theme) => {
            const selected = selectedThemeKey === theme.key;
            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => setSelectedThemeKey(theme.key)}
                disabled={isPending}
                aria-pressed={selected}
                className={[
                  "flex min-h-28 cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-200 hover:border-gray-300",
                  isPending ? "cursor-not-allowed opacity-70" : "",
                ].join(" ")}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold text-gray-900">
                    {theme.label}
                  </span>
                  {selected && (
                    <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                  )}
                </span>
                <span className="flex gap-2" aria-hidden="true">
                  <span
                    className="h-8 flex-1 rounded border border-gray-200"
                    style={{ backgroundColor: theme.background }}
                  />
                  <span
                    className="h-8 flex-1 rounded border border-gray-200"
                    style={{ backgroundColor: theme.foreground }}
                  />
                  <span
                    className="h-8 flex-1 rounded border border-gray-200"
                    style={{ backgroundColor: theme.accent }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={saveTheme} loading={isPending}>
            Guardar tema
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
