import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import type { ErrorResponseBody } from "./domain-errors.js";

export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    forbidNonWhitelisted: true,
    whitelist: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: flattenValidationErrors(errors)
      } satisfies ErrorResponseBody)
  });
}

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const ownErrors = Object.values(error.constraints ?? {});
    const childErrors = flattenValidationErrors(error.children ?? []);
    return [...ownErrors, ...childErrors];
  });
}
