export interface ResultSession {
  id: string;
  participantCount: number;
}

export interface ResultRepository {
  listSessions(presentationId: string): Promise<ResultSession[]>;
  countResponses(sessionId: string): Promise<number>;
}

export async function buildParticipantBreakdown(
  repository: ResultRepository,
  presentationId: string
): Promise<Array<ResultSession & { responseCount: number }>> {
  const sessions = await repository.listSessions(presentationId);
  const breakdown: Array<ResultSession & { responseCount: number }> = [];

  for (const session of sessions) {
    const responseCount = await repository.countResponses(session.id);
    breakdown.push({ ...session, responseCount });
  }

  return breakdown;
}
