import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { JoinSessionDto } from "./dto/participant.dto.js";
import {
  type ParticipantJoinResponse,
  type PublicSessionResponse,
  ParticipantsService
} from "./participants.service.js";

@Controller("public/sessions/:code")
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  getPublicSession(
    @Param("code") code: string
  ): Promise<PublicSessionResponse> {
    return this.participantsService.getPublicSession(code);
  }

  @Post("join")
  join(
    @Param("code") code: string,
    @Body() dto: JoinSessionDto
  ): Promise<ParticipantJoinResponse> {
    return this.participantsService.join(code, dto);
  }
}
