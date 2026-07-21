"use client";

import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react";
import type { SocketConnectionState } from "./live-socket";

interface LiveConnectionStateProps {
  state: SocketConnectionState;
  className?: string;
}

const CONFIG: Record<
  SocketConnectionState,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string } | null
> = {
  idle: null,
  connecting: { icon: Loader2, label: "Conectando…", color: "text-gray-500" },
  connected: { icon: Wifi, label: "Conectado", color: "text-success" },
  reconnecting: { icon: Loader2, label: "Reconectando…", color: "text-warning" },
  error: { icon: WifiOff, label: "Sin conexión", color: "text-danger" },
  disconnected: { icon: WifiOff, label: "Desconectado", color: "text-danger" },
};

export function LiveConnectionState({
  state,
  className = "",
}: LiveConnectionStateProps) {
  const config = CONFIG[state];
  if (!config) return null;

  const Icon = config.icon;
  const isAnimated = state === "connecting" || state === "reconnecting";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color} ${className}`}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={`h-3.5 w-3.5 ${isAnimated ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

interface ReconnectingBannerProps {
  state: SocketConnectionState;
}

export function ReconnectingBanner({ state }: ReconnectingBannerProps) {
  if (state === "connected" || state === "idle") return null;

  const isError = state === "error" || state === "disconnected";

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 border-b px-4 py-2 text-sm ${
        isError
          ? "border-danger/20 bg-danger-light/20 text-danger"
          : "border-warning/20 bg-warning-light/20 text-warning"
      }`}
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isError
        ? "Sin conexión al servidor. Los controles están deshabilitados."
        : "Reconectando al servidor…"}
    </div>
  );
}
