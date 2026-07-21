import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf
} from "class-validator";
import { PresentationTheme } from "@qaskly/shared";

const presentationStatuses = ["DRAFT", "READY", "ARCHIVED"] as const;

export type PresentationStatusValue = (typeof presentationStatuses)[number];

export class CreatePresentationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(PresentationTheme)
  themeKey?: PresentationTheme;
}

export class UpdatePresentationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsEnum(PresentationTheme)
  themeKey?: PresentationTheme;

  @IsOptional()
  @IsEnum(presentationStatuses)
  status?: PresentationStatusValue;
}

export class ListPresentationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
