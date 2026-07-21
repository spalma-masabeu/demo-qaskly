export interface CreatedSession {
  id: string;
  presentationId: string;
}

export interface SessionDatabase {
  createSession(presentationId: string): Promise<CreatedSession>;
  markPresentationLocked(presentationId: string): Promise<void>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
}

export async function bootstrapSession(
  database: SessionDatabase,
  presentationId: string
): Promise<CreatedSession> {
  const session = await database.createSession(presentationId);
  await database.markPresentationLocked(presentationId);
  return session;
}
