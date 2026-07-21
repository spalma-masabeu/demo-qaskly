import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentPresenterUser } from "../auth/current-presenter.decorator.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import {
  type ResultLogResponse,
  type SessionResultsResponse,
  type SlideResultResponse,
  ResultsService
} from "./results.service.js";

@Controller()
@UseGuards(AuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get("presentations/:presentationId/sessions")
  listPresentationResultLogs(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("presentationId") presentationId: string
  ): Promise<ResultLogResponse[]> {
    return this.resultsService.listOwnedPresentationResultLogs(
      presenter,
      presentationId
    );
  }

  @Get("sessions/:id/results")
  getSessionResults(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<SessionResultsResponse> {
    return this.resultsService.getOwnedSessionResults(presenter, id);
  }

  @Get("sessions/:id/slides/:slideId/results")
  getSlideResults(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Param("slideId") slideId: string
  ): Promise<SlideResultResponse> {
    return this.resultsService.getOwnedSlideResult(presenter, id, slideId);
  }
}
