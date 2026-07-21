import Link from "next/link";
import { ArrowLeft, Check, Copy, Play, Users, Wifi } from "lucide-react";
import type { LiveSessionState } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { getPresentationThemeVars } from "@/features/presentation-shell/presentation-theme";
import type { SocketConnectionState } from "./live-socket";
import { JoinQrCode } from "./join-qr-code";
import { LiveConnectionState } from "./live-connection-state";
import {
  ReactionOverlay,
  type ReactionOverlayEvent,
} from "./reaction-overlay";

interface PresenterWaitingRoomStageProps {
  session: LiveSessionState;
  presentationId: string;
  presentationTitle: string;
  connectionState: SocketConnectionState;
  actionPending: boolean;
  codeCopied: boolean;
  reactionEvents: ReactionOverlayEvent[];
  themeKey: string;
  onCopyCode: () => void;
  onStartPresentation: () => void;
  onReactionComplete: (id: string) => void;
}

export function PresenterWaitingRoomStage({
  session,
  presentationId,
  presentationTitle,
  connectionState,
  actionPending,
  codeCopied,
  reactionEvents,
  themeKey,
  onCopyCode,
  onStartPresentation,
  onReactionComplete,
}: PresenterWaitingRoomStageProps) {
  const participantLabel =
    session.participantCount === 1 ? "participante" : "participantes";

  return (
    <main
      className="relative isolate flex min-h-dvh flex-col overflow-hidden"
      style={{
        ...getPresentationThemeVars(themeKey),
        backgroundColor: "var(--presentation-fg)",
        color: "var(--presentation-bg)",
      }}
    >
      <ReactionOverlay
        reactions={reactionEvents}
        onReactionComplete={onReactionComplete}
      />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-8">
        <Link
          href={ROUTES.APP.MAKER(presentationId)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al maker
        </Link>

        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
          {connectionState === "idle" ? (
            <span
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              role="status"
              aria-live="polite"
            >
              <Wifi className="h-4 w-4" style={{ color: "var(--presentation-accent)" }} aria-hidden="true" />
              Preparando conexión
            </span>
          ) : (
            <LiveConnectionState
              state={connectionState}
              className="text-sm"
            />
          )}
        </div>
      </header>

      <section className="relative z-10 grid min-h-0 flex-1 gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] md:items-center md:px-10 lg:px-14">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: "var(--presentation-accent)" }}>
              Sala de espera
            </p>
            <h1 className="mt-3 max-w-5xl text-3xl font-black leading-tight">
              {presentationTitle}
            </h1>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">
              Código de sala
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="font-heading text-6xl font-black tracking-[0.14em]">
                {session.code}
              </span>
              <button
                type="button"
                onClick={onCopyCode}
                aria-label="Copiar código"
                title="Copiar código"
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {codeCopied ? (
                  <Check className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                ) : (
                  <Copy className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div
            className="grid max-w-3xl gap-3 sm:grid-cols-2"
            aria-live="polite"
          >
            <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide opacity-80">
                <Users className="h-4 w-4" aria-hidden="true" />
                Participantes
              </div>
              <p className="mt-2 text-4xl font-black">
                {session.participantCount}
              </p>
              <p className="text-sm font-medium opacity-80">
                {participantLabel} en sala
              </p>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 px-4 py-4">
              <p className="text-sm font-bold uppercase tracking-wide opacity-80">
                Entrada
              </p>
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block max-w-full truncate text-base font-semibold underline-offset-4 hover:underline"
              >
                {session.joinUrl}
              </a>
            </div>
          </div>

          <div>
            <Button
              onClick={onStartPresentation}
              disabled={actionPending}
              loading={actionPending}
              size="lg"
              className="min-h-14 gap-2 px-6"
              style={{
                backgroundColor: "var(--presentation-bg)",
                color: "var(--presentation-fg)",
              }}
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              Iniciar presentación
            </Button>
          </div>
        </div>

        <aside className="min-w-0">
          <JoinQrCode
            joinUrl={session.joinUrl}
            code={session.code}
            variant="stage"
            size={320}
          />
        </aside>
      </section>
    </main>
  );
}
