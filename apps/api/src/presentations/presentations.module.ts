import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PresentationsController } from "./presentations.controller.js";
import { PresentationsService } from "./presentations.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService]
})
export class PresentationsModule {}
