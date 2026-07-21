import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PresentationTheme } from "@qaskly/shared";
import type { CurrentPresenter } from "../auth/auth.types.js";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreatePresentationDto,
  ListPresentationsQueryDto,
  PresentationStatusValue,
  UpdatePresentationDto
} from "./dto/presentation.dto.js";

interface PresentationRow {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  themeKey: PresentationTheme;
  status: PresentationStatusValue;
  createdAt: Date;
  updatedAt: Date;
  slideCount?: bigint | number;
  hasLiveSessions?: boolean;
}

interface SlideRow {
  id: string;
  presentationId: string;
  type: string;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresentationResponse {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  themeKey: PresentationTheme;
  status: PresentationStatusValue;
  slideCount: number;
  hasLiveSessions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresentationWithSlidesResponse extends PresentationResponse {
  slides: SlideResponse[];
}

export interface SlideResponse {
  id: string;
  presentationId: string;
  type: string;
  title: string | null;
  prompt: string;
  position: number;
  config: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPresentationsResponse {
  items: PresentationResponse[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class PresentationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    presenter: CurrentPresenter,
    dto: CreatePresentationDto
  ): Promise<PresentationResponse> {
    const rows = await this.prisma.$queryRaw<PresentationRow[]>`
      INSERT INTO "Presentation" (
        "id",
        "ownerId",
        "title",
        "description",
        "themeKey",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${presenter.id},
        ${dto.title},
        ${dto.description ?? null},
        ${dto.themeKey ?? "CLASSIC"}::"PresentationTheme",
        NOW()
      )
      RETURNING *
    `;
    return toPresentationResponse(rows[0]);
  }

  async list(
    presenter: CurrentPresenter,
    query: ListPresentationsQueryDto
  ): Promise<PaginatedPresentationsResponse> {
    const offset = (query.page - 1) * query.pageSize;
    const items = await this.prisma.$queryRaw<PresentationRow[]>`
      SELECT
        p.*,
        (
          SELECT COUNT(*)::bigint
          FROM "Slide" s
          WHERE s."presentationId" = p."id"
        ) AS "slideCount",
        EXISTS (
          SELECT 1
          FROM "LiveSession" ls
          WHERE ls."presentationId" = p."id"
        ) AS "hasLiveSessions"
      FROM "Presentation" p
      WHERE p."ownerId" = ${presenter.id}
      ORDER BY p."createdAt" DESC, p."id" DESC
      LIMIT ${query.pageSize}
      OFFSET ${offset}
    `;
    const totals = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Presentation"
      WHERE "ownerId" = ${presenter.id}
    `;

    return {
      items: items.map(toPresentationResponse),
      total: Number(totals[0]?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize
    };
  }

  async getOwned(
    presenter: CurrentPresenter,
    id: string
  ): Promise<PresentationWithSlidesResponse> {
    const presentation = await this.findExistingPresentation(id);
    assertOwner(presenter.id, presentation);
    return this.getWithSlides(id);
  }

  async update(
    presenter: CurrentPresenter,
    id: string,
    dto: UpdatePresentationDto
  ): Promise<PresentationResponse> {
    const presentation = await this.findExistingPresentation(id);
    assertOwner(presenter.id, presentation);
    if (dto.status !== undefined) {
      await this.assertPresentationEditable(id);
    }

    await this.prisma.$executeRaw`
      UPDATE "Presentation"
      SET
        "title" = ${dto.title ?? presentation.title},
        "description" = ${
          dto.description === undefined ? presentation.description : dto.description
        },
        "themeKey" = ${dto.themeKey ?? presentation.themeKey}::"PresentationTheme",
        "status" = ${dto.status ?? presentation.status}::"PresentationStatus",
        "updatedAt" = NOW()
      WHERE "id" = ${id}
    `;
    return toPresentationResponse(await this.findExistingPresentation(id));
  }

  async delete(presenter: CurrentPresenter, id: string): Promise<void> {
    const presentation = await this.findExistingPresentation(id);
    assertOwner(presenter.id, presentation);
    await this.prisma.$executeRaw`
      DELETE FROM "Presentation"
      WHERE "id" = ${id}
    `;
  }

  async duplicate(
    presenter: CurrentPresenter,
    id: string
  ): Promise<PresentationWithSlidesResponse> {
    const presentation = await this.findExistingPresentation(id);
    assertOwner(presenter.id, presentation);

    const duplicateId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "Presentation" (
          "id",
          "ownerId",
          "title",
          "description",
          "thumbnailUrl",
          "themeKey",
          "status",
          "updatedAt"
        )
        VALUES (
          ${duplicateId},
          ${presenter.id},
          ${`${presentation.title} (Copy)`},
          ${presentation.description},
          ${presentation.thumbnailUrl},
          ${presentation.themeKey}::"PresentationTheme",
          'DRAFT'::"PresentationStatus",
          NOW()
        )
      `;
      const slides = await tx.$queryRaw<SlideRow[]>`
        SELECT *
        FROM "Slide"
        WHERE "presentationId" = ${id}
        ORDER BY "position" ASC
      `;

      for (const slide of slides) {
        await tx.$executeRaw`
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
            ${duplicateId},
            ${slide.type}::"SlideType",
            ${slide.title},
            ${slide.prompt},
            ${slide.position},
            ${JSON.stringify(slide.config)}::jsonb,
            NOW()
          )
        `;
      }
    });

    return this.getWithSlides(duplicateId);
  }

  private async findExistingPresentation(
    id: string
  ): Promise<PresentationRow> {
    const rows = await this.prisma.$queryRaw<PresentationRow[]>`
      SELECT
        p.*,
        (
          SELECT COUNT(*)::bigint
          FROM "Slide" s
          WHERE s."presentationId" = p."id"
        ) AS "slideCount",
        EXISTS (
          SELECT 1
          FROM "LiveSession" ls
          WHERE ls."presentationId" = p."id"
        ) AS "hasLiveSessions"
      FROM "Presentation" p
      WHERE p."id" = ${id}
      LIMIT 1
    `;
    const presentation = rows[0];
    if (presentation === undefined) {
      throw domainErrors.notFound("Presentation was not found");
    }
    return presentation;
  }

  private async getWithSlides(
    id: string
  ): Promise<PresentationWithSlidesResponse> {
    const presentations = await this.prisma.$queryRaw<PresentationRow[]>`
      SELECT
        p.*,
        (
          SELECT COUNT(*)::bigint
          FROM "Slide" s
          WHERE s."presentationId" = p."id"
        ) AS "slideCount",
        EXISTS (
          SELECT 1
          FROM "LiveSession" ls
          WHERE ls."presentationId" = p."id"
        ) AS "hasLiveSessions"
      FROM "Presentation" p
      WHERE p."id" = ${id}
      LIMIT 1
    `;
    const presentation = presentations[0];
    if (presentation === undefined) {
      throw domainErrors.notFound("Presentation was not found");
    }

    const slides = await this.prisma.$queryRaw<SlideRow[]>`
      SELECT *
      FROM "Slide"
      WHERE "presentationId" = ${id}
      ORDER BY "position" ASC
    `;

    return {
      ...toPresentationResponse(presentation),
      slides: slides.map(toSlideResponse)
    };
  }

  private async assertPresentationEditable(id: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "LiveSession"
      WHERE "presentationId" = ${id}
    `;
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw domainErrors.validationError(
        "Presentation cannot be edited after it has been presented; duplicate it to make changes",
        { presentationId: id }
      );
    }
  }
}

function assertOwner(
  presenterId: string,
  presentation: PresentationRow
): void {
  if (presentation.ownerId !== presenterId) {
    throw domainErrors.forbiddenOwnerAction({
      presenterId,
      ownerId: presentation.ownerId
    });
  }
}

function toPresentationResponse(row: PresentationRow): PresentationResponse {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    themeKey: row.themeKey,
    status: row.status,
    slideCount: Number(row.slideCount ?? 0),
    hasLiveSessions: Boolean(row.hasLiveSessions),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
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
