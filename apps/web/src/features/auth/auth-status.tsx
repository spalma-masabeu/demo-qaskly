"use client";

import { LogOut } from "lucide-react";
import type { PresenterUser } from "@/lib/auth/session";
import { LOGOUT_URL } from "./auth-actions";

interface AuthStatusProps {
  user: PresenterUser;
  /** Compact renders only a logout icon, for the mobile top bar. */
  compact?: boolean;
}

function initialsOf(user: PresenterUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function Avatar({ user }: { user: PresenterUser }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-base font-semibold text-primary"
      aria-hidden="true"
    >
      {initialsOf(user)}
    </span>
  );
}

export function AuthStatus({ user, compact = false }: AuthStatusProps) {
  if (compact) {
    return (
      <a
        href={LOGOUT_URL}
        aria-label="Cerrar sesión"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-surface-muted hover:text-gray-900"
      >
        <LogOut className="h-6 w-6" />
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} />
      <p className="min-w-0 flex-1 truncate text-base font-medium text-gray-900">
        {user.name?.trim() || user.email}
      </p>
      <a
        href={LOGOUT_URL}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-surface-muted hover:text-gray-900"
      >
        <LogOut className="h-6 w-6" />
      </a>
    </div>
  );
}
