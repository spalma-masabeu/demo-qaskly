import {
  ArgumentsHost,
  Catch,
  ExceptionFilter
} from "@nestjs/common";
import { DomainError, toErrorResponseBody } from "./domain-errors.js";

interface HttpResponse {
  status(code: number): {
    json(body: unknown): void;
  };
}

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    response.status(exception.statusCode).json(toErrorResponseBody(exception));
  }
}
