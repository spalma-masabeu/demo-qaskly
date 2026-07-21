import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { RedisService } from "../src/redis/redis.service.js";
import {
  apiRequest,
  otherPresenter,
  withPresenter
} from "./auth.js";
import { createApiTestApp, type ApiTestApp } from "./app.js";
import { assertErrorContract } from "./assertions.js";
import {
  disconnectTestDatabase,
  insertTestPresentation,
  insertTestSlide,
  resetTestDatabase
} from "./database.js";

describe("results presenter API", { concurrency: false }, () => {
  let testApp: ApiTestApp;
  let app: INestApplication;
  let redis: RedisService;

  before(async () => {
    testApp = await createApiTestApp();
    app = testApp.app;
    redis = testApp.module.get(RedisService);
  });

  beforeEach(async () => {
    await resetTestDatabase(testApp.prisma);
  });

  after(async () => {
    await disconnectTestDatabase(testApp.prisma);
    await app.close();
  });

  it("returns owned live session results from durable responses", async () => {
    const seeded = await seedSessionWithResponse();
    await redis.delete(legacySlideResultsKey(seeded.sessionId, seeded.slideId));

    const sessionResults = await withPresenter(
      apiRequest(app).get(`/api/v1/sessions/${seeded.sessionId}/results`)
    ).expect(200);

    assert.equal(sessionResults.body.sessionId, seeded.sessionId);
    assert.equal(sessionResults.body.presentationId, seeded.presentationId);
    assert.equal(sessionResults.body.slides.length, 1);
    assert.equal(sessionResults.body.slides[0].slideId, seeded.slideId);
    assert.equal(sessionResults.body.slides[0].result.type, "MULTIPLE_CHOICE");
    assert.deepEqual(sessionResults.body.slides[0].result.options, [
      { id: "a", label: "Alpha", count: 1, percentage: 100 },
      { id: "b", label: "Beta", count: 0, percentage: 0 }
    ]);

    const cached = await redis.get(
      legacySlideResultsKey(seeded.sessionId, seeded.slideId)
    );
    assert.equal(cached, null);
  });

  it("lists owned presentation result logs", async () => {
    const seeded = await seedSessionWithResponse();
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${seeded.sessionId}/end`)
    ).expect(200);

    const response = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${seeded.presentationId}/sessions`)
    ).expect(200);

    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].sessionId, seeded.sessionId);
    assert.equal(response.body[0].presentationId, seeded.presentationId);
    assert.equal(response.body[0].participantCount, 1);
    assert.equal(response.body[0].responseCount, 1);
    assert.equal(response.body[0].completionState, "completed");
    assert.equal(response.body[0].engagementRate, 100);
    assert.ok(typeof response.body[0].startedAt === "string");
    assert.ok(typeof response.body[0].endedAt === "string");
  });

  it("denies non-owner result log access", async () => {
    const seeded = await seedSessionWithResponse();

    const response = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${seeded.presentationId}/sessions`),
      otherPresenter
    ).expect(403);

    assertErrorContract(response, { code: "FORBIDDEN_OWNER_ACTION" });
  });

  it("returns durable results even when Redis has stale result cache", async () => {
    const seeded = await seedSessionWithResponse();
    await redis.setWithTtl(
      legacySlideResultsKey(seeded.sessionId, seeded.slideId),
      JSON.stringify({
        type: "MULTIPLE_CHOICE",
        totalResponses: 0,
        options: [
          { id: "a", label: "Alpha", count: 0, percentage: 0 },
          { id: "b", label: "Beta", count: 0, percentage: 0 }
        ]
      }),
      3600
    );

    const response = await withPresenter(
      apiRequest(app).get(
        `/api/v1/sessions/${seeded.sessionId}/slides/${seeded.slideId}/results`
      )
    ).expect(200);

    assert.equal(response.body.result.totalResponses, 1);
    assert.equal(response.body.result.options[0].count, 1);
  });

  it("returns one owned slide result for historical sessions", async () => {
    const seeded = await seedSessionWithResponse();
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${seeded.sessionId}/end`)
    ).expect(200);

    const response = await withPresenter(
      apiRequest(app).get(
        `/api/v1/sessions/${seeded.sessionId}/slides/${seeded.slideId}/results`
      )
    ).expect(200);

    assert.equal(response.body.sessionId, seeded.sessionId);
    assert.equal(response.body.slideId, seeded.slideId);
    assert.equal(response.body.result.totalResponses, 1);
    assert.equal(response.body.result.options[0].count, 1);
  });

  it("denies non-owner result access", async () => {
    const seeded = await seedSessionWithResponse();

    const response = await withPresenter(
      apiRequest(app).get(`/api/v1/sessions/${seeded.sessionId}/results`),
      otherPresenter
    ).expect(403);

    assertErrorContract(response, { code: "FORBIDDEN_OWNER_ACTION" });
  });

  async function seedSessionWithResponse(): Promise<{
    code: string;
    presentationId: string;
    sessionId: string;
    slideId: string;
  }> {
    const owner = await withPresenter(apiRequest(app).get("/api/v1/me")).expect(
      200
    );
    const presentation = await insertTestPresentation(
      testApp.prisma,
      owner.body.id as string
    );
    const slide = await insertTestSlide(testApp.prisma, presentation.id, {
      type: "MULTIPLE_CHOICE",
      config: {
        options: [
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" }
        ],
        allowMultiple: false
      }
    });
    const session = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    await withPresenter(
      apiRequest(app).post(`/api/v1/sessions/${session.body.id}/start`)
    ).expect(200);
    await withPresenter(
      apiRequest(app)
        .post(`/api/v1/sessions/${session.body.id}/start-slide`)
        .send({ slideId: slide.id })
    ).expect(200);
    const joined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${session.body.code}/join`)
      .send({})
      .expect(201);
    await apiRequest(app)
      .post(`/api/v1/public/sessions/${session.body.code}/responses`)
      .send({
        participantToken: joined.body.participantToken,
        slideId: slide.id,
        value: { selectedOptionIds: ["a"] }
      })
      .expect(201);

    return {
      code: session.body.code as string,
      presentationId: presentation.id,
      sessionId: session.body.id as string,
      slideId: slide.id
    };
  }
});

function legacySlideResultsKey(sessionId: string, slideId: string): string {
  return `session:${sessionId}:slide:${slideId}:results`;
}
