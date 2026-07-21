import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class JoinSessionDto {
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  participantToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}
