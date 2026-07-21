import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module.js";
import { DomainErrorFilter } from "../src/common/domain-error.filter.js";
import { createApiValidationPipe } from "../src/common/validation.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { RedisService } from "../src/redis/redis.service.js";

export interface ApiTestApp {
  app: INestApplication;
  module: TestingModule;
  prisma: PrismaService;
}

export interface CreateApiTestAppOptions {
  authTestBypass?: boolean;
  auth0Domain?: string;
  auth0Audience?: string;
  auth0JwksJson?: string;
}

export async function createApiTestApp(
  options: CreateApiTestAppOptions = {}
): Promise<ApiTestApp> {
  process.env.NODE_ENV = "test";
  process.env.AUTH_TEST_BYPASS =
    options.authTestBypass === false ? "false" : "true";
  process.env.AUTH0_DOMAIN = options.auth0Domain ?? "auth.test.local";
  process.env.AUTH0_AUDIENCE = options.auth0Audience ?? "qaskly-api-test";
  if (options.auth0JwksJson !== undefined) {
    process.env.AUTH0_JWKS_JSON = options.auth0JwksJson;
  } else {
    delete process.env.AUTH0_JWKS_JSON;
  }
  process.env.DATABASE_URL = (
    process.env.DATABASE_URL ??
    "postgresql://qaskly:qaskly@127.0.0.1:5432/qaskly"
  ).replace("localhost", "127.0.0.1");

  const module = await Test.createTestingModule({
    imports: [AppModule]
  })
    .overrideProvider(RedisService)
    .useValue(createFakeRedisService())
    .compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(createApiValidationPipe());
  app.useGlobalFilters(new DomainErrorFilter());

  await app.init();

  return {
    app,
    module,
    prisma: module.get(PrismaService)
  };
}

function createFakeRedisService(): Partial<RedisService> {
  const values = new Map<string, string>();

  return {
    getClient: () => ({}) as ReturnType<RedisService["getClient"]>,
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => {
      values.set(key, value);
      return "OK";
    },
    setWithTtl: async (key: string, value: string) => {
      values.set(key, value);
      return "OK";
    },
    increment: async (key: string) => {
      const next = Number(values.get(key) ?? "0") + 1;
      values.set(key, String(next));
      return next;
    },
    consumeTokenBucket: async (
      key: string,
      options: Parameters<RedisService["consumeTokenBucket"]>[1]
    ) => {
      const nowMs = options.nowMs ?? Date.now();
      let tokens = options.capacity;
      let updatedAt = nowMs;
      const raw = values.get(key);
      if (raw !== undefined) {
        const [storedTokens, storedUpdatedAt] = raw.split(":");
        tokens = Number(storedTokens);
        updatedAt = Number(storedUpdatedAt);
        if (!Number.isFinite(tokens) || !Number.isFinite(updatedAt)) {
          tokens = options.capacity;
          updatedAt = nowMs;
        }
        const elapsed = Math.max(0, nowMs - updatedAt);
        const refill = Math.floor(elapsed / options.refillIntervalMs);
        if (refill > 0) {
          tokens = Math.min(options.capacity, tokens + refill);
          updatedAt += refill * options.refillIntervalMs;
        }
      }
      const accepted = tokens > 0;
      if (accepted) {
        tokens -= 1;
      }
      values.set(key, `${tokens}:${updatedAt}`);
      return accepted;
    },
    delete: async (key: string) => (values.delete(key) ? 1 : 0),
    buildKey: (...parts: Array<string | number>) =>
      parts.map((part) => String(part)).join(":"),
    sessionStateKey: (sessionId: string) => `session:${sessionId}:state`,
    sessionCodeKey: (code: string) => `session-code:${code.toUpperCase()}`,
    participantTokenKey: (sessionId: string, tokenHash: string) =>
      `session:${sessionId}:participant:${tokenHash}`,
    audiencePresenceKey: (sessionId: string) =>
      `session:${sessionId}:audience:presence`,
    responseThrottleKey: (sessionId: string, participantId: string) =>
      `throttle:response:${sessionId}:${participantId}`,
    reactionThrottleKey: (sessionId: string, participantId: string) =>
      `throttle:reaction:${sessionId}:${participantId}`
  };
}
