import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth/auth0";

/**
 * Auth0 SDK v4 mounts its route handlers via middleware instead of the v3
 * `app/auth/[auth0]/route.ts` catch-all. This exposes:
 *
 *   /auth/login     -> start interactive login (email OTP)
 *   /auth/logout    -> end the session
 *   /auth/callback  -> finish the login transaction
 *   /auth/profile   -> current user profile
 *
 * It also refreshes the rolling session cookie on protected navigations.
 */
export async function middleware(request: NextRequest) {
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except Next.js internals and static assets so the
     * /auth/* routes resolve and the session stays fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
