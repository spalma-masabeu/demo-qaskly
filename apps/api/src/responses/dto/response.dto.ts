import { IsObject, IsString, Matches } from "class-validator";

export class SubmitResponseDto {
  @IsString()
  @Matches(/\S/)
  participantToken!: string;

  @IsString()
  slideId!: string;

  @IsObject()
  value!: Record<string, unknown>;
}
