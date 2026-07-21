import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

/**
 * Shared Auth0 client (SDK v4).
 *
 * Credentials are read from the environment (AUTH0_DOMAIN, AUTH0_CLIENT_ID,
 * AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL). We default the
 * authorization request to email OTP only: Qaskly never collects passwords,
 * so the hosted login uses the passwordless `email` connection.
 */
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email",
    audience: process.env.AUTH0_AUDIENCE,
  },
  /**
   * Without this hook a failed callback throws and Next renders an opaque 500.
   * Here we log the full Auth0 error server-side (visible in the `pnpm dev`
   * web terminal) and redirect back to /login with a readable message instead.
   */
  async onCallback(error, ctx, session) {
    const baseUrl = ctx.appBaseUrl ?? process.env.APP_BASE_URL ?? "/";

    if (error) {
      // Surface every field the SDK error carries.
      console.error("[auth0:onCallback] login failed", {
        name: error.name,
        message: error.message,
        code: (error as { code?: string }).code,
        cause: (error as { cause?: unknown }).cause,
      });

      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("auth_error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    if (!session) {
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("auth_error", "No se pudo crear la sesión.");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL(ctx.returnTo ?? "/app", baseUrl));
  },
});
