import { z } from 'zod';

export const updateAccountSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное').optional(),
  type: z.enum(['bank', 'card', 'cash'], {
    errorMap: () => ({ message: 'Тип должен быть: bank, card или cash' }),
  }).optional(),
  balance: z.number().min(0, 'Баланс не может быть отрицательным').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Цвет должен быть в формате HEX (#RRGGBB)').optional(),
});

export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;

