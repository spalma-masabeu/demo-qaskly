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

describe("presentations API", { concurrency: false }, () => {
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

  async function currentPresenterId(): Promise<string> {
    const response = await withPresenter(
      apiRequest(app).get("/api/v1/me"),
      defaultPresenter
    ).expect(200);
    return response.body.id as string;
  }

  async function otherPresenterId(): Promise<string> {
    const response = await withPresenter(
      apiRequest(app).get("/api/v1/me"),
      otherPresenter
    ).expect(200);
    return response.body.id as string;
  }

  it("requires authentication to create presentations", async () => {
    const response = await apiRequest(app)
      .post("/api/v1/presentations")
      .send({ title: "Deck" })
      .expect(401);

    assertErrorContract(response, { code: "UNAUTHENTICATED_PRESENTER" });
  });

  it("creates, gets, updates, and deletes an owned presentation", async () => {
    const created = await withPresenter(
      apiRequest(app)
        .post("/api/v1/presentations")
        .send({
          title: "Architecture review",
          description: "Weekly sync",
          themeKey: "DARK"
        })
    ).expect(201);

    assert.equal(created.body.title, "Architecture review");
    assert.equal(created.body.description, "Weekly sync");
    assert.equal(created.body.themeKey, "DARK");
    assert.equal(created.body.status, "DRAFT");

    const fetched = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${created.body.id}`)
    ).expect(200);
    assert.equal(fetched.body.id, created.body.id);
    assert.deepEqual(fetched.body.slides, []);

    const updated = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${created.body.id}`)
        .send({
          title: "Updated deck",
          description: null,
          themeKey: "MINIMAL",
          status: "READY"
        })
    ).expect(200);
    assert.equal(updated.body.title, "Updated deck");
    assert.equal(updated.body.description, null);
    assert.equal(updated.body.themeKey, "MINIMAL");
    assert.equal(updated.body.status, "READY");

    await withPresenter(
      apiRequest(app).delete(`/api/v1/presentations/${created.body.id}`)
    ).expect(204);

    const missing = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${created.body.id}`)
    ).expect(404);
    assertErrorContract(missing, { code: "NOT_FOUND" });
  });

  it("lists only current presenter presentations with pagination", async () => {
    const ownerId = await currentPresenterId();
    const otherId = await otherPresenterId();

    const deckA = await insertTestPresentation(testApp.prisma, ownerId, {
      title: "Deck A"
    });
    await insertTestSlide(testApp.prisma, deckA.id, { position: 1 });
    await insertTestSlide(testApp.prisma, deckA.id, { position: 2 });
    await insertTestPresentation(testApp.prisma, ownerId, {
      title: "Deck B"
    });
    await insertTestPresentation(testApp.prisma, otherId, {
      title: "Other Deck"
    });

    const response = await withPresenter(
      apiRequest(app).get("/api/v1/presentations?page=1&pageSize=1")
    ).expect(200);

    assert.equal(response.body.total, 2);
    assert.equal(response.body.page, 1);
    assert.equal(response.body.pageSize, 1);
    assert.equal(response.body.items.length, 1);
    assert.notEqual(response.body.items[0].title, "Other Deck");
    assert.equal(typeof response.body.items[0].slideCount, "number");
    if (response.body.items[0].title === "Deck A") {
      assert.equal(response.body.items[0].slideCount, 2);
    }
    assert.equal(response.body.items[0].hasLiveSessions, false);
  });

  it("denies non-owner read, update, delete, and duplicate actions", async () => {
    const ownerId = await currentPresenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);

    for (const requestBuilder of [
      () =>
        apiRequest(app).get(`/api/v1/presentations/${presentation.id}`),
      () =>
        apiRequest(app)
          .patch(`/api/v1/presentations/${presentation.id}`)
          .send({ title: "Bad" }),
      () =>
        apiRequest(app).delete(`/api/v1/presentations/${presentation.id}`),
      () =>
        apiRequest(app).post(
          `/api/v1/presentations/${presentation.id}/duplicate`
        )
    ]) {
      const response = await withPresenter(
        requestBuilder(),
        otherPresenter
      ).expect(403);
      assertErrorContract(response, { code: "FORBIDDEN_OWNER_ACTION" });
    }
  });

  it("duplicates an owned presentation with ordered slide copies", async () => {
    const ownerId = await currentPresenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId, {
      title: "Source Deck",
      themeKey: "PLAYFUL"
    });
    await insertTestSlide(testApp.prisma, presentation.id, {
      prompt: "First prompt",
      position: 1
    });

    const duplicated = await withPresenter(
      apiRequest(app).post(
        `/api/v1/presentations/${presentation.id}/duplicate`
      )
    ).expect(201);

    assert.notEqual(duplicated.body.id, presentation.id);
    assert.equal(duplicated.body.title, "Source Deck (Copy)");
    assert.equal(duplicated.body.themeKey, "PLAYFUL");
    assert.equal(duplicated.body.slides.length, 1);
    assert.notEqual(duplicated.body.slides[0].id, undefined);
    assert.equal(duplicated.body.slides[0].prompt, "First prompt");
    assert.equal(duplicated.body.slides[0].position, 1);
  });

  it("allows safe metadata edits and destructive deletion after first session but still blocks content changes", async () => {
    const ownerId = await currentPresenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId, {
      title: "Reusable Deck"
    });
    await insertTestSlide(testApp.prisma, presentation.id);
    await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);

    const updateResponse = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${presentation.id}`)
        .send({ title: "Edited after run", description: "Safe metadata" })
    ).expect(200);
    assert.equal(updateResponse.body.title, "Edited after run");
    assert.equal(updateResponse.body.description, "Safe metadata");
    assert.equal(updateResponse.body.hasLiveSessions, true);

    const statusResponse = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${presentation.id}`)
        .send({ status: "READY" })
    ).expect(409);
    assertErrorContract(statusResponse, { code: "VALIDATION_ERROR" });

    const duplicated = await withPresenter(
      apiRequest(app).post(
        `/api/v1/presentations/${presentation.id}/duplicate`
      )
    ).expect(201);

    const editedDuplicate = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${duplicated.body.id}`)
        .send({ title: "Editable copy" })
    ).expect(200);
    assert.equal(editedDuplicate.body.title, "Editable copy");

    await withPresenter(
      apiRequest(app).delete(`/api/v1/presentations/${presentation.id}`)
    ).expect(204);

    const missing = await withPresenter(
      apiRequest(app).get(`/api/v1/presentations/${presentation.id}`)
    ).expect(404);
    assertErrorContract(missing, { code: "NOT_FOUND" });
  });

  it("validates pagination, theme, and status payloads", async () => {
    const createError = await withPresenter(
      apiRequest(app)
        .post("/api/v1/presentations")
        .send({ title: "", themeKey: "NEON" })
    ).expect(400);
    assertErrorContract(createError, { code: "VALIDATION_ERROR" });

    const created = await withPresenter(
      apiRequest(app).post("/api/v1/presentations").send({ title: "Deck" })
    ).expect(201);

    const updateError = await withPresenter(
      apiRequest(app)
        .patch(`/api/v1/presentations/${created.body.id}`)
        .send({ status: "PUBLISHED" })
    ).expect(400);
    assertErrorContract(updateError, { code: "VALIDATION_ERROR" });

    const paginationError = await withPresenter(
      apiRequest(app).get("/api/v1/presentations?page=0&pageSize=200")
    ).expect(400);
    assertErrorContract(paginationError, { code: "VALIDATION_ERROR" });
  });
});
