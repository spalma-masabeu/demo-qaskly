import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  getSlideConfigValidationErrors,
  SlideType
} from "@qaskly/shared";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateSlideDto,
  ReorderSlidesDto,
  UpdateSlideDto
} from "./dto/slide.dto.js";

interface PresentationOwnerRow {
  id: string;
  ownerId: string;
}

interface SlideRow {
  id: string;
  presentationId: string;
  ownerId?: string;
  type: SlideType;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlideResponse {
  id: string;
  presentationId: string;
  type: SlideType;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SlidesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    presenter: CurrentPresenter,
    presentationId: string,
    dto: CreateSlideDto
  ): Promise<SlideResponse> {
    await this.assertPresentationOwner(presenter.id, presentationId);
    await this.assertPresentationEditable(presentationId);
    this.assertValidConfig(dto.type, dto.config);

    const counts = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
    `;
    const count = Number(counts[0]?.count ?? 0);
    if (count >= 20) {
      throw domainErrors.invalidSlideConfig({
        errors: ["A presentation cannot contain more than 20 slides"]
      });
    }

    const position = dto.position ?? count + 1;
    if (position > count + 1) {
      throw domainErrors.invalidSlideConfig({
        errors: ["position must be contiguous with existing slides"]
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Slide"
        SET "position" = -("position" + 1), "updatedAt" = NOW()
        WHERE "presentationId" = ${presentationId}
          AND "position" >= ${position}
      `;
      await tx.$executeRaw`
        UPDATE "Slide"
        SET "position" = ABS("position")
        WHERE "presentationId" = ${presentationId}
          AND "position" < 0
      `;

      const rows = await tx.$queryRaw<SlideRow[]>`
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
          ${dto.type}::"SlideType",
          ${dto.title ?? null},
          ${dto.prompt},
          ${position},
          ${JSON.stringify(dto.config)}::jsonb,
          NOW()
        )
        RETURNING *
      `;

      return toSlideResponse(rows[0]);
    });
  }

  async update(
    presenter: CurrentPresenter,
    slideId: string,
    dto: UpdateSlideDto
  ): Promise<SlideResponse> {
    const slide = await this.findExistingSlide(slideId);
    this.assertOwner(presenter.id, slide);
    await this.assertPresentationEditable(slide.presentationId);

    const nextType = dto.type ?? slide.type;
    const nextConfig = dto.config ?? slide.config;
    this.assertValidConfig(nextType, nextConfig);

    const nextPosition = dto.position ?? slide.position;
    const counts = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Slide"
      WHERE "presentationId" = ${slide.presentationId}
    `;
    const count = Number(counts[0]?.count ?? 0);
    if (nextPosition > count) {
      throw domainErrors.invalidSlideConfig({
        errors: ["position must be within existing slide positions"]
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (nextPosition !== slide.position) {
        await tx.$executeRaw`
          UPDATE "Slide"
          SET "position" = 0
          WHERE "id" = ${slideId}
        `;

        if (slide.position < nextPosition) {
          await tx.$executeRaw`
            UPDATE "Slide"
            SET "position" = -("position" - 1), "updatedAt" = NOW()
            WHERE "presentationId" = ${slide.presentationId}
              AND "position" > ${slide.position}
              AND "position" <= ${nextPosition}
          `;
        } else {
          await tx.$executeRaw`
            UPDATE "Slide"
            SET "position" = -("position" + 1), "updatedAt" = NOW()
            WHERE "presentationId" = ${slide.presentationId}
              AND "position" >= ${nextPosition}
              AND "position" < ${slide.position}
          `;
        }

        await tx.$executeRaw`
          UPDATE "Slide"
          SET "position" = ABS("position")
          WHERE "presentationId" = ${slide.presentationId}
            AND "position" < 0
        `;
      }

      const rows = await tx.$queryRaw<SlideRow[]>`
        UPDATE "Slide"
        SET
          "type" = ${nextType}::"SlideType",
          "title" = ${dto.title === undefined ? slide.title : dto.title},
          "prompt" = ${dto.prompt ?? slide.prompt},
          "position" = ${nextPosition},
          "config" = ${JSON.stringify(nextConfig)}::jsonb,
          "updatedAt" = NOW()
        WHERE "id" = ${slideId}
        RETURNING *
      `;

      return toSlideResponse(rows[0]);
    });
  }

  async delete(presenter: CurrentPresenter, slideId: string): Promise<void> {
    const slide = await this.findExistingSlide(slideId);
    this.assertOwner(presenter.id, slide);
    await this.assertPresentationEditable(slide.presentationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "Slide"
        WHERE "id" = ${slideId}
      `;
      await tx.$executeRaw`
        UPDATE "Slide"
        SET "position" = -("position" - 1), "updatedAt" = NOW()
        WHERE "presentationId" = ${slide.presentationId}
          AND "position" > ${slide.position}
      `;
      await tx.$executeRaw`
        UPDATE "Slide"
        SET "position" = ABS("position")
        WHERE "presentationId" = ${slide.presentationId}
          AND "position" < 0
      `;
    });
  }

  async reorder(
    presenter: CurrentPresenter,
    presentationId: string,
    dto: ReorderSlidesDto
  ): Promise<SlideResponse[]> {
    await this.assertPresentationOwner(presenter.id, presentationId);
    await this.assertPresentationEditable(presentationId);

    const slides = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
      ORDER BY "position" ASC
    `;
    const existingIds = new Set(slides.map((slide) => slide.id));
    const requestedIds = new Set(dto.slideIds);
    if (
      dto.slideIds.length !== slides.length ||
      requestedIds.size !== dto.slideIds.length ||
      dto.slideIds.some((id) => !existingIds.has(id))
    ) {
      throw domainErrors.invalidSlideConfig({
        errors: ["slideIds must include every slide exactly once"]
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.slideIds.entries()) {
        await tx.$executeRaw`
          UPDATE "Slide"
          SET "position" = ${-(index + 1)}
          WHERE "id" = ${id}
        `;
      }

      for (const [index, id] of dto.slideIds.entries()) {
        await tx.$executeRaw`
          UPDATE "Slide"
          SET "position" = ${index + 1}, "updatedAt" = NOW()
          WHERE "id" = ${id}
        `;
      }
    });

    const reordered = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${presentationId}
      ORDER BY "position" ASC
    `;
    return reordered.map(toSlideResponse);
  }

  private async assertPresentationOwner(
    presenterId: string,
    presentationId: string
  ): Promise<void> {
    const rows = await this.prisma.$queryRaw<PresentationOwnerRow[]>`
      SELECT "id", "ownerId"
      FROM "Presentation"
      WHERE "id" = ${presentationId}
      LIMIT 1
    `;
    const presentation = rows[0];
    if (presentation === undefined) {
      throw domainErrors.notFound("Presentation was not found");
    }
    if (presentation.ownerId !== presenterId) {
      throw domainErrors.forbiddenOwnerAction({
        presenterId,
        ownerId: presentation.ownerId
      });
    }
  }

  private async findExistingSlide(slideId: string): Promise<SlideRow> {
    const rows = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT
        s.*,
        p."ownerId" AS "ownerId"
      FROM "Slide" s
      INNER JOIN "Presentation" p ON p."id" = s."presentationId"
      WHERE s."id" = ${slideId}
      LIMIT 1
    `;
    const slide = rows[0];
    if (slide === undefined) {
      throw domainErrors.notFound("Slide was not found");
    }
    return slide;
  }

  private assertOwner(presenterId: string, slide: SlideRow): void {
    if (slide.ownerId !== presenterId) {
      throw domainErrors.forbiddenOwnerAction({
        presenterId,
        ownerId: slide.ownerId
      });
    }
  }

  private assertValidConfig(type: SlideType, config: unknown): void {
    const errors = getSlideConfigValidationErrors(type, config);
    if (errors.length > 0) {
      throw domainErrors.invalidSlideConfig({ errors });
    }
  }

  private async assertPresentationEditable(presentationId: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "LiveSession"
      WHERE "presentationId" = ${presentationId}
    `;
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw domainErrors.validationError(
        "Presentation cannot be edited after it has been presented; duplicate it to make changes",
        { presentationId }
      );
    }
  }
}

function toSlideResponse(row: SlideRow): SlideResponse {
  return {
    id: row.id,
    presentationId: row.presentationId,
    type: row.type,
    title: row.title,
    prompt: row.prompt,
    position: row.position,
    config: row.config,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
