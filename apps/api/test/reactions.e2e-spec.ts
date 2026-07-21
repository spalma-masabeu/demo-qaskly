import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";
import { apiRequest, presenterAuthHeader, withPresenter } from "./auth.js";
import { createApiTestApp, type ApiTestApp } from "./app.js";
import { assertErrorContract } from "./assertions.js";
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

interface ReactionGateway {
  handleAudienceSendReaction(
    payload: { sessionId: string; participantToken: string; emoji: string },
    socket: MockSocket
  ): Promise<void>;
}

describe("reactions public API", { concurrency: false }, () => {
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

  async function seedSession(options: { live?: boolean } = {}): Promise<{
    code: string;
    sessionId: string;
    participantId: string;
    participantToken: string;
  }> {
    const ownerId = await presenterId();
    const presentation = await insertTestPresentation(testApp.prisma, ownerId);
    await insertTestSlide(testApp.prisma, presentation.id);
    const session = await withPresenter(
      apiRequest(app).post(`/api/v1/presentations/${presentation.id}/sessions`)
    ).expect(201);
    if (options.live === true) {
      await withPresenter(
        apiRequest(app).post(`/api/v1/sessions/${session.body.id}/start`)
      ).expect(200);
    }
    const joined = await apiRequest(app)
      .post(`/api/v1/public/sessions/${session.body.code}/join`)
      .send({})
      .expect(201);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string,
      participantId: joined.body.participantId as string,
      participantToken: joined.body.participantToken as string
    };
  }

  it("accepts an allowed reaction without creating durable records", async () => {
    const seeded = await seedSession();

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
      .send({
        participantToken: seeded.participantToken,
        emoji: "👍"
      })
      .expect(201);

    assert.deepEqual(response.body, {
      sessionId: seeded.sessionId,
      participantId: seeded.participantId,
      emoji: "👍"
    });

    const responses = await testApp.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Response"
      WHERE "sessionId" = ${seeded.sessionId}
    `;
    assert.equal(Number(responses[0]?.count ?? 0), 0);

    const reactionTables = await testApp.prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'Reaction'
    `;
    assert.equal(Number(reactionTables[0]?.count ?? 0), 0);
  });

  it("rejects emojis outside the allowed reaction set", async () => {
    const seeded = await seedSession();

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
      .send({
        participantToken: seeded.participantToken,
        emoji: "🔥"
      })
      .expect(400);

    assertErrorContract(response, { code: "VALIDATION_ERROR" });
  });

  it("rejects non-waiting sessions and invalid room codes", async () => {
    const live = await seedSession({ live: true });
    const active = await apiRequest(app)
      .post(`/api/v1/public/sessions/${live.code}/reactions`)
      .send({
        participantToken: live.participantToken,
        emoji: "👏"
      })
      .expect(404);
    assertErrorContract(active, { code: "INVALID_ROOM_CODE" });

    const ended = await seedSession({ live: true });
    await testApp.prisma.$executeRaw`
      UPDATE "LiveSession"
      SET "status" = 'ENDED'::"SessionStatus"
      WHERE "id" = ${ended.sessionId}
    `;

    const notLive = await apiRequest(app)
      .post(`/api/v1/public/sessions/${ended.code}/reactions`)
      .send({
        participantToken: ended.participantToken,
        emoji: "👏"
      })
      .expect(404);
    assertErrorContract(notLive, { code: "INVALID_ROOM_CODE" });

    const invalidCode = await apiRequest(app)
      .post("/api/v1/public/sessions/NOPE42/reactions")
      .send({
        participantToken: ended.participantToken,
        emoji: "👏"
      })
      .expect(404);
    assertErrorContract(invalidCode, { code: "INVALID_ROOM_CODE" });
  });

  it("rejects invalid participant tokens", async () => {
    const seeded = await seedSession();

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
      .send({
        participantToken: "forged-token",
        emoji: "😂"
      })
      .expect(404);

    assertErrorContract(response, { code: "INVALID_ROOM_CODE" });
  });

  it("allows a burst before throttling repeated reactions", async () => {
    const seeded = await seedSession();

    for (let i = 0; i < 15; i += 1) {
      await apiRequest(app)
        .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
        .send({
          participantToken: seeded.participantToken,
          emoji: "❤️"
        })
        .expect(201);
    }

    const response = await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
      .send({
        participantToken: seeded.participantToken,
        emoji: "😮"
      })
      .expect(409);

    assertErrorContract(response, { code: "VALIDATION_ERROR" });

    await wait(550);

    await apiRequest(app)
      .post(`/api/v1/public/sessions/${seeded.code}/reactions`)
      .send({
        participantToken: seeded.participantToken,
        emoji: "👏"
      })
      .expect(201);
  });
});

