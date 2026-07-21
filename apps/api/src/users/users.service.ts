import { Injectable } from "@nestjs/common";
import { domainErrors } from "../common/domain-errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CurrentPresenter } from "../auth/auth.types.js";
import type { UpdateProfileDto } from "./dto/update-profile.dto.js";

export interface PresenterProfileResponse {
  id: string;
  authProvider: "AUTH0";
  authSubject: string;
  email: string;
  name: string | null;
  profession: string | null;
  birthday: string | null;
  usagePurpose: string | null;
  role: "PRESENTER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toProfileResponse(presenter: CurrentPresenter): PresenterProfileResponse {
    return {
      id: presenter.id,
      authProvider: presenter.authProvider,
      authSubject: presenter.authSubject,
      email: presenter.email,
      name: presenter.name,
      profession: presenter.profession,
      birthday: presenter.birthday?.toISOString() ?? null,
      usagePurpose: presenter.usagePurpose,
      role: presenter.role,
      createdAt: presenter.createdAt.toISOString(),
      updatedAt: presenter.updatedAt.toISOString()
    };
  }

  async updateProfile(
    presenter: CurrentPresenter,
    dto: UpdateProfileDto
  ): Promise<PresenterProfileResponse> {
    const birthday =
      dto.birthday === undefined ? presenter.birthday : new Date(dto.birthday);

    const rows = await this.prisma.$queryRaw<CurrentPresenter[]>`
      UPDATE "User"
      SET
        "name" = ${dto.name ?? presenter.name},
        "profession" = ${dto.profession ?? presenter.profession},
        "birthday" = ${birthday},
        "usagePurpose" = ${dto.usagePurpose ?? presenter.usagePurpose},
        "updatedAt" = NOW()
      WHERE "id" = ${presenter.id}
      RETURNING
        "id",
        "authProvider",
        "authSubject",
        "email",
        "name",
        "profession",
        "birthday",
        "usagePurpose",
        "role",
        "createdAt",
        "updatedAt"
    `;

    const updated = rows[0];
    if (updated === undefined) {
      throw domainErrors.notFound("Presenter profile was not found");
    }

    return this.toProfileResponse(updated);
  }

  async deleteProfile(presenter: CurrentPresenter): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "User"
      WHERE "id" = ${presenter.id}
    `;
  }
}
