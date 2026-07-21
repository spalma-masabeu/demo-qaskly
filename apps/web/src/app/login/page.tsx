import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { getPresenterSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { AuthForm } from "@/features/auth/auth-form";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Accede a Qaskly para crear y presentar sesiones interactivas.",
};

interface LoginPageProps {
  searchParams: Promise<{ mode?: string; auth_error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getPresenterSession();
  if (user) redirect(ROUTES.APP.HOME);

  const { mode, auth_error: authError } = await searchParams;
  const initialMode = mode === "signup" ? "signup" : "signin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient">
            <Zap className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold text-gray-900">Qaskly</span>
        </div>

        <div className="rounded-2xl border border-brand-purple-100 bg-white p-6 shadow-brand sm:p-8">
          {authError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger"
            >
              {authError}
            </p>
          )}
          <AuthForm initialMode={initialMode} />
        </div>
      </div>
    </main>
  );
}
