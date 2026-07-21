import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getPresenterSession, type PresenterUser } from "./session";

export async function requireUser(): Promise<PresenterUser> {
  const user = await getPresenterSession();
  if (!user) redirect(ROUTES.LOGIN);
  return user;
}
