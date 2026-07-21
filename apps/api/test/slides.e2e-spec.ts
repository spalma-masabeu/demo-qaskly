import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import {
  apiRequest,
  defaultPresenter,
  otherPresenter,
  withPresenter
} from "./auth.js";
import {
  createApiTestApp,
  type ApiTestApp
} from "./app.js";
import {
  disconnectTestDatabase,
  insertTestPresentation,
  insertTestSlide,
  resetTestDatabase
} from "./database.js";
import { assertErrorContract } from "./assertions.js";

describe("slides API", { concurrency: false }, () => {
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

  it("creates, updates, deletes, and rejects missing slides", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);

    const created = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/presentations/${presentation.id}/slides`)
        .send({
          type: "OPEN_ENDED",
          title: "Warmup",
          prompt: "What did you learn?",
          config: { maxLength: 300 }
        })
    ).expect(201);

    assert.equal(created.body.position, 1);
    assert.equal(created.body.type, "OPEN_ENDED");
    assert.equal(created.body.config.maxLength, 300);

    const updated = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/slides/${created.body.id}`)
        .send({
          title: "Updated",
          prompt: "Pick one",
          type: "MULTIPLE_CHOICE",
          config: {
            allowMultiple: false,
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
              { id: "c", label: "C" }
            ]
          }
        })
    ).expect(200);

    assert.equal(updated.body.type, "MULTIPLE_CHOICE");
    assert.equal(updated.body.prompt, "Pick one");
    assert.equal(updated.body.config.options.length, 3);

    await withPresenter(
      apiRequest(app).delete(`/api/v1/slides/${created.body.id}`)
    ).expect(204);

    const missing = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/slides/${created.body.id}`)
        .send({ prompt: "Nope" })
    ).expect(404);
    assertErrorContract(missing, { code: "NOT_FOUND" });
  });

  it("reorders owned slides into contiguous positions", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const first = await insertTestSlide(testApp.prisma, presentation.id, {
      prompt: "First",
      position: 1
    });
    const second = await insertTestSlide(testApp.prisma, presentation.id, {
      prompt: "Second",
      position: 2
    });

    const response = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${presentation.id}/slides/reorder`)
        .send({ slideIds: [second.id, first.id] })
    ).expect(200);

    assert.equal(response.body.length, 2);
    assert.equal(response.body[0].id, second.id);
    assert.equal(response.body[0].position, 1);
    assert.equal(response.body[1].id, first.id);
    assert.equal(response.body[1].position, 2);
  });

  it("inserts slides without leaving position gaps", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);

    const response = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/presentations/${presentation.id}/slides`)
        .send({
          type: "OPEN_ENDED",
          prompt: "Gap?",
          position: 5,
          config: { maxLength: 100 }
        })
    ).expect(400);

    assertErrorContract(response, { code: "INVALID_SLIDE_CONFIG" });
  });

  it("moves a slide position while keeping positions contiguous", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const first = await insertTestSlide(testApp.prisma, presentation.id, {
      prompt: "First",
      position: 1
    });
    const second = await insertTestSlide(testApp.prisma, presentation.id, {
      prompt: "Second",
      position: 2
    });

    const moved = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/slides/${first.id}`)
        .send({ position: 2 })
    ).expect(200);

    assert.equal(moved.body.id, first.id);
    assert.equal(moved.body.position, 2);

    const deck = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${presentation.id}`)
    ).expect(200);
    assert.deepEqual(
      (deck.body.slides as Array<{ id: string; position: number }>).map(
        (slide) => [slide.id, slide.position]
      ),
      [
        [second.id, 1],
        [first.id, 2]
      ]
    );
  });

  it("enforces ownership for create, update, delete, and reorder", async () => {
    const ownerId = await presenterId();
    await presenterId(otherPresenter);
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id);

    const cases = [
      () =>
        apiRequest(app)
          .post(`/api/v1/presentations/${presentation.id}/slides`)
          .send({
            type: "OPEN_ENDED",
            prompt: "Bad",
            config: { maxLength: 100 }
          }),
      () =>
        apiRequest(app)
          .patch(`/api/v1/slides/${slide.id}`)
          .send({ prompt: "Bad" }),
      () => apiRequest(app).delete(`/api/v1/slides/${slide.id}`),
      () =>
        apiRequest(app)
          .patch(`/api/v1/presentations/${presentation.id}/slides/reorder`)
          .send({ slideIds: [slide.id] })
    ];

    for (const buildRequest of cases) {
      const response = await withPresenter(
        buildRequest(),
        otherPresenter
      ).expect(403);
      assertErrorContract(response, { code: "FORBIDDEN_OWNER_ACTION" });
    }
  });

  it("prevents creating more than 20 slides in a presentation", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    for (let position = 1; position <= 20; position += 1) {
      await insertTestSlide(testApp.prisma, presentation.id, { position });
    }

    const response = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/presentations/${presentation.id}/slides`)
        .send({
          type: "OPEN_ENDED",
          prompt: "Overflow",
          config: { maxLength: 100 }
        })
    ).expect(400);

    assertErrorContract(response, { code: "INVALID_SLIDE_CONFIG" });
  });

  it("validates type-specific configs with shared validators", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);

    const response = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/presentations/${presentation.id}/slides`)
        .send({
          type: "MULTIPLE_CHOICE",
          prompt: "Pick one",
          config: {
            allowMultiple: false,
            options: [{ id: "a", label: "A" }]
          }
        })
    ).expect(400);

    assertErrorContract(response, { code: "INVALID_SLIDE_CONFIG" });
  });

  it("freezes slide mutations after the presentation has a session", async () => {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    const slide = await insertTestSlide(testApp.prisma, presentation.id);
    await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const createResponse = await withPresenter(
      apiRequest(app)
        .post(`/api/v1/presentations/${presentation.id}/slides`)
        .send({
          type: "OPEN_ENDED",
          prompt: "New slide",
          config: { maxLength: 100 }
        })
    ).expect(409);
    assertErrorContract(createResponse, { code: "VALIDATION_ERROR" });

    const updateResponse = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/slides/${slide.id}`)
        .send({ prompt: "Edited after run" })
    ).expect(409);
    assertErrorContract(updateResponse, { code: "VALIDATION_ERROR" });

    const deleteResponse = await withPresenter(
      apiRequest(app).delete(`/api/v1/slides/${slide.id}`)
    ).expect(409);
    assertErrorContract(deleteResponse, { code: "VALIDATION_ERROR" });

    const reorderResponse = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${presentation.id}/slides/reorder`)
        .send({ slideIds: [slide.id] })
    ).expect(409);
    assertErrorContract(reorderResponse, { code: "VALIDATION_ERROR" });
  });
});
