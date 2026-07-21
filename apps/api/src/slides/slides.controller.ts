import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentPresenterUser } from "../auth/current-presenter.decorator.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import {
  CreateSlideDto,
  ReorderSlidesDto,
  UpdateSlideDto
} from "./dto/slide.dto.js";
import { type SlideResponse, SlidesService } from "./slides.service.js";

@UseGuards(AuthGuard)
@Controller()
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  @Post("presentations/:presentationId/slides")
  create(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("presentationId") presentationId: string,
    @Body() dto: CreateSlideDto
  ): Promise<SlideResponse> {
    return this.slidesService.create(presenter, presentationId, dto);
  }

  @Patch("slides/:id")
  update(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string,
    @Body() dto: UpdateSlideDto
  ): Promise<SlideResponse> {
    return this.slidesService.update(presenter, id, dto);
  }

  @Delete("slides/:id")
  @HttpCode(204)
  async delete(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("id") id: string
  ): Promise<void> {
    await this.slidesService.delete(presenter, id);
  }

  @Patch("presentations/:presentationId/slides/reorder")
  reorder(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Param("presentationId") presentationId: string,
    @Body() dto: ReorderSlidesDto
  ): Promise<SlideResponse[]> {
    return this.slidesService.reorder(presenter, presentationId, dto);
  }
}
