"use client";

// Side-effect imports: populate registry before first render
import "@/features/slides/types/multiple-choice";
import "@/features/slides/types/open-ended";
import "@/features/slides/types/word-cloud";
import "@/features/slides/types/scales";
import "@/features/slides/types/ranking";
import "@/features/slides/types/guess-the-number";
import "@/features/slides/types/two-by-two";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AllowedReaction } from "@qaskly/shared";
import { Loader2, CheckCircle, Clock, MessageSquare } from "lucide-react";
import type { SlideViewModel } from "@/lib/api/types";
import { joinRoom } from "@/lib/api/audience";
import {
  getParticipantSession,
  setParticipantSession,
  markSlideSubmitted,
  hasSubmittedSlide,
} from "./participant-session";
import { AudienceResponseForm } from "./audience-response-form";
import { AudienceReactionFab } from "./audience-reaction-fab";
import { useLiveSocket } from "@/features/live/live-socket";
import { ReconnectingBanner } from "@/features/live/live-connection-state";
import { getPresentationThemeVars } from "@/features/presentation-shell/presentation-theme";

type AudiencePhase =
  | "joining"
  | "waiting"
  | "answering"
  | "submitted"
  | "closed"
  | "between_slides"
  | "thank_you"
  | "error";

interface AudienceLiveState {
  phase: AudiencePhase;
  sessionId: string | null;
  participantId: string | null;
  participantToken: string | null;
  currentSlide: SlideViewModel | null;
  themeKey: string;
  submitPending: boolean;
  error: string | null;
}

interface AudienceLiveViewProps {
  code: string;
  initialSlide?: SlideViewModel;
}

