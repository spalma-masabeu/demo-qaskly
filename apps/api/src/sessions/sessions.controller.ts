import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import { CurrentPresenterUser } from "../auth/current-presenter.decorator.js";
import { AuthGuard } from "../auth/auth.guard.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { LiveSessionEventsService } from "../realtime/live-session-events.service.js";
import {
  CloseSlideDto,
  EndSessionDto,
  StartSlideDto
} from "./dto/session.dto.js";
import {
  type SessionResponse,
  SessionsService
} from "./sessions.service.js";

@Controller()
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly liveSessionEvents: LiveSessionEventsService
  ) {}

  @Post("presentations/:presentationId/sessions")
  create(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("presentationId") presentationId: string
  ): Promise<SessionResponse> {
    return this.sessionsService.create(presenter, presentationId);
  }

  @Get("presentations/:presentationId/sessions/active")
  getActiveForPresentation(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("presentationId") presentationId: string
  ): Promise<SessionResponse> {
    return this.sessionsService.getLatestForPresentation(
      presenter,
      presentationId
    );
  }

  @Get("sessions/:id")
  get(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<SessionResponse> {
    return this.sessionsService.getOwned(presenter, id);
  }

  @Post("sessions/:id/start")
  @HttpCode(200)
  start(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<SessionResponse> {
    return this.sessionsService.start(presenter, id).then((session) => {
      this.liveSessionEvents.emitSlideStarted(session);
      return session;
    });
  }

  @Post("sessions/:id/start-slide")
  @HttpCode(200)
  startSlide(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Body() dto: StartSlideDto
  ): Promise<SessionResponse> {
    return this.sessionsService.startSlide(presenter, id, dto).then((session) => {
      this.liveSessionEvents.emitSlideStarted(session);
      return session;
    });
  }

  @Post("sessions/:id/close-slide")
  @HttpCode(200)
  closeSlide(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Body() dto: CloseSlideDto
  ): Promise<SessionResponse> {
    return this.sessionsService.closeSlide(presenter, id, dto).then((session) => {
      if (session.currentSlideId !== null) {
        this.liveSessionEvents.emitSlideClosed(session.id, session.currentSlideId);
      }
      return session;
    });
  }

  @Post("sessions/:id/next-slide")
  @HttpCode(200)
  nextSlide(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<SessionResponse> {
    return this.sessionsService.nextSlide(presenter, id).then((session) => {
      if (session.currentState === "ended") {
        this.liveSessionEvents.emitSessionEnded(session);
      } else {
        this.liveSessionEvents.emitSlideStarted(session);
      }
      return session;
    });
  }

  @Post("sessions/:id/end")
  @HttpCode(200)
  end(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Body() dto: EndSessionDto
  ): Promise<SessionResponse> {
    return this.sessionsService.end(presenter, id, dto).then((session) => {
      this.liveSessionEvents.emitSessionEnded(session);
      return session;
    });
  }
}
