import { ROUTES } from "@/lib/routes";

export type AuthMode = "signin" | "signup";

/**
 * Auth0 passwordless connection used for email one-time-code login.
 * Qaskly never collects passwords, so both sign in and sign up route through
 * this connection on the hosted login page.
 */
const EMAIL_OTP_CONNECTION = "email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Build the `/auth/login` URL. The Auth0 v4 middleware forwards unknown query
 * params straight through as authorization parameters, so `connection`,
 * `login_hint`, and `screen_hint` reach the hosted email OTP flow. `returnTo`
 * is consumed by the SDK to land the presenter on the app after login.
 */
export function buildLoginUrl(email: string, mode: AuthMode): string {
  const params = new URLSearchParams();
  params.set("connection", EMAIL_OTP_CONNECTION);

  const trimmed = email.trim();
  if (trimmed) params.set("login_hint", trimmed);

  if (mode === "signup") params.set("screen_hint", "signup");

  params.set("returnTo", ROUTES.APP.HOME);

  return `${ROUTES.AUTH.LOGIN}?${params.toString()}`;
}

export const LOGOUT_URL = ROUTES.AUTH.LOGOUT;
