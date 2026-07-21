import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  profession?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  birthday?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  usagePurpose?: string;
}
