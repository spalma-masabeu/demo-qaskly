"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createSocketClient,
  type QasklySocket,
  type JoinSessionPayload,
  type PresenterSessionPayload,
  type SendReactionPayload,
  type SubmitResponsePayload,
  type SessionJoinedPayload,
  type ParticipantJoinedPayload,
  type ParticipantLeftPayload,
  type SlideStartedPayload,
  type SlideClosedPayload,
  type ResponseSubmittedPayload,
  type ResponseReceivedPayload,
  type ResultsUpdatedPayload,
  type ReactionReceivedPayload,
  type SessionEndedPayload,
  type SocketErrorPayload,
} from "@/lib/realtime/socket-client";

export type SocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "disconnected";

export interface UseLiveSocketOptions {
  authToken?: string;
  onSessionJoined?: (data: SessionJoinedPayload) => void;
  onParticipantJoined?: (data: ParticipantJoinedPayload) => void;
  onParticipantLeft?: (data: ParticipantLeftPayload) => void;
  onSlideStarted?: (data: SlideStartedPayload) => void;
  onSlideClosed?: (data: SlideClosedPayload) => void;
  onResponseSubmitted?: (data: ResponseSubmittedPayload) => void;
  onResponseReceived?: (data: ResponseReceivedPayload) => void;
  onResultsUpdated?: (data: ResultsUpdatedPayload) => void;
  onReactionReceived?: (data: ReactionReceivedPayload) => void;
  onSessionEnded?: (data: SessionEndedPayload) => void;
  onError?: (data: SocketErrorPayload) => void;
}

export function useLiveSocket(options: UseLiveSocketOptions = {}) {
  const socketRef = useRef<QasklySocket | null>(null);
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("idle");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = createSocketClient({ authToken: options.authToken });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
    });
    socket.on("disconnect", () => {
      setConnectionState("reconnecting");
    });
    socket.on("connect_error", () => {
      setConnectionState("error");
    });

    socket.on("session_joined", (data) => {
      optionsRef.current.onSessionJoined?.(data);
    });
    socket.on("participant_joined", (data) =>
      optionsRef.current.onParticipantJoined?.(data)
    );
    socket.on("participant_left", (data) =>
      optionsRef.current.onParticipantLeft?.(data)
    );
    socket.on("slide_started", (data) => {
      optionsRef.current.onSlideStarted?.(data);
    });
    socket.on("slide_closed", (data) => {
      optionsRef.current.onSlideClosed?.(data);
    });
    socket.on("response_submitted", (data) => {
      optionsRef.current.onResponseSubmitted?.(data);
    });
    socket.on("response_received", (data) =>
      optionsRef.current.onResponseReceived?.(data)
    );
    socket.on("results_updated", (data) =>
      optionsRef.current.onResultsUpdated?.(data)
    );
    socket.on("reaction_received", (data) =>
      optionsRef.current.onReactionReceived?.(data)
    );
    socket.on("session_ended", (data) =>
      optionsRef.current.onSessionEnded?.(data)
    );
    socket.on("error", (data) => {
      optionsRef.current.onError?.(data);
    });

    socket.connect();
    setConnectionState("connecting");

    return () => {
      socketRef.current = null;
    };
  }, [options.authToken]);

  const joinPresenterSession = useCallback((payload: PresenterSessionPayload) => {
    socketRef.current?.emit("join_presenter_session", payload);
  }, []);

  const joinSession = useCallback((payload: JoinSessionPayload) => {
    socketRef.current?.emit("join_session", payload);
  }, []);

  const leaveSession = useCallback(
    (payload: {
      sessionId: string;
      participantId: string;
      participantToken: string;
    }) => {
      socketRef.current?.emit("leave_session", payload);
    },
    []
  );

  const submitResponse = useCallback((payload: SubmitResponsePayload) => {
    socketRef.current?.emit("submit_response", payload);
  }, []);

  const sendReaction = useCallback((payload: SendReactionPayload) => {
    socketRef.current?.emit("send_reaction", payload);
  }, []);

  return {
    connectionState,
    joinPresenterSession,
    joinSession,
    leaveSession,
    submitResponse,
    sendReaction,
  };
}
