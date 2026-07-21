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

describe("responses public API", { concurrency: false }, () => {
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

  async function seedLiveSession(options: {
    active?: boolean;
    secondSlide?: boolean;
  } = {}): Promise<{
    code: string;
    sessionId: string;
    slideId: string;
    secondSlideId?: string;
    participantId: string;
    participantToken: string;
  }> {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 1,
      type: "OPEN_ENDED",
      config: { maxLength: 20 }
    });
    const secondSlide = options.secondSlide
      ? await insertTestSlide(testApp.prisma, presentation.id, {
          position: 2,
          type: "OPEN_ENDED",
          config: { maxLength: 20 }
        })
      : undefined;
    const session = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${session.body.id}/start`)
    ).expect(200);
    if (options.active === true) {
      await withPresenter(
        apiRequest(app)
          .post(`/api/v1/sessions/${session.body.id}/start-slide`)
          .send({ slideId: slide.id })
      ).expect(200);
    }
    const joined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${session.body.code}/join`)
      .send({})
      .expect(201);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string,
      slideId: slide.id,
      secondSlideId: secondSlide?.id,
      participantId: joined.body.participantId as string,
      participantToken: joined.body.participantToken as string
    };
  }

  it("stores one valid response for the active slide", async () => {
    const seeded = await seedLiveSession({ active: true });

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/responses`)
      .send({
        participantToken: seeded.participantToken,
        slideId: seeded.slideId,
        value: { text: "Good point" }
      })
      .expect(201);

    assert.equal(response.body.sessionId, seeded.sessionId);
    assert.equal(response.body.slideId, seeded.slideId);
    assert.equal(response.body.participantId, seeded.participantId);
    assert.equal(response.body.type, "OPEN_ENDED");
    assert.deepEqual(response.body.value, { text: "Good point" });

    const rows = await testApp.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Response"
      WHERE "sessionId" = ${seeded.sessionId}
        AND "slideId" = ${seeded.slideId}
        AND "participantId" = ${seeded.participantId}
    `;
    assert.equal(Number(rows[0]?.count ?? 0), 1);
  });

  it("rejects malformed response payloads using slide type validators", async () => {
    const seeded = await seedLiveSession({ active: true });

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/responses`)
      .send({
        participantToken: seeded.participantToken,
        slideId: seeded.slideId,
        value: { text: "" }
      })
      .expect(400);

    assertErrorContract(response, { code: "INVALID_RESPONSE_PAYLOAD" });
  });

  it("rejects blank participant tokens before response persistence", async () => {
    const seeded = await seedLiveSession({ active: true });

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/responses`)
      .send({
        participantToken: "",
        slideId: seeded.slideId,
        value: { text: "Good point" }
      })
      .expect(400);

    assertErrorContract(response, { code: "VALIDATION_ERROR" });
  });

  it("rejects inactive slides, closed slides, duplicate responses, and throttle", async () => {
    const waiting = await seedLiveSession({ secondSlide: true });
    const inactive = await apiRequest(app)
      .post(`/api/v1/public/sessions/${waiting.code}/responses`)
      .send({
        participantToken: waiting.participantToken,
        slideId: waiting.secondSlideId,
        value: { text: "Too early" }
      })
      .expect(409);
    assertErrorContract(inactive, { code: "INACTIVE_SLIDE" });

    const closed = await seedLiveSession({ active: true });
    await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${closed.sessionId}/close-slide`)
        .send({ slideId: closed.slideId })
    ).expect(200);
    const closedResponse = await apiRequest(app)
      .post(`/api/v1/public/sessions/${closed.code}/responses`)
      .send({
        participantToken: closed.participantToken,
        slideId: closed.slideId,
        value: { text: "Too late" }
      })
      .expect(409);
    assertErrorContract(closedResponse, { code: "CLOSED_SLIDE" });

    const duplicate = await seedLiveSession({ active: true });
    await apiRequest(app)
      .post(`/api/v1/public/sessions/${duplicate.code}/responses`)
      .send({
        participantToken: duplicate.participantToken,
        slideId: duplicate.slideId,
        value: { text: "First" }
      })
      .expect(201);
    const duplicateResponse = await apiRequest(app)
      .post(`/api/v1/public/sessions/${duplicate.code}/responses`)
      .send({
        participantToken: duplicate.participantToken,
        slideId: duplicate.slideId,
        value: { text: "Again" }
      })
      .expect(409);
    assertErrorContract(duplicateResponse, { code: "DUPLICATE_RESPONSE" });

    const throttled = await seedLiveSession({ active: true, secondSlide: true });
    await apiRequest(app)
      .post(`/api/v1/public/sessions/${throttled.code}/responses`)
      .send({
        participantToken: throttled.participantToken,
        slideId: throttled.slideId,
        value: { text: "First slide" }
      })
      .expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${throttled.sessionId}/next-slide`)
    ).expect(200);
    const throttledResponse = await apiRequest(app)
      .post(`/api/v1/public/sessions/${throttled.code}/responses`)
      .send({
        participantToken: throttled.participantToken,
        slideId: throttled.secondSlideId,
        value: { text: "Second slide" }
      })
      .expect(409);
    assertErrorContract(throttledResponse, { code: "VALIDATION_ERROR" });
  });
});
