import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf
} from "class-validator";
import { SlideType } from "@qaskly/shared";

export class CreateSlideDto {
  @IsEnum(SlideType)
  type!: SlideType;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  position?: number;

  @IsObject()
  config!: Record<string, unknown>;
}

export class UpdateSlideDto {
  @IsOptional()
  @IsEnum(SlideType)
  type?: SlideType;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  prompt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  position?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class ReorderSlidesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  slideIds!: string[];
}