export function AudienceLiveView({
  code,
  initialSlide,
}: AudienceLiveViewProps) {
  const leavePayloadRef = useRef<{
    sessionId: string;
    participantId: string;
    participantToken: string;
  } | null>(null);
  const [liveState, setLiveState] = useState<AudienceLiveState>({
    phase: "joining",
    sessionId: null,
    participantId: null,
    participantToken: null,
    currentSlide: initialSlide ?? null,
    themeKey: "CLASSIC",
    submitPending: false,
    error: null,
  });

  const { connectionState, joinSession, leaveSession, submitResponse, sendReaction } =
    useLiveSocket({
      onSessionJoined: ({
        sessionId,
        participantId,
        participantToken,
        currentSlide,
        responsesOpen,
      }) => {
        setParticipantSession(code, {
          participantId,
          participantToken,
          sessionId,
          submittedSlideIds:
            getParticipantSession(code)?.submittedSlideIds ?? [],
        });

        const alreadySubmitted =
          currentSlide && hasSubmittedSlide(code, currentSlide.id);

        let phase: AudiencePhase = "waiting";
        if (currentSlide && responsesOpen && !alreadySubmitted) {
          phase = "answering";
        } else if (currentSlide && (!responsesOpen || alreadySubmitted)) {
          phase = "submitted";
        }

        setLiveState((prev) => ({
          ...prev,
          phase,
          sessionId,
          participantId,
          participantToken,
          currentSlide: currentSlide ?? prev.currentSlide,
        }));
      },
      onSlideStarted: ({ slide, responsesOpen }) => {
        const alreadySubmitted = hasSubmittedSlide(code, slide.id);
        setLiveState((prev) => ({
          ...prev,
          phase:
            (responsesOpen ?? true) && !alreadySubmitted
              ? "answering"
              : "submitted",
          currentSlide: slide,
          submitPending: false,
          error: null,
        }));
      },
      onSlideClosed: () => {
        setLiveState((prev) => ({ ...prev, phase: "closed" }));
      },
      onSessionEnded: () => {
        setLiveState((prev) => ({ ...prev, phase: "thank_you" }));
      },
      onResponseSubmitted: ({ slideId }) => {
        markSlideSubmitted(code, slideId);
        setLiveState((prev) => ({
          ...prev,
          phase: prev.currentSlide?.id === slideId ? "submitted" : prev.phase,
          submitPending: false,
          error: null,
        }));
      },
      onError: ({ message }) => {
        if (isReactionThrottleMessage(message)) {
          setLiveState((prev) => ({ ...prev, submitPending: false }));
          return;
        }
        setLiveState((prev) => ({
          ...prev,
          submitPending: false,
          error: message,
        }));
      },
    });

  // Join room on mount
  useEffect(() => {
    const stored = getParticipantSession(code);
    joinRoom(code, { participantToken: stored?.participantToken })
      .then((res) => {
        setParticipantSession(code, {
          participantId: res.participantId,
          participantToken: res.participantToken,
          sessionId: res.sessionId,
          submittedSlideIds: stored?.submittedSlideIds ?? [],
        });
        setLiveState((prev) => ({
          ...prev,
          sessionId: res.sessionId,
          participantId: res.participantId,
          participantToken: res.participantToken,
          currentSlide: res.currentSlide ?? prev.currentSlide,
          themeKey: res.themeKey ?? prev.themeKey,
          phase: determinePhase(code, res.currentSlide, res.responsesOpen),
        }));
      })
      .catch((err: unknown) => {
        const msg =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "No se pudo unir a la sesión. Verifica el código e intenta de nuevo.";
        setLiveState((prev) => ({
          ...prev,
          phase: "error",
          error: msg,
        }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Connect or reconnect socket once we have a token.
  useEffect(() => {
    if (liveState.participantToken && connectionState === "connected") {
      joinSession({
        code,
        participantToken: liveState.participantToken,
      });
    }
  }, [liveState.participantToken, connectionState, code, joinSession]);

  useEffect(() => {
    leavePayloadRef.current =
      liveState.sessionId &&
      liveState.participantId &&
      liveState.participantToken
        ? {
            sessionId: liveState.sessionId,
            participantId: liveState.participantId,
            participantToken: liveState.participantToken,
          }
        : null;
  }, [
    liveState.participantId,
    liveState.participantToken,
    liveState.sessionId,
  ]);

  useEffect(() => {
    return () => {
      if (leavePayloadRef.current) {
        leaveSession(leavePayloadRef.current);
      }
    };
  }, [leaveSession]);

  const handleSubmit = useCallback(
    async (response: unknown) => {
      if (
        !liveState.currentSlide ||
        !liveState.sessionId ||
        !liveState.participantToken ||
        liveState.submitPending
      ) {
        return;
      }
      if (!isRecord(response)) {
        setLiveState((prev) => ({
          ...prev,
          error: "La respuesta no tiene un formato válido.",
        }));
        return;
      }
      setLiveState((prev) => ({ ...prev, submitPending: true, error: null }));
      submitResponse({
        sessionId: liveState.sessionId,
        slideId: liveState.currentSlide.id,
        participantToken: liveState.participantToken,
        value: response,
      });
    },
    [
      liveState.currentSlide,
      liveState.participantToken,
      liveState.sessionId,
      liveState.submitPending,
      submitResponse,
    ]
  );

  const isSocketDown = connectionState !== "connected";
  const canShowReactionFab =
    liveState.phase === "waiting" &&
    Boolean(
      liveState.sessionId &&
        liveState.participantId &&
        liveState.participantToken
    );

  const handleReaction = useCallback(
    (emoji: AllowedReaction) => {
      if (
        liveState.phase !== "waiting" ||
        !liveState.sessionId ||
        !liveState.participantToken
      ) {
        return;
      }

      setLiveState((prev) => ({ ...prev, error: null }));
      sendReaction({
        sessionId: liveState.sessionId,
        participantToken: liveState.participantToken,
        emoji,
      });
    },
    [
      liveState.participantToken,
      liveState.phase,
      liveState.sessionId,
      sendReaction,
    ]
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        ...getPresentationThemeVars(liveState.themeKey),
        backgroundColor: "color-mix(in srgb, var(--presentation-bg) 88%, var(--presentation-accent) 12%)",
        color: "var(--presentation-fg)",
      }}
    >
      <ReconnectingBanner state={connectionState} />

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo / session identity */}
          <div className="mb-6 text-center">
            <span
              className="font-heading text-2xl font-bold"
              style={{ color: "var(--presentation-accent)" }}
            >
              Qaskly
            </span>
            <p className="mt-1 text-sm opacity-70">Sala: {code}</p>
          </div>

          {liveState.error && (
            <div
              className="mb-4 rounded-lg border border-danger/20 bg-danger-light/20 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {liveState.error}
            </div>
          )}

          {/* State views */}
          {liveState.phase === "joining" && <JoiningView />}
          {liveState.phase === "waiting" && <WaitingView />}
          {liveState.phase === "between_slides" && <BetweenSlidesView />}
          {liveState.phase === "thank_you" && <ThankYouView />}

          {liveState.phase === "answering" && liveState.currentSlide && (
            <AnsweringView
              slide={liveState.currentSlide}
              onSubmit={handleSubmit}
              loading={liveState.submitPending}
              disabled={isSocketDown || liveState.submitPending}
            />
          )}

          {liveState.phase === "submitted" && (
            <SubmittedView />
          )}

          {liveState.phase === "closed" && liveState.currentSlide && (
            <ClosedView />
          )}

          {liveState.phase === "error" && !liveState.error && (
            <ErrorView code={code} />
          )}
        </div>
      </main>

      {canShowReactionFab && (
        <AudienceReactionFab
          disabled={isSocketDown}
          onSend={handleReaction}
        />
      )}
    </div>
  );
}

function determinePhase(
  code: string,
  currentSlide: SlideViewModel | undefined,
  responsesOpen: boolean
): AudiencePhase {
  if (!currentSlide) return "waiting";
  if (hasSubmittedSlide(code, currentSlide.id)) return "submitted";
  if (responsesOpen) return "answering";
  return "closed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReactionThrottleMessage(message: string): boolean {
  return message.toLowerCase().includes("reactions are being sent too quickly");
}

function JoiningView() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-base font-medium text-gray-700">Uniéndose a la sala…</p>
    </div>
  );
}

function WaitingView() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
        <Clock className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Esperando al presentador
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          La sesión comenzará en breve. Mantén esta pantalla abierta.
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-primary/40" aria-hidden="true" />
    </div>
  );
}

