import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Тип должен быть: income или expense' }),
  }),
  amount: z.number().positive('Сумма должна быть положительной'),
  categoryId: z.string().uuid('ID категории должен быть валидным UUID'),
  accountId: z.string().uuid('ID счета должен быть валидным UUID'),
  description: z.string().min(1, 'Описание обязательно').max(500, 'Описание слишком длинное'),
  date: z.coerce.date(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

