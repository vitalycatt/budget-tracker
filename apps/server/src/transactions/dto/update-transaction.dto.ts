import { z } from 'zod';
import { createTransactionSchema } from './create-transaction.dto';

/** Все поля опциональны — обновляем только переданные. */
export const updateTransactionSchema = createTransactionSchema.partial();

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
