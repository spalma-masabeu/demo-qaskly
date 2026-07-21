import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ParticipantsModule } from "../participants/participants.module.js";
import { ResponsesModule } from "../responses/responses.module.js";
import { ResultsModule } from "../results/results.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { LiveSessionEventsModule } from "./live-session-events.module.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Module({
  imports: [
    AuthModule,
    SessionsModule,
    ParticipantsModule,
    ResponsesModule,
    ResultsModule,
    LiveSessionEventsModule
  ],
  providers: [RealtimeGateway]
})
export class RealtimeModule {}
