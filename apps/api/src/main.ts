import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { DomainErrorFilter } from "./common/domain-error.filter.js";
import { createApiValidationPipe } from "./common/validation.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const port = Number(process.env.PORT ?? 3001);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: frontendUrl,
    credentials: true
  });
  app.useGlobalPipes(createApiValidationPipe());
  app.useGlobalFilters(new DomainErrorFilter());

  await app.listen(port);
}

void bootstrap();
