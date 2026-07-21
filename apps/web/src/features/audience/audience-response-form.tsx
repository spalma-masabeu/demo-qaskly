"use client";

import { getSlideEntry } from "@/features/slides/slide-registry";
import type { SlideViewModel } from "@/lib/api/types";

interface AudienceResponseFormProps {
  slide: SlideViewModel;
  onSubmit: (response: unknown) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AudienceResponseForm({
  slide,
  onSubmit,
  loading,
  disabled,
}: AudienceResponseFormProps) {
  const entry = getSlideEntry(slide.type);
  const ParticipantForm = entry.ParticipantForm;

  if (!ParticipantForm || !entry.isSupportedInFirstSlice) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">
          Este tipo de pregunta no está disponible aún.
        </p>
      </div>
    );
  }

  return (
    <ParticipantForm
      slide={slide}
      config={slide.config}
      onSubmit={onSubmit}
      loading={loading}
      disabled={loading}
    />
  );
}
