import { Body, Controller, Param, Post } from "@nestjs/common";
import { SubmitReactionDto } from "./dto/reaction.dto.js";
import { SubmitResponseDto } from "./dto/response.dto.js";
import {
  type SubmitReactionResult,
  ReactionsService
} from "./reactions.service.js";
import { LiveSessionEventsService } from "../realtime/live-session-events.service.js";
import { ResultsService } from "../results/results.service.js";
import {
  type SubmitResponseResult,
  ResponsesService
} from "./responses.service.js";

@Controller("public/sessions/:code")
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly reactionsService: ReactionsService,
    private readonly resultsService: ResultsService,
    private readonly liveSessionEvents: LiveSessionEventsService
  ) {}

  @Post("responses")
  async submit(
    @Param("code") code: string,
    @Body() dto: SubmitResponseDto
  ): Promise<SubmitResponseResult> {
    const response = await this.responsesService.submitByCode(code, dto);
    this.liveSessionEvents.emitResponseAccepted({
      sessionId: response.sessionId,
      slideId: response.slideId,
      responseId: response.id,
      results: await this.resultsService.getSlideResultForSession(
        response.sessionId,
        response.slideId
      )
    });
    return response;
  }

  @Post("reactions")
  submitReaction(
    @Param("code") code: string,
    @Body() dto: SubmitReactionDto
  ): Promise<SubmitReactionResult> {
    return this.reactionsService.submitByCode(code, dto);
  }
}
