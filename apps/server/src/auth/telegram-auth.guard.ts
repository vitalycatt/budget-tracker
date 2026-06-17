import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { DEV_TELEGRAM_USER, TelegramUser, validateInitData } from './telegram.util';

/**
 * Гвард авторизации через Telegram.
 * - prod: требует валидный initData (HMAC по bot token) в заголовке `x-telegram-init-data`.
 * - dev: при отсутствии/невалидности initData — обход через фиксированного тестового юзера.
 * После успеха кладёт пользователя в `request.user`.
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

    const initData = (request.header('x-telegram-init-data') || '').trim();

    let tgUser: TelegramUser | null = null;
    if (initData) {
      tgUser = validateInitData(initData, botToken);
    }

    if (!tgUser) {
      if (isProd) {
        throw new UnauthorizedException('Невалидные данные авторизации Telegram');
      }
      // dev-обход: фиксированный тестовый пользователь
      tgUser = DEV_TELEGRAM_USER;
    }

    const user = await this.usersService.findOrCreateByTelegram(tgUser);
    (request as Request & { user: typeof user }).user = user;
    return true;
  }
}
