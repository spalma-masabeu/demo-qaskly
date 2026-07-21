import { io, type Socket } from "socket.io-client";
import type { SlideViewModel, SlideResult } from "@/lib/api/types";

// ---------- Payload types ----------

export interface JoinSessionPayload {
  code: string;
  participantToken?: string;
  displayName?: string;
}

export interface SubmitResponsePayload {
  sessionId: string;
  slideId: string;
  participantToken: string;
  value: Record<string, unknown>;
}

export interface SendReactionPayload {
  sessionId: string;
  participantToken: string;
  emoji: string;
}

export interface PresenterSessionPayload {
  sessionId: string;
}

export interface SessionJoinedPayload {
  sessionId: string;
  participantId: string;
  participantToken: string;
  currentSlide?: SlideViewModel | null;
  responsesOpen: boolean;
  currentState?: "waiting" | "active" | "closed" | "ended";
}

export interface ParticipantJoinedPayload {
  participantCount: number;
}

export interface ParticipantLeftPayload {
  participantCount: number;
}

export interface SlideStartedPayload {
  sessionId: string;
  slide: SlideViewModel;
  responsesOpen?: boolean;
}

export interface SlideClosedPayload {
  sessionId: string;
  slideId: string;
  result?: SlideResult;
}

export interface ResponseSubmittedPayload {
  sessionId: string;
  slideId: string;
  responseId: string;
}

export interface ResponseReceivedPayload {
  sessionId?: string;
  slideId: string;
  responseCount?: number;
  responseId?: string;
}

export interface ResultsUpdatedPayload {
  slideId: string;
  results: SlideResult | null;
}

export interface ReactionReceivedPayload {
  sessionId: string;
  participantId: string;
  emoji: string;
}

export interface SessionEndedPayload {
  sessionId: string;
  reason?: "COMPLETED" | "MANUAL" | "ERROR";
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}

// ---------- Typed socket events ----------

interface ServerToClientEvents {
  presenter_session_joined: (data: { session: unknown }) => void;
  session_joined: (data: SessionJoinedPayload) => void;
  participant_joined: (data: ParticipantJoinedPayload) => void;
  participant_left: (data: ParticipantLeftPayload) => void;
  slide_started: (data: SlideStartedPayload) => void;
  slide_closed: (data: SlideClosedPayload) => void;
  response_submitted: (data: ResponseSubmittedPayload) => void;
  response_received: (data: ResponseReceivedPayload) => void;
  results_updated: (data: ResultsUpdatedPayload) => void;
  reaction_received: (data: ReactionReceivedPayload) => void;
  session_ended: (data: SessionEndedPayload) => void;
  error: (data: SocketErrorPayload) => void;
}

interface ClientToServerEvents {
  join_presenter_session: (data: PresenterSessionPayload) => void;
  join_session: (data: JoinSessionPayload) => void;
  leave_session: (data: {
    sessionId: string;
    participantId: string;
    participantToken: string;
  }) => void;
  submit_response: (data: SubmitResponsePayload) => void;
  send_reaction: (data: SendReactionPayload) => void;
}

export type QasklySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
let sharedSocket: QasklySocket | null = null;

export function createSocketClient(options: { authToken?: string } = {}): QasklySocket {
  if (sharedSocket) return sharedSocket;
  sharedSocket = io(WS_URL, {
    transports: ["polling"],
    autoConnect: false,
    auth: options.authToken ? { token: options.authToken } : undefined,
    query: options.authToken ? { token: options.authToken } : undefined,
  }) as QasklySocket;
  return sharedSocket;
}
