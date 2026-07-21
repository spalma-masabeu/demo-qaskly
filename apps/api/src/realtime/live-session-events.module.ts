import { Global, Module } from "@nestjs/common";
import { LiveSessionEventsService } from "./live-session-events.service.js";

@Global()
@Module({
  providers: [LiveSessionEventsService],
  exports: [LiveSessionEventsService]
})
export class LiveSessionEventsModule {}
