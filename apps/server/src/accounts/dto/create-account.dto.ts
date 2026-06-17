import { z } from 'zod';
import { CURRENCIES } from '@swt/shared';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное'),
  type: z.enum(['bank', 'card', 'cash'], {
    errorMap: () => ({ message: 'Тип должен быть: bank, card или cash' }),
  }),
  currency: z
    .enum(CURRENCIES, { errorMap: () => ({ message: 'Неподдерживаемая валюта' }) })
    .default('RUB'),
  balance: z.number().min(0, 'Баланс не может быть отрицательным').default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Цвет должен быть в формате HEX (#RRGGBB)'),
});

export type CreateAccountDto = z.infer<typeof createAccountSchema>;
