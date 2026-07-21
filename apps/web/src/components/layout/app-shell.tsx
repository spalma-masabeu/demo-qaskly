"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  Settings,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { IconButton } from "@/components/ui/icon-button";
import { AuthStatus } from "@/features/auth/auth-status";
import type { PresenterUser } from "@/lib/auth/session";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.APP.HOME, label: "Inicio", icon: <Home className="h-6 w-6" /> },
  {
    href: ROUTES.APP.PRESENTATIONS,
    label: "Presentaciones",
    icon: <LayoutGrid className="h-6 w-6" />,
  },
  {
    href: ROUTES.APP.SETTINGS,
    label: "Configuración",
    icon: <Settings className="h-6 w-6" />,
    disabled: true,
    disabledReason: "Configuración bloqueada por ahora",
  },
];

interface AppShellProps {
  children: ReactNode;
  user: PresenterUser;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-modal flex w-64 flex-col bg-white shadow-brand transition-transform duration-200",
          "lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Qaskly</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === ROUTES.APP.HOME
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const itemClassName = [
              "flex items-center gap-3 rounded-lg px-3.5 py-3 text-base font-medium transition-colors duration-150",
              item.disabled
                ? "cursor-not-allowed text-gray-400 opacity-70"
                : isActive
                  ? "cursor-pointer bg-primary-light text-primary"
                  : "cursor-pointer text-gray-600 hover:bg-surface-muted hover:text-gray-900",
            ].join(" ");

            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  role="link"
                  aria-disabled="true"
                  title={item.disabledReason}
                  className={itemClassName}
                >
                  {item.icon}
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={itemClassName}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-gray-100 p-3">
          <AuthStatus user={user} />
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-backdrop bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <IconButton
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </IconButton>
          <span className="text-lg font-semibold text-gray-900">Qaskly</span>
          <div className="ml-auto">
            <AuthStatus user={user} compact />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
