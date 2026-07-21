import {
  type CanActivate,
  type ExecutionContext,
  Injectable
} from "@nestjs/common";
import { domainErrors, toHttpException } from "../common/domain-errors.js";
import { AuthService } from "./auth.service.js";
import type { PresenterRequest } from "./auth.types.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PresenterRequest>();
    const presenter = await this.authService.resolvePresenter(request);

    if (presenter === null) {
      throw toHttpException(domainErrors.unauthenticatedPresenter());
    }

    request.presenter = presenter;
    return true;
  }
}
