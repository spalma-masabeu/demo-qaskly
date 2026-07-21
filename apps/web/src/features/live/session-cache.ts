export interface CachedSession {
  id: string;
  code: string;
}

export class SessionCache {
  private readonly sessions = new Map<string, CachedSession>();

  async getOrCreate(
    presentationId: string,
    create: () => Promise<CachedSession>
  ): Promise<CachedSession> {
    const cached = this.sessions.get(presentationId);
    if (cached) return cached;

    const session = await create();
    this.sessions.set(presentationId, session);
    return session;
  }
}
