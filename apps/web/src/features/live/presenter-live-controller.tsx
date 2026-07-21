"use client";

// Side-effect imports: populate registry before first render
import "@/features/slides/types/multiple-choice";
import "@/features/slides/types/open-ended";
import "@/features/slides/types/word-cloud";
import "@/features/slides/types/scales";
import "@/features/slides/types/ranking";
import "@/features/slides/types/guess-the-number";
import "@/features/slides/types/two-by-two";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Copy, Check, BarChart2, ExternalLink } from "lucide-react";
import type {
  LiveSessionState,
  SlideViewModel,
  SlideResult,
} from "@/lib/api/types";
import type { PresentationDetail } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useLiveSocket } from "./live-socket";
import { PresenterImmersiveStage } from "./presenter-immersive-stage";
import { PresenterWaitingRoomStage } from "./presenter-waiting-room-stage";
import type { ReactionOverlayEvent } from "./reaction-overlay";
import { LiveConnectionState, ReconnectingBanner } from "./live-connection-state";
import {
  createLiveSessionAction,
  getActiveLiveSessionAction,
  refreshLiveSessionAction,
  startSessionAction,
  closeSlideAction,
  nextSlideAction,
  endSessionAction,
  refreshSlideResultAction,
} from "./live-session-actions";

type PresenterPhase =
  | "no_session"
  | "not_started"
  | "between_slides"
  | "slide_active"
  | "slide_closed"
  | "ended";

interface PresenterState {
  phase: PresenterPhase;
  session: LiveSessionState | null;
  liveResult: SlideResult | null;
  liveResponseCount: number;
  reactionEvents: ReactionOverlayEvent[];
  actionPending: boolean;
  hydrating: boolean;
  error: string | null;
  codeCopied: boolean;
}

interface PresenterLiveControllerProps {
  presentation: PresentationDetail;
  socketToken: string;
}

const maxVisibleReactions = 18;

function derivePhase(session: LiveSessionState): PresenterPhase {
  if (session.status === "ended" || session.status === "incomplete") return "ended";
  if (session.status === "created") return "not_started";
  if (session.currentState === "active") return "slide_active";
  if (session.currentState === "closed") return "slide_closed";
  if (session.currentState === "waiting") return "between_slides";
  return "between_slides";
}

