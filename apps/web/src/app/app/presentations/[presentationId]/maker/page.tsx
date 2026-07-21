import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApiAccessToken } from "@/lib/auth/access-token";
import { getPresentationDetail } from "@/lib/api/presentations";
import { isApiError } from "@/lib/api/types";
import {
  PROTECTED_VIEW_CACHE_TAGS,
  protectedViewFetchOptions,
} from "@/lib/cache/protected-view-cache";
import { PresentationHeader } from "@/features/presentation-shell/presentation-header";
import { ThemeAction } from "@/features/presentation-shell/theme-action";
import { MakerView } from "@/features/maker/maker-view";

export const metadata: Metadata = {
  title: "Editor",
  description: "Edita las diapositivas de tu presentación.",
};

interface MakerPageProps {
  params: Promise<{ presentationId: string }>;
}

export default async function MakerPage({ params }: MakerPageProps) {
  const { presentationId } = await params;

  let presentation;
  try {
    const token = await getApiAccessToken();
    presentation = await getPresentationDetail(
      presentationId,
      token,
      protectedViewFetchOptions(
        PROTECTED_VIEW_CACHE_TAGS.presentationDetail(presentationId)
      )
    );
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const isEditable = !presentation.hasLiveSessions;

  return (
    <div className="flex min-h-screen flex-col">
      <PresentationHeader
        presentationId={presentationId}
        title={presentation.title}
        isEditable={isEditable}
        themeAction={
          <ThemeAction
            presentationId={presentationId}
            currentThemeKey={presentation.themeKey}
            isEditable={isEditable}
          />
        }
      />
      <main className="flex-1">
        <MakerView presentation={presentation} />
      </main>
    </div>
  );
}
