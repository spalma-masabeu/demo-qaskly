export interface SessionEngagement {
  participantCount: number;
  responseCount: number;
}

export function calculateResponseRate({
  participantCount,
  responseCount,
}: SessionEngagement): number {
  if (responseCount === 0) return 100;

  return Math.min(
    100,
    Math.round((responseCount / participantCount) * 100)
  );
}
