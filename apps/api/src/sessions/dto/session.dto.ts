import { IsEnum, IsOptional, IsString } from "class-validator";

const endedReasons = ["COMPLETED", "MANUAL", "ERROR"] as const;

export type EndedReasonValue = (typeof endedReasons)[number];

export class StartSlideDto {
  @IsString()
  slideId!: string;
}

export class CloseSlideDto {
  @IsOptional()
  @IsString()
  slideId?: string;
}

export class EndSessionDto {
  @IsOptional()
  @IsEnum(endedReasons)
  reason?: EndedReasonValue;
}
