import * as crypto from 'crypto';

/** Данные пользователя из Telegram (поле `user` в initData). */
export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Валидация Telegram Mini App initData по HMAC (bot token).
 * Возвращает данные пользователя при успехе, иначе null.
 * Алгоритм: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  const userJson = params.get('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

/** Фиксированный тестовый пользователь для dev-обхода (без Telegram). */
export const DEV_TELEGRAM_USER: TelegramUser = {
  id: 999000001,
  first_name: 'Dev',
  username: 'dev_user',
  language_code: 'ru',
};
