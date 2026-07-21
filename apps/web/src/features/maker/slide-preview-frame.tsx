import type { SlideViewModel } from "@/lib/api/types";
import { getSlideEntry, UnsupportedSlide } from "@/features/slides/slide-registry";
import {
  getPresentationTheme,
  getPresentationThemeVars,
} from "@/features/presentation-shell/presentation-theme";

interface SlidePreviewFrameProps {
  slide: SlideViewModel | null;
  themeKey: string;
}

export function SlidePreviewFrame({ slide, themeKey }: SlidePreviewFrameProps) {
  const theme = getPresentationTheme(themeKey);
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center p-4"
      style={{
        ...getPresentationThemeVars(themeKey),
        backgroundColor: "color-mix(in srgb, var(--presentation-bg) 86%, #000 14%)",
      }}
    >
      <div
        className="relative w-full max-w-xl rounded-xl border p-1 shadow-sm"
        style={{
          backgroundColor: "var(--presentation-bg)",
          color: "var(--presentation-fg)",
          borderColor: "color-mix(in srgb, var(--presentation-accent) 34%, transparent)",
        }}
      >
        {/* Read-only overlay label */}
        <div
          className="absolute right-2 top-2 z-10 rounded-md px-2.5 py-1 text-sm font-medium"
          style={{
            backgroundColor: "color-mix(in srgb, var(--presentation-accent) 16%, var(--presentation-bg))",
            color: "var(--presentation-fg)",
          }}
        >
          {theme.label}
        </div>

        {/* Inert overlay to prevent any interaction with preview content */}
        <div className="pointer-events-none select-none [&_*]:border-current/20 [&_div]:text-[var(--presentation-fg)] [&_h1]:text-[var(--presentation-fg)] [&_li]:text-[var(--presentation-fg)] [&_p]:text-[var(--presentation-fg)] [&_span]:text-[var(--presentation-fg)] [&_strong]:text-[var(--presentation-fg)]">
          {slide ? (
            <SlidePreviewContent slide={slide} />
          ) : (
            <EmptyPreview />
          )}
        </div>
      </div>
    </div>
  );
}

function SlidePreviewContent({ slide }: { slide: SlideViewModel }) {
  const entry = getSlideEntry(slide.type);
  const Preview = entry.Preview;

  if (!Preview) {
    return <UnsupportedSlide slide={slide} />;
  }

  return <Preview slide={slide} />;
}

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-base text-gray-400">
        Selecciona una diapositiva para ver la vista previa.
      </p>
    </div>
  );
}
