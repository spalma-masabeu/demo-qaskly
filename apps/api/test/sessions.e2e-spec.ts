import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import {
  apiRequest,
  defaultPresenter,
  otherPresenter,
  withPresenter
} from "./auth.js";
import { SessionsService } from "../src/sessions/sessions.service.js";
import { createApiTestApp, type ApiTestApp } from "./app.js";
import { assertErrorContract } from "./assertions.js";
import {
  disconnectTestDatabase,
  insertTestPresentation,
  insertTestSlide,
  resetTestDatabase
} from "./database.js";

describe("sessions API", { concurrency: false }, () => {
  let testApp: ApiTestApp;
  let app: INestApplication;

  before(async () => {
    testApp = await createApiTestApp();
    app = testApp.app;
  });

  beforeEach(async () => {
    await resetTestDatabase(testApp.prisma);
  });

  after(async () => {
    await disconnectTestDatabase(testApp.prisma);
    await app.close();
  });

  async function presenterId(presenter = defaultPresenter): Promise<string> {
    const response = await withPresenter(
      apiRequest(app).get("/api/v1/me"),
      presenter
    ).expect(200);
    return response.body.id as string;
  }

  it("creates, starts, advances, closes, and completes an owned session", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const firstSlide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 1,
      prompt: "First"
    });
    const secondSlide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 2,
      prompt: "Second"
    });

    const created = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    assert.equal(created.body.presentationId, presentation.id);
    assert.equal(created.body.status, "CREATED");
    assert.equal(created.body.currentSlideId, null);
    assert.equal(created.body.responsesOpen, false);
    assert.match(created.body.code, /^[A-Z0-9]{6}$/);
    assert.match(created.body.joinUrl, new RegExp(`${created.body.code}$`));

    const started = await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/start`)
    ).expect(200);
    assert.equal(started.body.status, "LIVE");
    assert.equal(started.body.currentSlideId, firstSlide.id);
    assert.equal(started.body.currentState, "active");
    assert.equal(started.body.responsesOpen, true);
    assert.equal(started.body.currentSlide.id, firstSlide.id);
    assert.equal(typeof started.body.startedAt, "string");

    const active = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/start-slide`)
        .send({ slideId: firstSlide.id })
    ).expect(200);
    assert.equal(active.body.currentSlideId, firstSlide.id);
    assert.equal(active.body.responsesOpen, true);
    assert.equal(active.body.currentState, "active");
    assert.equal(active.body.currentSlide.id, firstSlide.id);

    const closed = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/close-slide`)
        .send({ slideId: firstSlide.id })
    ).expect(200);
    assert.equal(closed.body.currentSlideId, firstSlide.id);
    assert.equal(closed.body.responsesOpen, false);
    assert.equal(closed.body.currentState, "closed");

    const next = await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/next-slide`)
    ).expect(200);
    assert.equal(next.body.currentSlideId, secondSlide.id);
    assert.equal(next.body.responsesOpen, true);
    assert.equal(next.body.currentState, "active");

    const ended = await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/end`)
    ).expect(200);
    assert.equal(ended.body.status, "ENDED");
    assert.equal(ended.body.endedReason, "COMPLETED");
    assert.equal(ended.body.responsesOpen, false);
    assert.equal(ended.body.currentState, "ended");

    const fetched = await withPresenter(
      apiRequest(app).get(`/api/v1/sessions/${created.body.id}`)
    ).expect(200);
    assert.equal(fetched.body.status, "ENDED");
    assert.equal(fetched.body.endedReason, "COMPLETED");
  });

  it("returns the latest recoverable presentation session for presenter reconnect", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    await insertTestSlide(testApp.prisma, presentation.id, {
      position: 1,
      prompt: "Reconnect"
    });

    const first = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${first.body.id}/start`)
    ).expect(200);

    const latest = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const active = await withPresenter(
      apiRequest(app).get(
        `/api/v1/presentations/${presentation.id}/sessions/active`
      )
    ).expect(200);

    assert.equal(active.body.id, latest.body.id);
    assert.equal(active.body.status, "CREATED");
    assert.equal(active.body.currentState, "waiting");
  });

  it("enforces ownership when fetching a presentation active session", async () => {
    const ownerId = await presenterId();
    await presenterId(otherPresenter);
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    await insertTestSlide(testApp.prisma, presentation.id);
    await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const denied = await withPresenter(
      apiRequest(app).get(
        `/api/v1/presentations/${presentation.id}/sessions/active`
      ),
      otherPresenter
    ).expect(403);

    assertErrorContract(denied, { code: "FORBIDDEN_OWNER_ACTION" });
  });

  it("marks early presenter end as incomplete", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const firstSlide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 1
    });
    await insertTestSlide(testApp.prisma, presentation.id, { position: 2 });

    const created = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/start`)
    ).expect(200);
    await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/start-slide`)
        .send({ slideId: firstSlide.id })
    ).expect(200);

    const ended = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/end`)
        .send({ reason: "MANUAL" })
    ).expect(200);

    assert.equal(ended.body.status, "INCOMPLETE");
    assert.equal(ended.body.endedReason, "MANUAL");
    assert.equal(ended.body.currentState, "ended");
  });

  it("rejects invalid lifecycle transitions with API error contracts", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id);

    const created = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const startSlideBeforeLive = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/start-slide`)
        .send({ slideId: slide.id })
    ).expect(409);
    assertErrorContract(startSlideBeforeLive, { code: "VALIDATION_ERROR" });

    const closeWithoutActiveSlide = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${created.body.id}/close-slide`)
        .send({ slideId: slide.id })
    ).expect(409);
    assertErrorContract(closeWithoutActiveSlide, { code: "INACTIVE_SLIDE" });

    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/start`)
    ).expect(200);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/end`)
    ).expect(200);

    const restartEnded = await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/start`)
    ).expect(409);
    assertErrorContract(restartEnded, { code: "VALIDATION_ERROR" });
  });

  it("rejects ending a session before it has started", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    await insertTestSlide(testApp.prisma, presentation.id);

    const created = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const response = await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${created.body.id}/end`)
    ).expect(409);

    assertErrorContract(response, { code: "VALIDATION_ERROR" });
  });

  it("enforces presenter ownership for all session actions", async () => {
    const ownerId = await presenterId();
    await presenterId(otherPresenter);
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id);

    const createDenied = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`),
      otherPresenter
    ).expect(403);
    assertErrorContract(createDenied, { code: "FORBIDDEN_OWNER_ACTION" });

    const created = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const cases = [
      () => apiRequest(app).get(`/api/v1/sessions/${created.body.id}`),
      () => apiRequest(app).post(`/api/v1/sessions/${created.body.id}/start`),
      () =>
        apiRequest(app)
          .post(`/api/v1/sessions/${created.body.id}/start-slide`)
          .send({ slideId: slide.id }),
      () =>
        apiRequest(app)
          .post(`/api/v1/sessions/${created.body.id}/close-slide`)
          .send({ slideId: slide.id }),
      () =>
        apiRequest(app).post(`/api/v1/sessions/${created.body.id}/next-slide`),
      () => apiRequest(app).post(`/api/v1/sessions/${created.body.id}/end`)
    ];

    for (const buildRequest of cases) {
      const response = await withPresenter(
        buildRequest(),
        otherPresenter
      ).expect(403);
      assertErrorContract(response, { code: "FORBIDDEN_OWNER_ACTION" });
    }
  });

  it("requires at least one slide before creating a live session", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);

    const response = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(400);

    assertErrorContract(response, { code: "INVALID_SLIDE_CONFIG" });
  });

  it("retries session creation when room code insert races", async () => {
    const queryLog: string[] = [];
    let insertAttempts = 0;
    const redisWrites: Array<{ key: string; value: string }> = [];
    const prisma = {
      async $queryRaw(strings: TemplateStringsArray): Promise<unknown[]> {
        const sql = strings.join(" ");
        queryLog.push(sql);
        if (sql.includes('FROM "Presentation"')) {
          return [{ id: "presentation-1", ownerId: "presenter-1" }];
        }
        if (sql.includes("COUNT(*)")) {
          return [{ count: 1n }];
        }
        if (sql.includes('INSERT INTO "LiveSession"')) {
          insertAttempts += 1;
          if (insertAttempts === 1) {
            const error = new Error(
              'duplicate key value violates unique constraint "LiveSession_code_key"'
            ) as Error & { code: string };
            error.code = "23505";
            throw error;
          }
          return [
            {
              id: "session-1",
              presentationId: "presentation-1",
              ownerId: "presenter-1",
              code: "ROOM02",
              status: "CREATED",
              currentSlideId: null,
              responsesOpen: false,
              startedAt: null,
              endedAt: null,
              endedReason: null,
              createdAt: new Date("2026-06-17T00:00:00.000Z"),
              updatedAt: new Date("2026-06-17T00:00:00.000Z")
            }
          ];
        }
        throw new Error(`Unexpected query: ${sql}`);
      }
    };
    const redis = {
      sessionStateKey: (sessionId: string) => `session:${sessionId}:state`,
      setWithTtl: async (key: string, value: string) => {
        redisWrites.push({ key, value });
        return "OK";
      }
    };
    const sessionCodeService = {
      codes: ["ROOM01", "ROOM02"],
      async createUniqueCode() {
        return this.codes.shift() ?? "ROOM02";
      },
      joinUrlForCode: (code: string) => `http://localhost:3000/join/${code}`
    };
    const service = new SessionsService(
      prisma as never,
      redis as never,
      sessionCodeService as never
    );

    const response = await service.create(
      {
        id: "presenter-1",
        authProvider: "AUTH0",
        authSubject: "auth0|presenter-1",
        email: "presenter@example.com",
        name: "Presenter One",
        profession: null,
        birthday: null,
        usagePurpose: null,
        role: "PRESENTER",
        createdAt: new Date("2026-06-17T00:00:00.000Z"),
        updatedAt: new Date("2026-06-17T00:00:00.000Z")
      },
      "presentation-1"
    );

    assert.equal(insertAttempts, 2);
    assert.equal(response.code, "ROOM02");
    assert.equal(redisWrites[0]?.key, "session:session-1:state");
    assert.equal(
      queryLog.filter((sql) => sql.includes('INSERT INTO "LiveSession"')).length,
      2
    );
  });
});
