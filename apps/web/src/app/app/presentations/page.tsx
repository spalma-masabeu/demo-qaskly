import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout";
import { getApiAccessToken } from "@/lib/auth/access-token";
import { listPresentations } from "@/lib/api/presentations";
import { isApiError } from "@/lib/api/types";
import {
  PROTECTED_VIEW_CACHE_TAGS,
  protectedViewFetchOptions,
} from "@/lib/cache/protected-view-cache";
import { PresentationsGrid } from "@/features/presentations/presentations-grid";
import { PresentationsErrorState } from "@/features/presentations/presentation-states";
import { CreatePresentationButton } from "@/features/presentations/create-presentation-button";

export const metadata: Metadata = {
  title: "Presentaciones",
  description: "Gestiona tus presentaciones interactivas.",
};

export default async function PresentacionesPage() {
  let initialData;
  let loadError: string | null = null;

  try {
    const token = await getApiAccessToken();
    initialData = await listPresentations(
      1,
      token,
      protectedViewFetchOptions(PROTECTED_VIEW_CACHE_TAGS.presentationsList)
    );
  } catch (err) {
    loadError = isApiError(err)
      ? err.message
      : "No se pudieron cargar las presentaciones.";
  }

  return (
    <PageContainer>
      <PageHeader
        title="Presentaciones"
        description="Crea y gestiona tus presentaciones interactivas."
        actions={<CreatePresentationButton />}
      />

      {loadError || !initialData ? (
        <PresentationsErrorState message={loadError ?? "Error desconocido."} />
      ) : (
        <PresentationsGrid initialData={initialData} />
      )}
    </PageContainer>
  );
}
