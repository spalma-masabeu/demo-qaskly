import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { apiRequest, withPresenter } from "./auth.js";
import { createApiTestApp, type ApiTestApp } from "./app.js";
import { assertErrorContract } from "./assertions.js";
import {
  disconnectTestDatabase,
  insertTestPresentation,
  insertTestSlide,
  resetTestDatabase
} from "./database.js";

describe("participants public API", { concurrency: false }, () => {
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

  async function presenterId(): Promise<string> {
    const response = await withPresenter(
      apiRequest(app).get("/api/v1/me")
    ).expect(200);
    return response.body.id as string;
  }

  async function seedSession(): Promise<{
    code: string;
    sessionId: string;
    slideId: string;
  }> {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id);
    const session = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${session.body.id}/start`)
    ).expect(200);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string,
      slideId: slide.id
    };
  }

  async function seedCreatedSession(): Promise<{
    code: string;
    sessionId: string;
  }> {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    await insertTestSlide(testApp.prisma, presentation.id);
    const session = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string
    };
  }

  it("returns waiting state for created public session codes", async () => {
    const { code, sessionId } = await seedCreatedSession();

    const response = await apiRequest(app)
      .get(`/api/v1/public/sessions/${code}`)
      .expect(200);

    assert.equal(response.body.sessionId, sessionId);
    assert.equal(response.body.code, code);
    assert.equal(response.body.currentState, "waiting");
    assert.equal(response.body.currentSlide, null);
    assert.equal(response.body.responsesOpen, false);
  });

  it("accepts participant joins for created sessions", async () => {
    const { code, sessionId } = await seedCreatedSession();

    const joined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${code}/join`)
      .send({ displayName: "Early Audience" })
      .expect(201);

    assert.equal(joined.body.sessionId, sessionId);
    assert.equal(joined.body.currentState, "waiting");
    assert.equal(joined.body.currentSlide, null);
    assert.equal(typeof joined.body.participantId, "string");
    assert.equal(typeof joined.body.participantToken, "string");
  });

  it("returns public waiting, active, closed, and ended session states", async () => {
    const createdSession = await seedCreatedSession();

    const waiting = await apiRequest(app)
      .get(`/api/v1/public/sessions/${createdSession.code}`)
      .expect(200);
    assert.equal(waiting.body.sessionId, createdSession.sessionId);
    assert.equal(waiting.body.code, createdSession.code);
    assert.equal(waiting.body.currentState, "waiting");
    assert.equal(waiting.body.currentSlide, null);

    const { code, sessionId, slideId } = await seedSession();
    await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${sessionId}/start-slide`)
        .send({ slideId })
    ).expect(200);
    const active = await apiRequest(app)
      .get(`/api/v1/public/sessions/${code}`)
      .expect(200);
    assert.equal(active.body.currentState, "active");
    assert.equal(active.body.currentSlide.id, slideId);

    await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${sessionId}/close-slide`)
        .send({ slideId })
    ).expect(200);
    const closed = await apiRequest(app)
      .get(`/api/v1/public/sessions/${code}`)
      .expect(200);
    assert.equal(closed.body.currentState, "closed");
    assert.equal(closed.body.currentSlide.id, slideId);

    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${sessionId}/end`)
    ).expect(200);
    const ended = await apiRequest(app)
      .get(`/api/v1/public/sessions/${code}`)
      .expect(200);
    assert.equal(ended.body.currentState, "ended");
    assert.equal(ended.body.currentSlide.id, slideId);
  });

  it("joins anonymously and reconnects with the same client token", async () => {
    const { code, sessionId } = await seedSession();

    const joined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${code}/join`)
      .send({ displayName: "Audience One" })
      .expect(201);

    assert.equal(joined.body.sessionId, sessionId);
    assert.equal(joined.body.currentState, "active");
    assert.equal(typeof joined.body.participantId, "string");
    assert.equal(typeof joined.body.participantToken, "string");
    assert.notEqual(joined.body.participantToken.length, 0);

    const rejoined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${code}/join`)
      .send({ participantToken: joined.body.participantToken })
      .expect(201);
    assert.equal(rejoined.body.participantId, joined.body.participantId);
    assert.equal(rejoined.body.participantToken, joined.body.participantToken);

    const rows = await testApp.prisma.$queryRaw<
      Array<{ clientTokenHash: string }>
    >`
      SELECT "clientTokenHash"
      FROM "Participant"
      WHERE "id" = ${joined.body.participantId}
      LIMIT 1
    `;
    assert.notEqual(rows[0]?.clientTokenHash, joined.body.participantToken);
    assert.match(rows[0]?.clientTokenHash ?? "", /^[a-f0-9]{64}$/);
  });

  it("rejects blank participant tokens on reconnect", async () => {
    const { code } = await seedSession();

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${code}/join`)
      .send({ participantToken: "" })
      .expect(400);

    assertErrorContract(response, { code: "VALIDATION_ERROR" });
  });

  it("rejects invalid room codes and accepts ended rooms for reload/join", async () => {
    const invalid = await apiRequest(app)
      .get("/api/v1/public/sessions/NOPE42")
      .expect(404);
    assertErrorContract(invalid, { code: "INVALID_ROOM_CODE" });

    const { code, sessionId } = await seedSession();
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${sessionId}/end`)
    ).expect(200);

    const endedRead = await apiRequest(app)
      .get(`/api/v1/public/sessions/${code}`)
      .expect(200);
    assert.equal(endedRead.body.currentState, "ended");

    const endedJoin = await apiRequest(app)
      .post(`/api/v1/public/sessions/${code}/join`)
      .send({})
      .expect(201);
    assert.equal(endedJoin.body.currentState, "ended");
    assert.equal(typeof endedJoin.body.participantToken, "string");
  });
});
