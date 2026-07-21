import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { CurrentPresenter, PresenterRequest } from "./auth.types.js";

export const CurrentPresenterUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentPresenter => {
    const request = context.switchToHttp().getRequest<PresenterRequest>();
    if (request.presenter === undefined) {
      throw new Error("Authenticated presenter was not attached to request");
    }
    return request.presenter;
  }
);
