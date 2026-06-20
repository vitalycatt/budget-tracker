import { z } from 'zod';

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().uuid('ID счёта-источника должен быть валидным UUID'),
    toAccountId: z.string().uuid('ID счёта-приёмника должен быть валидным UUID'),
    amountFrom: z.number().positive('Сумма списания должна быть положительной'),
    amountTo: z.number().positive('Сумма зачисления должна быть положительной'),
    description: z.string().max(500, 'Заметка слишком длинная').optional().default(''),
    date: z.coerce.date(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: 'Счёт-источник и счёт-приёмник должны отличаться',
    path: ['toAccountId'],
  });

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
