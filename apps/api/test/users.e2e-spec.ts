import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import {
  apiRequest,
  defaultPresenter,
  withPresenter
} from "./auth.js";
import {
  createApiTestApp,
  type ApiTestApp
} from "./app.js";
import {
  disconnectTestDatabase,
  findTestUserById,
  resetTestDatabase
} from "./database.js";
import { assertErrorContract } from "./assertions.js";

describe("GET/PATCH/DELETE /api/v1/me", { concurrency: false }, () => {
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

  it("rejects unauthenticated requests with the API error contract", async () => {
    const response = await apiRequest(app).get("/api/v1/me").expect(401);

    assertErrorContract(response, {
      code: "UNAUTHENTICATED_PRESENTER"
    });
  });

  it("returns and syncs the authenticated presenter profile", async () => {
    const response = await withPresenter(
      apiRequest(app).get("/api/v1/me")
    ).expect(200);

    assert.equal(response.body.email, defaultPresenter.email);
    assert.equal(response.body.authSubject, defaultPresenter.authSubject);
    assert.equal(response.body.name, defaultPresenter.name);
    assert.equal(response.body.role, "PRESENTER");
    assert.equal(typeof response.body.id, "string");
  });

  it("updates editable presenter profile fields", async () => {
    const response = await withPresenter(
      apiRequest(app)
        .patch("/api/v1/me")
        .send({
          name: "Updated Presenter",
          profession: "Teacher",
          birthday: "1990-05-14",
          usagePurpose: "classroom quizzes"
        })
    ).expect(200);

    assert.equal(response.body.name, "Updated Presenter");
    assert.equal(response.body.profession, "Teacher");
    assert.equal(response.body.birthday, "1990-05-14T00:00:00.000Z");
    assert.equal(response.body.usagePurpose, "classroom quizzes");
  });

  it("deletes the local presenter profile", async () => {
    const synced = await withPresenter(
      apiRequest(app).get("/api/v1/me")
    ).expect(200);

    await withPresenter(apiRequest(app).delete("/api/v1/me")).expect(204);

    const deleted = await findTestUserById(
      testApp.prisma,
      synced.body.id as string
    );
    assert.equal(deleted, null);
  });

  it("returns the API error contract for invalid profile updates", async () => {
    const response = await withPresenter(
      apiRequest(app)
        .patch("/api/v1/me")
        .send({
          name: "",
          birthday: "not-a-date"
        })
    ).expect(400);

    assertErrorContract(response, {
      code: "VALIDATION_ERROR"
    });
  });
});

describe("Auth0 JWT presenter auth", { concurrency: false }, () => {
  const auth0Domain = "auth.test.local";
  const auth0Audience = "qaskly-api-test";
  const keyId = "test-key";
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const publicJwk = {
    ...publicKey.export({ format: "jwk" }),
    kid: keyId,
    alg: "RS256",
    use: "sig"
  };

  let testApp: ApiTestApp;
  let app: INestApplication;

  before(async () => {
    testApp = await createApiTestApp({
      authTestBypass: false,
      auth0Domain,
      auth0Audience,
      auth0JwksJson: JSON.stringify({ keys: [publicJwk] })
    });
    app = testApp.app;
  });

  beforeEach(async () => {
    await resetTestDatabase(testApp.prisma);
  });

  after(async () => {
    await disconnectTestDatabase(testApp.prisma);
    await app.close();
  });

  it("accepts a valid Auth0-style RS256 bearer token", async () => {
    const token = signJwt({
      header: { alg: "RS256", typ: "JWT", kid: keyId },
      payload: {
        iss: `https://${auth0Domain}/`,
        aud: auth0Audience,
        sub: "auth0|jwt-presenter",
        email: "jwt-presenter@example.com",
        name: "JWT Presenter",
        exp: Math.floor(Date.now() / 1000) + 300
      }
    });

    const response = await apiRequest(app)
      .get("/api/v1/me")
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    assert.equal(response.body.authSubject, "auth0|jwt-presenter");
    assert.equal(response.body.email, "jwt-presenter@example.com");
    assert.equal(response.body.name, "JWT Presenter");
  });

  it("rejects a bearer token with the wrong audience", async () => {
    const token = signJwt({
      header: { alg: "RS256", typ: "JWT", kid: keyId },
      payload: {
        iss: `https://${auth0Domain}/`,
        aud: "wrong-audience",
        sub: "auth0|jwt-presenter",
        email: "jwt-presenter@example.com",
        exp: Math.floor(Date.now() / 1000) + 300
      }
    });

    const response = await apiRequest(app)
      .get("/api/v1/me")
      .set("authorization", `Bearer ${token}`)
      .expect(401);

    assertErrorContract(response, { code: "UNAUTHENTICATED_PRESENTER" });
  });

  function signJwt(input: {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
  }): string {
    const encodedHeader = encodeJwtPart(input.header);
    const encodedPayload = encodeJwtPart(input.payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createSign("RSA-SHA256")
      .update(signingInput)
      .end()
      .sign(privateKey)
      .toString("base64url");

    return `${signingInput}.${signature}`;
  }

  function encodeJwtPart(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  }
});
