import { Module } from "@nestjs/common";
import { ParticipantsModule } from "../participants/participants.module.js";
import { LiveSessionEventsModule } from "../realtime/live-session-events.module.js";
import { ResultsModule } from "../results/results.module.js";
import { ReactionsService } from "./reactions.service.js";
import { ResponsesController } from "./responses.controller.js";
import { ResponsesService } from "./responses.service.js";

@Module({
  imports: [ParticipantsModule, ResultsModule, LiveSessionEventsModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, ReactionsService],
  exports: [ResponsesService, ReactionsService]
})
export class ResponsesModule {}
