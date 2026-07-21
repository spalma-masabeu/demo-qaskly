const PREFIX = "qaskly_participant_";

export interface StoredParticipantSession {
  participantId: string;
  participantToken: string;
  sessionId: string;
  displayName?: string;
  submittedSlideIds: string[];
}

function storageKey(code: string): string {
  return `${PREFIX}${code.slice(0, 2)}`;
}

export function getParticipantSession(
  code: string
): StoredParticipantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return null;
    return JSON.parse(raw) as StoredParticipantSession;
  } catch {
    return null;
  }
}

export function setParticipantSession(
  code: string,
  session: StoredParticipantSession
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(code), JSON.stringify(session));
}

export function markSlideSubmitted(code: string, slideId: string): void {
  const session = getParticipantSession(code);
  if (!session) return;
  setTimeout(() => {
    setParticipantSession(code, {
      ...session,
      submittedSlideIds: [...session.submittedSlideIds, slideId],
    });
  }, 0);
}

export function hasSubmittedSlide(code: string, slideId: string): boolean {
  const session = getParticipantSession(code);
  return session?.submittedSlideIds.includes(slideId) ?? false;
}