describe("reactions realtime gateway", { concurrency: false }, () => {
  let testApp: ApiTestApp;
  let realtimeGateway: RealtimeGateway;
  let gateway: ReactionGateway;
  const serverEvents: Array<EmittedEvent & { room: string }> = [];

  before(async () => {
    testApp = await createApiTestApp();
    realtimeGateway = testApp.module.get(RealtimeGateway);
    gateway = realtimeGateway as unknown as ReactionGateway;
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
  } {
    const events: EmittedEvent[] = [];
    return {
      events,
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
        join() {},
        leave() {}
      }
    };
  }

  async function seedCreatedSession(): Promise<{
    code: string;
    sessionId: string;
    participantToken: string;
    participantId: string;
  }> {
    const user = await withPresenter(
      apiRequest(testApp.app).get("/api/v1/me")
    ).expect(200);
    const presentation = await insertTestPresentation(
      testApp.prisma,
      user.body.id as string
    );
    await insertTestSlide(testApp.prisma, presentation.id);
    const session = await withPresenter(
      apiRequest(testApp.app).post(
        `/api/v1/presentations/${presentation.id}/sessions`
      )
    ).expect(201);
    const joined = await apiRequest(testApp.app)
      .post(`/api/v1/public/sessions/${session.body.code}/join`)
      .send({})
      .expect(201);

    return {
      code: session.body.code as string,
      sessionId: session.body.id as string,
      participantToken: joined.body.participantToken as string,
      participantId: joined.body.participantId as string
    };
  }

  it("emits reaction_received to the presenter room", async () => {
    const { sessionId, participantToken, participantId } =
      await seedCreatedSession();
    const { socket, events } = createSocket();
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
      await gateway.handleAudienceSendReaction(
        {
          sessionId,
          participantToken,
          emoji: "👏"
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.equal(events.length, 0);
    assert.deepEqual(serverEvents, [
      {
        room: `session:${sessionId}:presenter`,
        event: "reaction_received",
        payload: {
          sessionId,
          participantId,
          emoji: "👏"
        }
      }
    ]);
  });

  it("emits only requester errors for invalid or throttled reaction events", async () => {
    const { sessionId, participantToken } = await seedCreatedSession();
    const { socket, events } = createSocket();
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
      await gateway.handleAudienceSendReaction(
        {
          sessionId,
          participantToken,
          emoji: "💥"
        },
        socket
      );
      assert.equal(serverEvents.length, 0);
      await gateway.handleAudienceSendReaction(
        {
          sessionId,
          participantToken,
          emoji: "👍"
        },
        socket
      );
      serverEvents.length = 0;
      for (let i = 1; i < 15; i += 1) {
        await gateway.handleAudienceSendReaction(
          {
            sessionId,
            participantToken,
            emoji: "👍"
          },
          socket
        );
      }
      serverEvents.length = 0;
      await gateway.handleAudienceSendReaction(
        {
          sessionId,
          participantToken,
          emoji: "❤️"
        },
        socket
      );
    } finally {
      serverHolder.server = originalServer;
    }

    assert.equal(events[0]?.event, "error");
    assert.equal((events[0]?.payload as { code: string }).code, "VALIDATION_ERROR");
    assert.equal(events[1]?.event, "error");
    assert.equal((events[1]?.payload as { code: string }).code, "VALIDATION_ERROR");
    assert.equal(serverEvents.length, 0);
  });
});

function randomSocketId(): string {
  return `socket-${Math.random().toString(36).slice(2)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
