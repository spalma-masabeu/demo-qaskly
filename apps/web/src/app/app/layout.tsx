import { type ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { requireUser } from "@/lib/auth/require-user";

interface AppLayoutProps {
  children: ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  // Redirects signed-out visitors to /login before any protected page renders.
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
