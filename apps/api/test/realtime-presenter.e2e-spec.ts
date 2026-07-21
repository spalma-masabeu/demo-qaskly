import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";
import { io as connectSocket, type Socket as ClientSocket } from "socket.io-client";
import { apiRequest, presenterAuthHeader, withPresenter } from "./auth.js";
import { createApiTestApp, type ApiTestApp } from "./app.js";
import {
  disconnectTestDatabase,
  insertTestPresentation,
  insertTestSlide,
  resetTestDatabase
} from "./database.js";

interface EmittedEvent {
  event: string;
  payload: unknown;
}

interface JoinedRoom {
  room: string;
}

interface MockSocket {
  handshake: {
    headers: Record<string, string>;
  };
  emit(event: string, payload: unknown): void;
  join(room: string): void;
}

interface PresenterGateway {
  handlePresenterJoin(
    payload: { sessionId: string },
    socket: MockSocket
  ): Promise<void>;
  handleStartSlide(
    payload: { sessionId: string; slideId: string },
    socket: MockSocket
  ): Promise<void>;
  handleCloseSlide(
    payload: { sessionId: string; slideId: string },
    socket: MockSocket
  ): Promise<void>;
  handleNextSlide(
    payload: { sessionId: string },
    socket: MockSocket
  ): Promise<void>;
  handleEndSession(
    payload: { sessionId: string; reason?: "COMPLETED" | "MANUAL" | "ERROR" },
    socket: MockSocket
  ): Promise<void>;
}

describe("presenter realtime gateway", { concurrency: false }, () => {
  let testApp: ApiTestApp;
  let realtimeGateway: RealtimeGateway;
  let gateway: PresenterGateway;
  const serverEvents: Array<EmittedEvent & { room: string }> = [];

  before(async () => {
    testApp = await createApiTestApp();
    realtimeGateway = testApp.module.get(RealtimeGateway);
    gateway = realtimeGateway as unknown as PresenterGateway;
  });

  beforeEach(async () => {
    serverEvents.length = 0;
    await resetTestDatabase(testApp.prisma);
  });

  after(async () => {
    await disconnectTestDatabase(testApp.prisma);
    await testApp.app.close();
  });

  function createSocket(): {
    socket: MockSocket;
    events: EmittedEvent[];
    joins: JoinedRoom[];
  } {
    const events: EmittedEvent[] = [];
    const joins: JoinedRoom[] = [];
    return {
      events,
      joins,
      socket: {
        handshake: {
          headers: {
            "x-test-presenter": presenterAuthHeader()
          }
        },
        emit(event: string, payload: unknown) {
          events.push({ event, payload });
        },
        join(room: string) {
          joins.push({ room });
        }
      }
    };
  }

  async function seedLiveSession(): Promise<{
    sessionId: string;
    firstSlideId: string;
    secondSlideId: string;
  }> {
    const user = await withPresenter(
      apiRequest(testApp.app).get("/api/v1/me")
    ).expect(200);
    const presentation = await insertTestPresentation(
      testApp.prisma,
      user.body.id as string
    );
    const firstSlide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 1
    });
    const secondSlide = await insertTestSlide(testApp.prisma, presentation.id, {
      position: 2
    });
    const session = await withPresenter(
      apiRequest(testApp.app).post(
        `/api/v1/presentations/${presentation.id}/sessions`
      )
    ).expect(201);
    await withPresenter(
      apiRequest(testApp.app).post(`/api/v1/sessions/${session.body.id}/start`)
    ).expect(200);

    return {
      sessionId: session.body.id as string,
      firstSlideId: firstSlide.id,
      secondSlideId: secondSlide.id
    };
  }

  it("joins an authorized presenter to the presenter room", async () => {
    const { sessionId } = await seedLiveSession();
    const { socket, events, joins } = createSocket();

    await gateway.handlePresenterJoin({ sessionId }, socket);

    assert.deepEqual(joins, [{ room: `session:${sessionId}:presenter` }]);
    assert.equal(events[0]?.event, "presenter_session_joined");
    assert.equal(
      (events[0]?.payload as { session: { id: string } }).session.id,
      sessionId
    );
  });

  it("emits slide and session lifecycle events to presenter and audience rooms", async () => {
    const { sessionId, firstSlideId, secondSlideId } = await seedLiveSession();
    const { socket } = createSocket();
    const serverHolder = realtimeGateway as unknown as { server?: unknown };
    const originalServer = serverHolder.server;
    serverHolder.server = {
      to(room: string) {
        return {
          emit(event: string, payload: unknown) {
            serverEvents.push({ room, event, payload });
          }
        };
      }
    };

    try {
      await gateway.handleStartSlide({ sessionId, slideId: firstSlideId }, socket);
      await gateway.handleCloseSlide({ sessionId, slideId: firstSlideId }, socket);
      await gateway.handleNextSlide({ sessionId }, socket);
      await gateway.handleEndSession({ sessionId }, socket);
    } finally {
      serverHolder.server = originalServer;
    }

    assert.deepEqual(
      serverEvents.map((event) => [event.room, event.event]),
      [
        [`session:${sessionId}:audience`, "slide_started"],
        [`session:${sessionId}:presenter`, "slide_started"],
        [`session:${sessionId}:audience`, "slide_closed"],
        [`session:${sessionId}:presenter`, "slide_closed"],
        [`session:${sessionId}:audience`, "slide_started"],
        [`session:${sessionId}:presenter`, "slide_started"],
        [`session:${sessionId}:audience`, "session_ended"],
        [`session:${sessionId}:presenter`, "session_ended"]
      ]
    );
    assert.equal(
      (
        serverEvents.find(
          (event) =>
            event.event === "slide_started" &&
            event.room === `session:${sessionId}:presenter`
        )?.payload as { slide: { id: string } }
      ).slide.id,
      firstSlideId
    );
    assert.equal(
      (
        serverEvents.find(
          (event) =>
            event.event === "slide_started" &&
            (event.payload as { slide: { id: string } }).slide.id ===
              secondSlideId
        )?.payload as { slide: { id: string } }
      ).slide.id,
      secondSlideId
    );
  });

  it("emits presenter error payloads when a command is unauthorized", async () => {
    const { sessionId, firstSlideId } = await seedLiveSession();
    const { socket, events } = createSocket();
    socket.handshake.headers = {};

    await gateway.handleStartSlide({ sessionId, slideId: firstSlideId }, socket);

    assert.equal(events[0]?.event, "error");
    assert.equal(
      (events[0]?.payload as { code: string }).code,
      "UNAUTHENTICATED_PRESENTER"
    );
  });
});

