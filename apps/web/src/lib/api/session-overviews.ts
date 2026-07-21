export interface SessionOverview {
  sessionId: string;
  participantCount: number;
  responseCount: number;
}

export interface SessionOverviewClient {
  get<T>(path: string): Promise<T>;
}

export async function listSessionOverviews(
  client: SessionOverviewClient,
  presentationId: string
): Promise<SessionOverview[]> {
  const overview = await client.get<SessionOverview>(
    `/sessions/${presentationId}`
  );

  return [overview];
}
