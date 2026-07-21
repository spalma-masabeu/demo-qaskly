import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { LiveSessionEventsModule } from "../realtime/live-session-events.module.js";
import { SessionsController } from "./sessions.controller.js";
import { SessionCodeService } from "./session-code.service.js";
import { SessionsService } from "./sessions.service.js";

@Module({
  imports: [AuthModule, LiveSessionEventsModule],
  controllers: [SessionsController],
  providers: [SessionCodeService, SessionsService],
  exports: [SessionCodeService, SessionsService]
})
export class SessionsModule {}
