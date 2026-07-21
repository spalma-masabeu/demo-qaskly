import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentPresenterUser } from "../auth/current-presenter.decorator.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import {
  CreatePresentationDto,
  ListPresentationsQueryDto,
  UpdatePresentationDto
} from "./dto/presentation.dto.js";
import {
  type PaginatedPresentationsResponse,
  type PresentationResponse,
  type PresentationWithSlidesResponse,
  PresentationsService
} from "./presentations.service.js";

@Controller("presentations")
@UseGuards(AuthGuard)
export class PresentationsController {
  constructor(private readonly presentationsService: PresentationsService) {}

  @Post()
  create(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Body() dto: CreatePresentationDto
  ): Promise<PresentationResponse> {
    return this.presentationsService.create(presenter, dto);
  }

  @Get()
  list(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Query() query: ListPresentationsQueryDto
  ): Promise<PaginatedPresentationsResponse> {
    return this.presentationsService.list(presenter, query);
  }

  @Get(":id")
  get(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<PresentationWithSlidesResponse> {
    return this.presentationsService.getOwned(presenter, id);
  }

  @Patch(":id")
  update(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Body() dto: UpdatePresentationDto
  ): Promise<PresentationResponse> {
    return this.presentationsService.update(presenter, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<void> {
    await this.presentationsService.delete(presenter, id);
  }

  @Post(":id/duplicate")
  duplicate(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<PresentationWithSlidesResponse> {
    return this.presentationsService.duplicate(presenter, id);
  }
}
