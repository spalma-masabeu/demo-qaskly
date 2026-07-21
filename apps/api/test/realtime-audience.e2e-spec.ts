import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";
import { LiveSessionEventsService } from "../src/realtime/live-session-events.service.js";
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
  id: string;
  handshake: {
    headers: Record<string, string>;
    auth?: Record<string, unknown>;
  };
  emit(event: string, payload: unknown): void;
  join(room: string): void;
  leave(room: string): void;
}

interface AudienceGateway {
  handleAudienceJoin(
    payload: { code: string; participantToken?: string; displayName?: string },
    socket: MockSocket
  ): Promise<void>;
  handleAudienceLeave(
    payload: { sessionId: string; participantId: string; participantToken: string },
    socket: MockSocket
  ): Promise<void>;
  handleAudienceSubmitResponse(
    payload: {
      sessionId: string;
      slideId: string;
      participantToken: string;
      value: unknown;
    },
    socket: MockSocket
  ): Promise<void>;
}

describe("audience realtime gateway", { concurrency: false }, () => {
  let testApp: ApiTestApp;
  let realtimeGateway: RealtimeGateway;
  let liveSessionEvents: LiveSessionEventsService;
  let gateway: AudienceGateway;
  let serverUrl: string;
  const serverEvents: Array<EmittedEvent & { room: string }> = [];

  before(async () => {
    testApp = await createApiTestApp();
    await testApp.app.listen(0);
    const address = testApp.app.getHttpServer().address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
    realtimeGateway = testApp.module.get(RealtimeGateway);
    liveSessionEvents = testApp.module.get(LiveSessionEventsService);
    gateway = realtimeGateway as unknown as AudienceGateway;
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
    leaves: JoinedRoom[];
  } {
    const events: EmittedEvent[] = [];
    const joins: JoinedRoom[] = [];
    const leaves: JoinedRoom[] = [];
    return {
      events,
      joins,
      leaves,
      socket: {
        id: randomSocketId(),
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
        },
        leave(room: string) {
          leaves.push({ room });
        }
      }
    };
  }

  async function seedLiveSession(): Promise<{
    code: string;
    sessionId: string;
    slideId: string;
  }> {
    const user = await withPresenter(
      apiRequest(testApp.app).get("/api/v1/me")
    ).expect(200);
    const presentation = await insertTestPresentation(
      testApp.prisma,
      user.body.id as string
    );
    const slide = await insertTestSlide(testApp.prisma, presentation.id, {
      type: "OPEN_ENDED",
      config: { maxLength: 20 }
    });
    const session = await withPresenter(
      apiRequest(testApp.app).post(
        `/api/v1/presentations/${presentation.id}/sessions`
      )
    ).expect(201);
    await withPresenter(
      apiRequest(testApp.app).post(`/api/v1/sessions/${session.body.id}/start`)
    ).expect(200);
    await withPresenter(
      apiRequest(testApp.app)
        .post(`/api/v1/sessions/${session.body.id}/start-slide`)
        .send({ slideId: slide.id })
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
    slideId: string;
  }> {
    const user = await withPresenter(
      apiRequest(testApp.app).get("/api/v1/me")
    ).expect(200);
    const presentation = await insertTestPresentation(
      testApp.prisma,
      user.body.id as string
    );
    const slide = await insertTestSlide(testApp.prisma, presentation.id, {
      type: "OPEN_ENDED",
      config: { maxLength: 20 }
    });
    const session = await withPresenter(
      apiRequest(testApp.app).post(
        `/api/v1/presentations/${presentation.id}/sessions`
      )
    ).expect(201);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string,
      slideId: slide.id
    };
  }

  it("allows socket audience to join created sessions and receive slide_started on presenter start", async () => {
    const { code, sessionId, slideId } = await seedCreatedSession();
    const socket = connectSocket(serverUrl, {
      transports: ["websocket"]
    });

    try {
      await waitForClientEvent(socket, "connected");
      socket.emit("join_session", { code });
      const joined = await waitForClientEvent<{
        sessionId: string;
        currentState: string;
      }>(socket, "session_joined");
      assert.equal(joined.sessionId, sessionId);
      assert.equal(joined.currentState, "waiting");

      const slideStarted = waitForClientEvent<{
        sessionId: string;
        slide: { id: string };
      }>(socket, "slide_started");
      await withPresenter(
        apiRequest(testApp.app).post(`/api/v1/sessions/${sessionId}/start`)
      ).expect(200);

      const started = await slideStarted;
      assert.equal(started.sessionId, sessionId);
      assert.equal(started.slide.id, slideId);
    } finally {
      socket.disconnect();
    }
  });

  it("emits presenter results when public REST responses are accepted", async () => {
    const { code, sessionId, slideId } = await seedLiveSession();
    const presenterSocket = connectSocket(serverUrl, {
      transports: ["websocket"],
      auth: { testPresenter: presenterAuthHeader() }
    });

    try {
      await waitForClientEvent(presenterSocket, "connected");
      presenterSocket.emit("join_presenter_session", { sessionId });
      await waitForClientEvent(presenterSocket, "presenter_session_joined");
      const resultsUpdated = waitForClientEvent<{
        sessionId: string;
        slideId: string;
        results: { totalResponses: number };
      }>(presenterSocket, "results_updated");

      const joined = await apiRequest(testApp.app)
        .post(`/api/v1/public/sessions/${code}/join`)
        .send({ displayName: "Rest Participant" })
        .expect(201);
      await apiRequest(testApp.app)
        .post(`/api/v1/public/sessions/${code}/responses`)
        .send({
          participantToken: joined.body.participantToken,
          slideId,
          value: { text: "REST answer" }
        })
        .expect(201);

      const updated = await resultsUpdated;
      assert.equal(updated.sessionId, sessionId);
      assert.equal(updated.slideId, slideId);
      assert.equal(updated.results.totalResponses, 1);
    } finally {
      presenterSocket.disconnect();
    }
  });

  it("joins audience room and notifies presenter room", async () => {
    const { code, sessionId } = await seedLiveSession();
    const { socket, events, joins } = createSocket();
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
      await gateway.handleAudienceJoin(
        { code, displayName: "Audience One" },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.deepEqual(joins, [
      { room: `session:${sessionId}:audience` },
      { room: `session:${sessionId}:all` }
    ]);
    assert.equal(events[0]?.event, "session_joined");
    assert.equal(
      (events[0]?.payload as { sessionId: string }).sessionId,
      sessionId
    );
    assert.equal(
      (events[0]?.payload as { currentState: string }).currentState,
      "active"
    );
    assert.equal(serverEvents[0]?.room, `session:${sessionId}:presenter`);
    assert.equal(serverEvents[0]?.event, "participant_joined");
    assert.equal(
      typeof (serverEvents[0]?.payload as { participantCount: number })
        .participantCount,
      "number"
    );
  });

  it("notifies presenter room when audience leaves", async () => {
    const { code, sessionId } = await seedLiveSession();
    const { socket, events, leaves } = createSocket();
    await gateway.handleAudienceJoin({ code }, socket);
    const joined = events[0]?.payload as {
      participantId: string;
      participantToken: string;
    };
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
      await gateway.handleAudienceLeave(
        {
          sessionId,
          participantId: joined.participantId,
          participantToken: joined.participantToken
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.deepEqual(leaves, [
      { room: `session:${sessionId}:audience` },
      { room: `session:${sessionId}:all` }
    ]);
    assert.equal(serverEvents[0]?.room, `session:${sessionId}:presenter`);
    assert.equal(serverEvents[0]?.event, "participant_left");
    assert.equal(
      (serverEvents[0]?.payload as { participantCount: number })
        .participantCount,
      0
    );
  });

  it("rejects forged audience leave events", async () => {
    const { code, sessionId } = await seedLiveSession();
    const { socket, events } = createSocket();
    await gateway.handleAudienceJoin({ code }, socket);
    const joined = events[0]?.payload as {
      participantId: string;
    };
    const serverHolder = liveSessionEvents as unknown as { server?: unknown };
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
      await gateway.handleAudienceLeave(
        {
          sessionId,
          participantId: joined.participantId,
          participantToken: "forged-token"
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.equal(events[1]?.event, "error");
    assert.equal(serverEvents.length, 0);
  });

  it("submits audience response, syncs requester, and updates presenter results", async () => {
    const { code, sessionId, slideId } = await seedLiveSession();
    const { socket, events } = createSocket();
    await gateway.handleAudienceJoin({ code }, socket);
    const participantToken = (
      events[0]?.payload as { participantToken: string }
    ).participantToken;
    const serverHolder = liveSessionEvents as unknown as { server?: unknown };
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
      await gateway.handleAudienceSubmitResponse(
        {
          sessionId,
          slideId,
          participantToken,
          value: { text: "Realtime answer" }
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.equal(events[1]?.event, "response_submitted");
    assert.equal(
      (events[1]?.payload as { sessionId: string }).sessionId,
      sessionId
    );
    assert.equal((events[1]?.payload as { slideId: string }).slideId, slideId);
    assert.equal(typeof (events[1]?.payload as { responseId: string }).responseId, "string");
    assert.equal(serverEvents[0]?.room, `session:${sessionId}:presenter`);
    assert.equal(serverEvents[0]?.event, "response_received");
    assert.equal(
      (serverEvents[0]?.payload as { responseId: string }).responseId,
      (events[1]?.payload as { responseId: string }).responseId
    );
    assert.equal(serverEvents[1]?.room, `session:${sessionId}:presenter`);
    assert.equal(serverEvents[1]?.event, "results_updated");
    assert.equal(
      (serverEvents[1]?.payload as { results: { totalResponses: number } }).results
        .totalResponses,
      1
    );
  });

  it("does not emit presenter result events for rejected responses", async () => {
    const { code, sessionId, slideId } = await seedLiveSession();
    const { socket, events } = createSocket();
    await gateway.handleAudienceJoin({ code }, socket);
    const participantToken = (
      events[0]?.payload as { participantToken: string }
    ).participantToken;
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
      await gateway.handleAudienceSubmitResponse(
        {
          sessionId,
          slideId,
          participantToken,
          value: { text: "First answer" }
        },
        socket
      );
      serverEvents.length = 0;
      await gateway.handleAudienceSubmitResponse(
        {
          sessionId,
          slideId,
          participantToken,
          value: { text: "Duplicate answer" }
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.equal(events[2]?.event, "error");
    assert.equal(serverEvents.length, 0);
  });
});

function randomSocketId(): string {
  return `socket-${Math.random().toString(36).slice(2)}`;
}

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
