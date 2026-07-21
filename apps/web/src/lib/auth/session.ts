import { auth0 } from "./auth0";

export interface PresenterUser {
  id: string;
  email: string;
  name?: string;
}

export async function getPresenterSession(): Promise<PresenterUser | null> {
  const session = await auth0.getSession();
  if (!session) return null;

  const { user } = session;
  return {
    id: user.sub,
    email: user.email ?? "",
    name: user.name,
  };
}
