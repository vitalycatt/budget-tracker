import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

/** Достаёт текущего пользователя, помещённого в request гвардом TelegramAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
