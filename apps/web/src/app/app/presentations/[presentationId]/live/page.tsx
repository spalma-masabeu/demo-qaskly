import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApiAccessToken } from "@/lib/auth/access-token";
import { getPresentationDetail } from "@/lib/api/presentations";
import { isApiError } from "@/lib/api/types";
import { PresentationHeader } from "@/features/presentation-shell/presentation-header";
import { PresenterLiveController } from "@/features/live/presenter-live-controller";

export const metadata: Metadata = {
  title: "Presentar en vivo",
  description: "Controla tu sesión en vivo y revisa respuestas en tiempo real.",
};

interface LivePageProps {
  params: Promise<{ presentationId: string }>;
}

export default async function LivePage({ params }: LivePageProps) {
  const { presentationId } = await params;

  let presentation;
  let token: string;
  try {
    token = await getApiAccessToken();
    presentation = await getPresentationDetail(presentationId, token);
  } catch (err) {
    if (isApiError(err)) notFound();
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PresentationHeader
        presentationId={presentationId}
        title={presentation.title}
        isEditable={!presentation.hasLiveSessions}
      />
      <main className="flex-1">
        <PresenterLiveController presentation={presentation} socketToken={token} />
      </main>
    </div>
  );
}
