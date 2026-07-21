import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentPresenterUser } from "../auth/current-presenter.decorator.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import {
  type PresenterProfileResponse,
  UsersService
} from "./users.service.js";

@Controller("me")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(
    @CurrentPresenterUser() presenter: CurrentPresenter
  ): PresenterProfileResponse {
    return this.usersService.toProfileResponse(presenter);
  }

  @Patch()
  updateMe(
    @CurrentPresenterUser() presenter: CurrentPresenter,
    @Body() dto: UpdateProfileDto
  ): Promise<PresenterProfileResponse> {
    return this.usersService.updateProfile(presenter, dto);
  }

  @Delete()
  @HttpCode(204)
  async deleteMe(
    @CurrentPresenterUser() presenter: CurrentPresenter
  ): Promise<void> {
    await this.usersService.deleteProfile(presenter);
  }
}
