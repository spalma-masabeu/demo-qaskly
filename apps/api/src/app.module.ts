import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { ParticipantsModule } from "./participants/participants.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PresentationsModule } from "./presentations/presentations.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";
import { ResponsesModule } from "./responses/responses.module.js";
import { ResultsModule } from "./results/results.module.js";
import { SessionsModule } from "./sessions/sessions.module.js";
import { SlidesModule } from "./slides/slides.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ["../../.env", ".env"],
      isGlobal: true
    }),
    HealthModule,
    PrismaModule,
    RedisModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    PresentationsModule,
    SlidesModule,
    SessionsModule,
    ParticipantsModule,
    ResponsesModule,
    ResultsModule
  ]
})
export class AppModule {}