describe("presenter realtime socket.io transport", { concurrency: false }, () => {
  const auth0Domain = "auth.test.local";
  const auth0Audience = "qaskly-api-test";
  const keyId = "socket-test-key";
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
  let serverUrl: string;

  before(async () => {
    testApp = await createApiTestApp({
      authTestBypass: false,
      auth0Domain,
      auth0Audience,
      auth0JwksJson: JSON.stringify({ keys: [publicJwk] })
    });
    await testApp.app.listen(0);
    const address = testApp.app.getHttpServer().address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await resetTestDatabase(testApp.prisma);
  });

  after(async () => {
    await disconnectTestDatabase(testApp.prisma);
    await testApp.app.close();
  });

  it("accepts presenter JWT from socket auth and emits room events", async () => {
    const token = signJwt({
      header: { alg: "RS256", typ: "JWT", kid: keyId },
      payload: {
        iss: `https://${auth0Domain}/`,
        aud: auth0Audience,
        sub: "auth0|socket-presenter",
        email: "socket-presenter@example.com",
        name: "Socket Presenter",
        exp: Math.floor(Date.now() / 1000) + 300
      }
    });

    const user = await apiRequest(testApp.app)
      .get("/api/v1/me")
      .set("authorization", `Bearer ${token}`)
      .expect(200);
    const presentation = await insertTestPresentation(
      testApp.prisma,
      user.body.id as string
    );
    const slide = await insertTestSlide(testApp.prisma, presentation.id);
    const session = await apiRequest(testApp.app)
      .post(`/api/v1/presentations/${presentation.id}/sessions`)
      .set("authorization", `Bearer ${token}`)
      .expect(201);
    await apiRequest(testApp.app)
      .post(`/api/v1/sessions/${session.body.id}/start`)
      .set("authorization", `Bearer ${token}`)
      .expect(200);

    const socket = connectSocket(serverUrl, {
      transports: ["websocket"],
      auth: { token }
    });

    try {
      await waitForClientEvent(socket, "connected");
      socket.emit("join_presenter_session", { sessionId: session.body.id });
      const joined = await waitForClientEvent<{
        session: { id: string };
      }>(socket, "presenter_session_joined");
      assert.equal(joined.session.id, session.body.id);

      socket.emit("start_slide", {
        sessionId: session.body.id,
        slideId: slide.id
      });
      const started = await waitForClientEvent<{ slide: { id: string } }>(
        socket,
        "slide_started"
      );
      assert.equal(started.slide.id, slide.id);
    } finally {
      socket.disconnect();
    }
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

function waitForClientEvent<T = unknown>(
  socket: ClientSocket,
  event: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, 2_000);
    const onExpected = (payload: T) => {
      cleanup();
      resolve(payload);
    };
    const onError = (payload: unknown) => {
      cleanup();
      reject(new Error(`Socket error: ${JSON.stringify(payload)}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, onExpected);
      socket.off("error", onError);
    };

    socket.once(event, onExpected);
    socket.once("error", onError);
  });
}
