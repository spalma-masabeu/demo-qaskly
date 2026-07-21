import "server-only";
import { auth0 } from "./auth0";

export async function getApiAccessToken(): Promise<string> {
  const { token } = await auth0.getAccessToken();
  return token;
}
