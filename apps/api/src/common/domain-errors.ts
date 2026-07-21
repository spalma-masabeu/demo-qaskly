import { HttpException, HttpStatus } from "@nestjs/common";

export type DomainErrorCode =
  | "UNAUTHENTICATED_PRESENTER"
  | "FORBIDDEN_OWNER_ACTION"
  | "INVALID_ROOM_CODE"
  | "CLOSED_SLIDE"
  | "INACTIVE_SLIDE"
  | "DUPLICATE_RESPONSE"
  | "INVALID_SLIDE_CONFIG"
  | "INVALID_RESPONSE_PAYLOAD"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export interface ErrorResponseBody {
  code: DomainErrorCode;
  message: string;
  details?: unknown;
}

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function toErrorResponseBody(error: DomainError): ErrorResponseBody {
  return {
    code: error.code,
    message: error.message,
    ...(error.details === undefined ? {} : { details: error.details })
  };
}

export function toHttpException(error: DomainError): HttpException {
  return new HttpException(toErrorResponseBody(error), error.statusCode);
}

export function mapUnknownToHttpException(error: unknown): HttpException {
  if (isDomainError(error)) {
    return toHttpException(error);
  }

  return new HttpException(
    {
      code: "VALIDATION_ERROR",
      message: "Unexpected request error"
    } satisfies ErrorResponseBody,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}

export const domainErrors = {
  unauthenticatedPresenter(details?: unknown): DomainError {
    return new DomainError(
      "UNAUTHENTICATED_PRESENTER",
      "Presenter authentication is required",
      HttpStatus.UNAUTHORIZED,
      details
    );
  },
  forbiddenOwnerAction(details?: unknown): DomainError {
    return new DomainError(
      "FORBIDDEN_OWNER_ACTION",
      "You do not own this resource",
      HttpStatus.FORBIDDEN,
      details
    );
  },
  invalidRoomCode(details?: unknown): DomainError {
    return new DomainError(
      "INVALID_ROOM_CODE",
      "The room code is invalid",
      HttpStatus.NOT_FOUND,
      details
    );
  },
  closedSlide(details?: unknown): DomainError {
    return new DomainError(
      "CLOSED_SLIDE",
      "This slide is closed for responses",
      HttpStatus.CONFLICT,
      details
    );
  },
  inactiveSlide(details?: unknown): DomainError {
    return new DomainError(
      "INACTIVE_SLIDE",
      "This slide is not active",
      HttpStatus.CONFLICT,
      details
    );
  },
  duplicateResponse(details?: unknown): DomainError {
    return new DomainError(
      "DUPLICATE_RESPONSE",
      "A response was already submitted for this slide",
      HttpStatus.CONFLICT,
      details
    );
  },
  invalidSlideConfig(details?: unknown): DomainError {
    return new DomainError(
      "INVALID_SLIDE_CONFIG",
      "Slide configuration is invalid",
      HttpStatus.BAD_REQUEST,
      details
    );
  },
  invalidResponsePayload(details?: unknown): DomainError {
    return new DomainError(
      "INVALID_RESPONSE_PAYLOAD",
      "Response payload is invalid",
      HttpStatus.BAD_REQUEST,
      details
    );
  },
  validationError(message: string, details?: unknown): DomainError {
    return new DomainError(
      "VALIDATION_ERROR",
      message,
      HttpStatus.CONFLICT,
      details
    );
  },
  notFound(message = "Resource was not found", details?: unknown): DomainError {
    return new DomainError("NOT_FOUND", message, HttpStatus.NOT_FOUND, details);
  }
};
