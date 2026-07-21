import {
  ConnectedSocket,
  OnGatewayInit,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketServer,
  WebSocketGateway
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service.js";
import type { CurrentPresenter, PresenterRequest } from "../auth/auth.types.js";
import {
  domainErrors,
  isDomainError,
  toErrorResponseBody
} from "../common/domain-errors.js";
import { ParticipantsService } from "../participants/participants.service.js";
import { ReactionsService } from "../responses/reactions.service.js";
import { ResponsesService } from "../responses/responses.service.js";
import { ResultsService } from "../results/results.service.js";
import { LiveSessionEventsService } from "./live-session-events.service.js";
import type { EndedReasonValue } from "../sessions/dto/session.dto.js";
import {
  type SessionResponse,
  SessionsService
} from "../sessions/sessions.service.js";

interface ConnectedPayload {
  message: "connected";
}

interface PongPayload {
  message: "pong";
  timestamp: string;
}

interface PresenterSessionPayload {
  sessionId: string;
}

interface PresenterSlidePayload extends PresenterSessionPayload {
  slideId: string;
}

interface PresenterEndPayload extends PresenterSessionPayload {
  reason?: EndedReasonValue;
}

interface AudienceJoinPayload {
  code: string;
  participantToken?: string;
  displayName?: string;
}

interface AudienceLeavePayload {
  sessionId: string;
  participantId: string;
  participantToken: string;
}

interface AudienceSubmitResponsePayload {
  sessionId: string;
  slideId: string;
  participantToken: string;
  value: Record<string, unknown>;
}

interface AudienceSendReactionPayload {
  sessionId: string;
  participantToken: string;
  emoji: string;
}

interface RealtimeSocket {
  handshake: {
    headers: Record<string, string | string[] | undefined>;
    auth?: Record<string, unknown>;
  };
  emit(event: string, payload: unknown): void;
  join(room: string): void;
  leave(room: string): void;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private server?: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly participantsService: ParticipantsService,
    private readonly responsesService: ResponsesService,
    private readonly reactionsService: ReactionsService,
    private readonly resultsService: ResultsService,
    private readonly liveSessionEvents: LiveSessionEventsService
  ) {}

  afterInit(server: Server): void {
    this.liveSessionEvents.setServer(server);
  }

  handleConnection(client: Socket): void {
    if (this.server !== undefined) {
      this.liveSessionEvents.setServer(this.server);
    }
    const payload: ConnectedPayload = {
      message: "connected"
    };

    client.emit("connected", payload);
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket): void {
    const payload: PongPayload = {
      message: "pong",
      timestamp: new Date().toISOString()
    };

    client.emit("pong", payload);
  }

  @SubscribeMessage("join_presenter_session")
  async handlePresenterJoin(
    @MessageBody() payload: PresenterSessionPayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handlePresenterCommand(client, async (presenter) => {
      const session = await this.sessionsService.getOwned(
        presenter,
        payload.sessionId
      );
      client.join(presenterRoom(payload.sessionId));
      client.emit("presenter_session_joined", { session });
    });
  }

  @SubscribeMessage("start_slide")
  async handleStartSlide(
    @MessageBody() payload: PresenterSlidePayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handlePresenterCommand(client, async (presenter) => {
      const session = await this.sessionsService.startSlide(
        presenter,
        payload.sessionId,
        { slideId: payload.slideId }
      );
      this.emitToPresenterAndAudience(payload.sessionId, "slide_started", {
        sessionId: payload.sessionId,
        slide: session.currentSlide
      });
    });
  }

  @SubscribeMessage("close_slide")
  async handleCloseSlide(
    @MessageBody() payload: PresenterSlidePayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handlePresenterCommand(client, async (presenter) => {
      await this.sessionsService.closeSlide(presenter, payload.sessionId, {
        slideId: payload.slideId
      });
      this.emitToPresenterAndAudience(payload.sessionId, "slide_closed", {
        sessionId: payload.sessionId,
        slideId: payload.slideId
      });
    });
  }

  @SubscribeMessage("next_slide")
  async handleNextSlide(
    @MessageBody() payload: PresenterSessionPayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handlePresenterCommand(client, async (presenter) => {
      const session = await this.sessionsService.nextSlide(
        presenter,
        payload.sessionId
      );
      if (session.currentState === "ended") {
        this.emitSessionEnded(payload.sessionId, session);
        return;
      }
      this.emitToPresenterAndAudience(payload.sessionId, "slide_started", {
        sessionId: payload.sessionId,
        slide: session.currentSlide
      });
    });
  }

  @SubscribeMessage("end_session")
  async handleEndSession(
    @MessageBody() payload: PresenterEndPayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handlePresenterCommand(client, async (presenter) => {
      const session = await this.sessionsService.end(
        presenter,
        payload.sessionId,
        { reason: payload.reason }
      );
      this.emitSessionEnded(payload.sessionId, session);
    });
  }

  @SubscribeMessage("join_session")
  async handleAudienceJoin(
    @MessageBody() payload: AudienceJoinPayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handleAudienceCommand(client, async () => {
      const joined = await this.participantsService.join(payload.code, {
        participantToken: payload.participantToken,
        displayName: payload.displayName
      });
      client.join(audienceRoom(joined.sessionId));
      client.join(allRoom(joined.sessionId));
      client.emit("session_joined", joined);
      const participantCount = await this.participantsService.markParticipantPresent(
        joined.sessionId,
        joined.participantId
      );
      this.emitToRoom(presenterRoom(joined.sessionId), "participant_joined", {
        sessionId: joined.sessionId,
        participantCount
      });
    });
  }

  @SubscribeMessage("leave_session")
  async handleAudienceLeave(
    @MessageBody() payload: AudienceLeavePayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handleAudienceCommand(client, async () => {
      const participantCount = await this.participantsService.markParticipantLeft(
        payload.sessionId,
        payload.participantId,
        payload.participantToken
      );
      client.leave(audienceRoom(payload.sessionId));
      client.leave(allRoom(payload.sessionId));
      this.emitToRoom(presenterRoom(payload.sessionId), "participant_left", {
        sessionId: payload.sessionId,
        participantCount
      });
    });
  }

  @SubscribeMessage("submit_response")
  async handleAudienceSubmitResponse(
    @MessageBody() payload: AudienceSubmitResponsePayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handleAudienceCommand(client, async () => {
      const response = await this.responsesService.submitBySession(
        payload.sessionId,
        {
          participantToken: payload.participantToken,
          slideId: payload.slideId,
          value: payload.value
        }
      );
      client.emit("response_submitted", {
        sessionId: response.sessionId,
        slideId: response.slideId,
        responseId: response.id
      });
      this.liveSessionEvents.emitResponseAccepted({
        sessionId: response.sessionId,
        slideId: response.slideId,
        responseId: response.id,
        results: await this.resultsService.getSlideResultForSession(
          response.sessionId,
          response.slideId
        )
      });
    });
  }

  @SubscribeMessage("send_reaction")
  async handleAudienceSendReaction(
    @MessageBody() payload: AudienceSendReactionPayload,
    @ConnectedSocket() client: RealtimeSocket
  ): Promise<void> {
    await this.handleAudienceCommand(client, async () => {
      const reaction = await this.reactionsService.submitBySession(
        payload.sessionId,
        {
          participantToken: payload.participantToken,
          emoji: payload.emoji
        }
      );
      this.emitToRoom(presenterRoom(reaction.sessionId), "reaction_received", {
        sessionId: reaction.sessionId,
        participantId: reaction.participantId,
        emoji: reaction.emoji
      });
    });
  }

  private async handlePresenterCommand(
    client: RealtimeSocket,
    command: (presenter: CurrentPresenter) => Promise<void>
  ): Promise<void> {
    try {
      const presenter = await this.authService.resolvePresenter(
        socketRequest(client)
      );
      if (presenter === null) {
        throw domainErrors.unauthenticatedPresenter();
      }
      await command(presenter);
    } catch (error) {
      if (isDomainError(error)) {
        client.emit("error", toErrorResponseBody(error));
        return;
      }
      client.emit("error", {
        code: "VALIDATION_ERROR",
        message: "Unexpected realtime command error"
      });
    }
  }

  private async handleAudienceCommand(
    client: RealtimeSocket,
    command: () => Promise<void>
  ): Promise<void> {
    try {
      await command();
    } catch (error) {
      if (isDomainError(error)) {
        client.emit("error", toErrorResponseBody(error));
        return;
      }
      client.emit("error", {
        code: "VALIDATION_ERROR",
        message: "Unexpected realtime command error"
      });
    }
  }

  private emitToPresenterAndAudience(
    sessionId: string,
    event: string,
    payload: unknown
  ): void {
    this.emitToRoom(audienceRoom(sessionId), event, payload);
    this.emitToRoom(presenterRoom(sessionId), event, payload);
  }

  private emitSessionEnded(sessionId: string, session: SessionResponse): void {
    this.emitToPresenterAndAudience(sessionId, "session_ended", {
      sessionId,
      reason: session.endedReason
    });
  }

  private emitToRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }
}

function socketRequest(client: RealtimeSocket): PresenterRequest {
  const headers = { ...client.handshake.headers };
  const token = client.handshake.auth?.token;
  if (typeof token === "string" && headers.authorization === undefined) {
    headers.authorization = `Bearer ${token}`;
  }
  const testPresenter = client.handshake.auth?.testPresenter;
  if (
    typeof testPresenter === "string" &&
    headers["x-test-presenter"] === undefined
  ) {
    headers["x-test-presenter"] = testPresenter;
  }

  return {
    headers
  };
}

function presenterRoom(sessionId: string): string {
  return `session:${sessionId}:presenter`;
}

function audienceRoom(sessionId: string): string {
  return `session:${sessionId}:audience`;
}

function allRoom(sessionId: string): string {
  return `session:${sessionId}:all`;
}
