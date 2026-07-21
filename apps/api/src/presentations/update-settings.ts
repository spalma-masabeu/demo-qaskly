export interface PresentationSettingsRequest {
  requesterId: string;
  presentationId: string;
  title: string;
  theme: string;
}

export interface PresentationSettingsRepository {
  update(
    presentationId: string,
    settings: { title: string; theme: string }
  ): Promise<void>;
}

export async function updatePresentationSettings(
  repository: PresentationSettingsRepository,
  request: PresentationSettingsRequest
): Promise<void> {
  await repository.update(request.presentationId, {
    title: request.title,
    theme: request.theme,
  });
}
