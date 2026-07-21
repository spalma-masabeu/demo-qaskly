import { Injectable } from "@nestjs/common";
import type { SlideResult } from "@qaskly/shared";
import type { Server } from "socket.io";
import type { SessionResponse } from "../sessions/sessions.service.js";

@Injectable()
export class LiveSessionEventsService {
  private server?: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitSlideStarted(session: SessionResponse): void {
    if (session.currentSlide === null) {
      return;
    }
    this.emitToPresenterAndAudience(session.id, "slide_started", {
      sessionId: session.id,
      slide: session.currentSlide,
      responsesOpen: session.responsesOpen
    });
  }

  emitSlideClosed(sessionId: string, slideId: string): void {
    this.emitToPresenterAndAudience(sessionId, "slide_closed", {
      sessionId,
      slideId
    });
  }

  emitSessionEnded(session: SessionResponse): void {
    this.emitToPresenterAndAudience(session.id, "session_ended", {
      sessionId: session.id,
      reason: session.endedReason
    });
  }

  emitResponseAccepted(payload: {
    sessionId: string;
    slideId: string;
    responseId: string;
    results: SlideResult;
  }): void {
    const responseCount = resultTotalResponses(payload.results);
    this.emitToRoom(presenterRoom(payload.sessionId), "response_received", {
      sessionId: payload.sessionId,
      slideId: payload.slideId,
      responseId: payload.responseId,
      ...(responseCount === undefined ? {} : { responseCount })
    });
    this.emitToRoom(presenterRoom(payload.sessionId), "results_updated", {
      sessionId: payload.sessionId,
      slideId: payload.slideId,
      results: payload.results
    });
  }

  private emitToPresenterAndAudience(
    sessionId: string,
    event: string,
    payload: unknown
  ): void {
    this.emitToRoom(audienceRoom(sessionId), event, payload);
    this.emitToRoom(presenterRoom(sessionId), event, payload);
  }

  private emitToRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }
}

function presenterRoom(sessionId: string): string {
  return `session:${sessionId}:presenter`;
}

function audienceRoom(sessionId: string): string {
  return `session:${sessionId}:audience`;
}

function resultTotalResponses(result: SlideResult): number | undefined {
  const totalResponses = (result as { totalResponses?: unknown }).totalResponses;
  return typeof totalResponses === "number" ? totalResponses : undefined;
}