function BetweenSlidesView() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-light">
        <Clock className="h-7 w-7 text-secondary" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Preparando siguiente pregunta
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Espera un momento…
        </p>
      </div>
      <Loader2 className="h-5 w-5 animate-spin text-secondary/40" aria-hidden="true" />
    </div>
  );
}

interface AnsweringViewProps {
  slide: SlideViewModel;
  onSubmit: (response: unknown) => void;
  loading?: boolean;
  disabled?: boolean;
}

function AnsweringView({ slide, onSubmit, loading, disabled }: AnsweringViewProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
          Pregunta
        </p>
        <h1 className="text-xl font-semibold leading-snug text-gray-900">
          {slide.prompt}
        </h1>
      </div>
      <AudienceResponseForm
        slide={slide}
        onSubmit={onSubmit}
        loading={loading}
        disabled={disabled}
      />
    </div>
  );
}

function SubmittedView() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-success/20 bg-success-light/20 p-8 text-center">
      <CheckCircle className="h-12 w-12 text-success" aria-hidden="true" />
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Respuesta enviada
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Espera al presentador para la siguiente pregunta.
        </p>
      </div>
    </div>
  );
}

function ClosedView() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <MessageSquare className="h-12 w-12 text-gray-300" aria-hidden="true" />
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Pregunta cerrada
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Ya no es posible responder. Espera la siguiente.
        </p>
      </div>
    </div>
  );
}

function ThankYouView() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-primary-light bg-surface-subtle p-8 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient">
        <CheckCircle className="h-8 w-8 text-white" aria-hidden="true" />
      </div>
      <div>
        <h1 className="font-heading text-xl font-bold text-gray-900">
          ¡Gracias por participar!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          La sesión ha finalizado. Tus respuestas fueron registradas.
        </p>
      </div>
    </div>
  );
}

function ErrorView({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-danger/20 bg-danger-light/10 p-8 text-center">
      <p className="text-base font-semibold text-danger">
        No se pudo unir a la sala «{code}»
      </p>
      <p className="text-sm text-gray-500">
        Verifica que el código sea correcto y la sesión esté activa.
      </p>
    </div>
  );
}
