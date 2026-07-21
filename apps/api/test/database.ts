import { PrismaService } from "../src/prisma/prisma.service.js";
import { randomUUID } from "node:crypto";

export interface TestUserRow {
  id: string;
}

export interface TestPresentationRow {
  id: string;
  ownerId: string;
}

export interface TestSlideRow {
  id: string;
  presentationId: string;
}

export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Response", "Participant", "LiveSession", "Slide", "Presentation", "User" RESTART IDENTITY CASCADE'
  );
}

export async function disconnectTestDatabase(
  prisma: PrismaService
): Promise<void> {
  await prisma.$disconnect();
}

export async function findTestUserById(
  prisma: PrismaService,
  id: string
): Promise<TestUserRow | null> {
  const rows = await prisma.$queryRaw<TestUserRow[]>`
    SELECT "id"
    FROM "User"
    WHERE "id" = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertTestPresentation(
  prisma: PrismaService,
  ownerId: string,
  values: {
    title?: string;
    description?: string | null;
    themeKey?: string;
    status?: string;
  } = {}
): Promise<TestPresentationRow> {
  const rows = await prisma.$queryRaw<TestPresentationRow[]>`
    INSERT INTO "Presentation" (
      "id",
      "ownerId",
      "title",
      "description",
      "themeKey",
      "status",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${ownerId},
      ${values.title ?? "Seed Presentation"},
      ${values.description ?? null},
      ${values.themeKey ?? "CLASSIC"}::"PresentationTheme",
      ${values.status ?? "DRAFT"}::"PresentationStatus",
      NOW()
    )
    RETURNING "id", "ownerId"
  `;
  return rows[0];
}

export async function insertTestSlide(
  prisma: PrismaService,
  presentationId: string,
  values: {
    type?: string;
    prompt?: string;
    position?: number;
    config?: unknown;
  } = {}
): Promise<TestSlideRow> {
  const config = values.config ?? {
    maxLength: 280
  };
  const rows = await prisma.$queryRaw<TestSlideRow[]>`
    INSERT INTO "Slide" (
      "id",
      "presentationId",
      "type",
      "title",
      "prompt",
      "position",
      "config",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${presentationId},
      ${values.type ?? "OPEN_ENDED"}::"SlideType",
      ${"Seed slide"},
      ${values.prompt ?? "What do you think?"},
      ${values.position ?? 1},
      ${JSON.stringify(config)}::jsonb,
      NOW()
    )
    RETURNING "id", "presentationId"
  `;
  return rows[0];
}
