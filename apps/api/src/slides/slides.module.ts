import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { SlidesController } from "./slides.controller.js";
import { SlidesService } from "./slides.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SlidesController],
  providers: [SlidesService],
  exports: [SlidesService]
})
export class SlidesModule {}
