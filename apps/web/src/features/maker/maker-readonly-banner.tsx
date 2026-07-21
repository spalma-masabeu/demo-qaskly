"use client";

import { useState, useTransition } from "react";
import { Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicatePresentationAndOpenAction } from "@/features/presentations/presentations-actions";

interface MakerReadonlyBannerProps {
  presentationId: string;
}

export function MakerReadonlyBanner({ presentationId }: MakerReadonlyBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    startTransition(async () => {
      setError(null);
      const result = await duplicatePresentationAndOpenAction(presentationId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-base text-amber-800">
            Esta presentación ya fue publicada y es de solo lectura. Para editarla,
            duplícala y trabaja en la copia.
          </p>
          {error && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDuplicate}
        loading={isPending}
        className="shrink-0 gap-1.5"
        aria-label="Duplicar presentación para editar"
      >
        <Copy className="h-5 w-5" aria-hidden="true" />
        Duplicar y editar
      </Button>
    </div>
  );
}
