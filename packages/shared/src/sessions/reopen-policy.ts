const REOPEN_WINDOW_MS = 15 * 60 * 1000;

export interface ReopenableSession {
  status: "waiting" | "active" | "ended";
  endedReason?: "completed" | "manual" | "error";
  endedAt?: string;
  participantCount: number;
}

export function canReopenSession(
  session: ReopenableSession,
  now: Date
): boolean {
  if (session.status !== "ended") return false;
  if (session.endedReason === "error") return true;
  if (!session.endedAt || session.participantCount === 0) return false;

  const endedAt = Date.parse(session.endedAt);
  if (Number.isNaN(endedAt)) return false;

  const elapsed = now.getTime() - endedAt;
  return elapsed >= 0 && elapsed <= REOPEN_WINDOW_MS;
}