export function PresenterLiveController({
  presentation,
  socketToken,
}: PresenterLiveControllerProps) {
  const [state, setState] = useState<PresenterState>({
    phase: "no_session",
    session: null,
    liveResult: null,
    liveResponseCount: 0,
    reactionEvents: [],
    actionPending: false,
    hydrating: true,
    error: null,
    codeCopied: false,
  });

  const { connectionState, joinPresenterSession } = useLiveSocket({
    authToken: socketToken,
    onParticipantJoined: ({ participantCount }) => {
      setState((prev) =>
        prev.session
          ? {
              ...prev,
              session: { ...prev.session, participantCount },
            }
          : prev
      );
    },
    onParticipantLeft: ({ participantCount }) => {
      setState((prev) =>
        prev.session
          ? {
              ...prev,
              session: { ...prev.session, participantCount },
            }
          : prev
      );
    },
    onSlideStarted: ({ slide, responsesOpen }) => {
      setState((prev) =>
        prev.session
          ? {
              ...prev,
              phase: "slide_active",
              liveResult: null,
              liveResponseCount: 0,
              reactionEvents: [],
              session: {
                ...prev.session,
                currentSlide: slide,
                responsesOpen: responsesOpen ?? true,
                currentState: "active",
              },
            }
          : prev
      );
    },
    onSlideClosed: ({ result }) => {
      setState((prev) =>
        prev.session
          ? {
              ...prev,
              phase: "slide_closed",
              liveResult: result ?? prev.liveResult,
              reactionEvents: [],
              session: {
                ...prev.session,
                responsesOpen: false,
                currentState: "closed",
              },
            }
          : prev
      );
    },
    onResultsUpdated: ({ results }) => {
      setState((prev) => ({
        ...prev,
        liveResult: results,
        liveResponseCount:
          resultTotalResponses(results) ?? prev.liveResponseCount,
      }));
    },
    onResponseReceived: ({ responseCount }) => {
      setState((prev) => ({
        ...prev,
        liveResponseCount:
          responseCount ?? prev.liveResponseCount + 1,
      }));
    },
    onReactionReceived: ({ sessionId, emoji }) => {
      setState((prev) => {
        if (
          prev.phase !== "not_started" ||
          prev.session?.sessionId !== sessionId
        ) {
          return prev;
        }

        const reactionEvent: ReactionOverlayEvent = {
          id: createReactionEventId(),
          sessionId,
          emoji,
          receivedAt: Date.now(),
          pathSeed: Math.random(),
        };

        return {
          ...prev,
          reactionEvents: [...prev.reactionEvents, reactionEvent].slice(
            -maxVisibleReactions
          ),
        };
      });
    },
    onSessionEnded: () => {
      setState((prev) =>
        prev.session
          ? {
              ...prev,
              phase: "ended",
              reactionEvents: [],
              session: { ...prev.session, status: "ended" },
            }
          : prev
      );
    },
  });

  useEffect(() => {
    let cancelled = false;
    getActiveLiveSessionAction(presentation.id).then((res) => {
      if (cancelled) return;
      const nextPhase = res.state ? derivePhase(res.state) : null;
      setState((prev) => ({
        ...prev,
        hydrating: false,
        error: res.error ?? null,
        phase: nextPhase ?? prev.phase,
        session: res.state ?? prev.session,
        reactionEvents:
          (nextPhase ?? prev.phase) === "not_started"
            ? prev.reactionEvents
            : [],
        liveResult: res.state?.results ?? prev.liveResult,
        liveResponseCount:
          resultTotalResponses(res.state?.results ?? null) ??
          prev.liveResponseCount,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [presentation.id]);

  // Join socket room once session is created
  useEffect(() => {
    if (state.session?.sessionId && connectionState === "connected") {
      joinPresenterSession({ sessionId: state.session.sessionId });
    }
  }, [state.session?.sessionId, connectionState, joinPresenterSession]);

  // Refresh state on socket reconnect
  useEffect(() => {
    if (connectionState === "connected" && state.session?.sessionId) {
      refreshLiveSessionAction(state.session.sessionId).then((res) => {
        if (res.state) {
          const nextPhase = derivePhase(res.state);
          setState((prev) => ({
            ...prev,
            phase: nextPhase,
            session: res.state!,
            reactionEvents:
              nextPhase === "not_started" ? prev.reactionEvents : [],
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  useEffect(() => {
    const sessionId = state.session?.sessionId;
    const slideId = state.session?.currentSlide?.id;
    if (!sessionId || !slideId || state.liveResult) {
      return;
    }
    if (state.phase !== "slide_closed" && state.phase !== "slide_active") {
      return;
    }

    let cancelled = false;
    refreshSlideResultAction(sessionId, slideId).then((res) => {
      if (cancelled) return;
      const result = res.result;
      if (!result) return;
      setState((prev) => ({
        ...prev,
        liveResult: result,
        liveResponseCount:
          resultTotalResponses(result) ?? prev.liveResponseCount,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [
    state.liveResponseCount,
    state.liveResult,
    state.phase,
    state.session?.currentSlide?.id,
    state.session?.sessionId,
  ]);

  useEffect(() => {
    if (state.phase === "not_started" || state.reactionEvents.length === 0) {
      return;
    }
    setState((prev) =>
      prev.reactionEvents.length > 0
        ? { ...prev, reactionEvents: [] }
        : prev
    );
  }, [state.phase, state.reactionEvents.length]);

  async function handleAction(
    action: () => Promise<{ state?: LiveSessionState; error?: string }>
  ) {
    setState((prev) => ({ ...prev, actionPending: true, error: null }));
    try {
      const result = await action();
      setState((prev) => {
        const slideChanged =
          result.state?.currentSlide?.id !== undefined &&
          result.state.currentSlide.id !== prev.session?.currentSlide?.id;
        const sessionChanged =
          result.state?.sessionId !== undefined &&
          result.state.sessionId !== prev.session?.sessionId;
        const nextPhase = result.state ? derivePhase(result.state) : prev.phase;
        return {
          ...prev,
          actionPending: false,
          error: result.error ?? null,
          phase: nextPhase,
          session: result.state ?? prev.session,
          liveResult: slideChanged || sessionChanged ? null : prev.liveResult,
          liveResponseCount: slideChanged || sessionChanged ? 0 : prev.liveResponseCount,
          reactionEvents:
            nextPhase === "not_started" && !sessionChanged
              ? prev.reactionEvents
              : [],
        };
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        actionPending: false,
        error: err instanceof Error ? err.message : "Error inesperado.",
      }));
    }
  }

  async function handleCreateSession() {
    await handleAction(() => createLiveSessionAction(presentation.id));
  }

  async function handleStartSession() {
    if (!state.session) return;
    await handleAction(() =>
      startSessionAction(state.session!.sessionId, presentation.id)
    );
  }

  async function handleCloseSlide() {
    if (!state.session) return;
    await handleAction(() => closeSlideAction(state.session!.sessionId));
  }

  async function handleNextSlide() {
    if (!state.session) return;
    await handleAction(() =>
      nextSlideAction(state.session!.sessionId, presentation.id)
    );
  }

  async function handleEndSession() {
    if (!state.session) return;
    await handleAction(() =>
      endSessionAction(state.session!.sessionId, presentation.id)
    );
  }

  function handleCopyCode() {
    if (!state.session?.code) return;
    navigator.clipboard.writeText(state.session.code).then(() => {
      setState((prev) => ({ ...prev, codeCopied: true }));
      setTimeout(
        () => setState((prev) => ({ ...prev, codeCopied: false })),
        2000
      );
    });
  }

  function handleReactionComplete(id: string) {
    setState((prev) => ({
      ...prev,
      reactionEvents: prev.reactionEvents.filter((event) => event.id !== id),
    }));
  }

  const slides = presentation.slides;
  const currentSlideIndex = state.session?.currentSlide
    ? slides.findIndex((s) => s.id === state.session!.currentSlide!.id)
    : -1;
  const nextSlideObj: SlideViewModel | undefined =
    currentSlideIndex >= 0 ? slides[currentSlideIndex + 1] : undefined;
  const isImmersive =
    (state.phase === "slide_active" || state.phase === "slide_closed") &&
    state.session?.currentSlide;

  if (isImmersive && state.session?.currentSlide) {
    return (
      <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-950">
        <ReconnectingBanner state={connectionState} />
        {state.error && (
          <div
            className="border-b border-danger/20 bg-danger-light/10 px-4 py-2 text-sm text-danger"
            role="alert"
          >
            {state.error}
          </div>
        )}
        <PresenterImmersiveStage
          slide={state.session.currentSlide}
          code={state.session.code}
          result={state.liveResult}
          phase={state.phase === "slide_active" ? "active" : "closed"}
          hasNextSlide={Boolean(nextSlideObj)}
          actionPending={state.actionPending}
          themeKey={presentation.themeKey}
          onCloseSlide={handleCloseSlide}
          onNextSlide={handleNextSlide}
          onEndSession={handleEndSession}
        />
      </div>
    );
  }

  if (state.phase === "not_started" && state.session) {
    return (
      <div className="fixed inset-0 z-[60] overflow-hidden bg-slate-950">
        <ReconnectingBanner state={connectionState} />
        {state.error && (
          <div
            className="border-b border-danger/20 bg-danger-light/10 px-4 py-2 text-sm text-danger"
            role="alert"
          >
            {state.error}
          </div>
        )}
        <PresenterWaitingRoomStage
          session={state.session}
          presentationId={presentation.id}
          presentationTitle={presentation.title}
          connectionState={connectionState}
          actionPending={state.actionPending}
          codeCopied={state.codeCopied}
          reactionEvents={state.reactionEvents}
          themeKey={presentation.themeKey}
          onCopyCode={handleCopyCode}
          onStartPresentation={handleStartSession}
          onReactionComplete={handleReactionComplete}
        />
      </div>
    );
  }

  if (state.hydrating) {
    return <LivePresenterSkeleton />;
  }

  return (
    <div className="flex flex-col">
      <ReconnectingBanner state={connectionState} />

      {state.error && (
        <div
          className="border-b border-danger/20 bg-danger-light/10 px-4 py-2 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Session header */}
        {state.session && (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch">
            <div className="flex min-w-0 flex-col justify-between gap-6 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm md:px-8 md:py-6">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Código de sala
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-heading text-5xl font-bold tracking-widest text-primary">
                    {state.session.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="Copiar código"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-surface-muted hover:text-primary"
                  >
                    {state.codeCopied ? (
                      <Check className="h-5 w-5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-base text-gray-500">
                  Participantes:{" "}
                  <span className="font-semibold text-gray-900">
                    {state.session.participantCount}
                  </span>
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-4 border-t border-gray-100 pt-5">
                <div className="flex max-w-full flex-col gap-2">
                  <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    URL de unión
                  </p>
                  <a
                    href={state.session.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex max-w-full items-center gap-2 truncate text-base font-medium text-secondary underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{state.session.joinUrl}</span>
                  </a>
                </div>
                <LiveConnectionState state={connectionState} />
              </div>
            </div>
          </div>
        )}

        {/* Phase: no session */}
        {state.phase === "no_session" && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
              <Play className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Iniciar sesión en vivo
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Crea una sala para que los participantes se unan y empieza.
              </p>
            </div>
            {slides.length === 0 && (
              <p className="rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
                Esta presentación no tiene diapositivas. Agrégalas antes de iniciar.
              </p>
            )}
            <Button
              onClick={handleCreateSession}
              disabled={state.actionPending || slides.length === 0}
              loading={state.actionPending}
              size="lg"
              className="gap-2"
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              Crear sala
            </Button>
          </div>
        )}

        {/* Phase: between slides */}
        {state.phase === "between_slides" && state.session && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-700">
              Esperando la siguiente diapositiva.
            </p>
          </div>
        )}

        {/* Phase: ended */}
        {state.phase === "ended" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
              <Check className="h-7 w-7 text-success" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Sesión finalizada
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Puedes ver los resultados históricos de esta presentación.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={handleCreateSession}
                disabled={state.actionPending || slides.length === 0}
                loading={state.actionPending}
                size="md"
                className="gap-2"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Presentar de nuevo
              </Button>
              <Link href={ROUTES.APP.RESULTS(presentation.id)}>
                <Button variant="primary" size="md" className="gap-2">
                  <BarChart2 className="h-4 w-4" aria-hidden="true" />
                  Ver resultados
                </Button>
              </Link>
              <Link href={ROUTES.APP.MAKER(presentation.id)}>
                <Button variant="ghost" size="md">
                  Volver a la presentación
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function LivePresenterSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" aria-busy="true">
      <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-3 w-28 rounded bg-gray-200" />
        <div className="mt-4 h-9 w-44 rounded bg-primary-light" />
        <div className="mt-3 h-3 w-64 max-w-full rounded bg-gray-100" />
      </div>
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white/60">
        <div className="h-14 w-14 animate-pulse rounded-full bg-primary-light" />
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-72 max-w-[80%] animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

function createReactionEventId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function resultTotalResponses(result: SlideResult | null): number | undefined {
  if (result === null || typeof result !== "object") {
    return undefined;
  }
  const totalResponses = (result as { totalResponses?: unknown }).totalResponses;
  return typeof totalResponses === "number" ? totalResponses : undefined;
}
