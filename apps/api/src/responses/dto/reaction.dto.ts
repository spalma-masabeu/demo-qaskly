import { ALLOWED_REACTIONS, type AllowedReaction } from "@qaskly/shared";
import { IsIn, IsString, Matches } from "class-validator";

export class SubmitReactionDto {
  @IsString()
  @Matches(/\S/)
  participantToken!: string;

  @IsString()
  @IsIn([...ALLOWED_REACTIONS])
  emoji!: AllowedReaction;
}
