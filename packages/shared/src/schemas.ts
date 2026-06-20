import { z } from 'zod';
import { CURRENCIES } from './currency';
import { ACCOUNT_TYPES, CATEGORY_TYPES, TRANSACTION_TYPES } from './enums';

const hexColor = z
  .string()
  .regex(/^#[0-9A-F]{6}$/i, 'Цвет должен быть в формате HEX (#RRGGBB)');

const currencyEnum = z.enum(CURRENCIES, {
  errorMap: () => ({ message: 'Неподдерживаемая валюта' }),
});

const transactionTypeEnum = z.enum(TRANSACTION_TYPES, {
  errorMap: () => ({ message: 'Тип должен быть: income или expense' }),
});

const accountTypeEnum = z.enum(ACCOUNT_TYPES, {
  errorMap: () => ({ message: 'Тип должен быть: bank, card или cash' }),
});

const categoryTypeEnum = z.enum(CATEGORY_TYPES, {
  errorMap: () => ({ message: 'Тип категории должен быть income или expense' }),
});

/* ---------------------------------- Account --------------------------------- */

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное'),
  type: accountTypeEnum,
  currency: currencyEnum.default('RUB'),
  balance: z.number().min(0, 'Баланс не может быть отрицательным').default(0),
  color: hexColor,
});
export type CreateAccountDto = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial().extend({
  isArchived: z.boolean().optional(),
});
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;

/* --------------------------------- Category --------------------------------- */

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100, 'Название слишком длинное'),
  icon: z.string().min(1, 'Иконка обязательна'),
  color: hexColor,
  type: categoryTypeEnum,
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

/* -------------------------------- Transaction ------------------------------- */

export const createTransactionSchema = z.object({
  type: transactionTypeEnum,
  amount: z.number().positive('Сумма должна быть положительной'),
  categoryId: z.string().uuid('ID категории должен быть валидным UUID'),
  accountId: z.string().uuid('ID счёта должен быть валидным UUID'),
  description: z.string().min(1, 'Описание обязательно').max(500, 'Описание слишком длинное'),
  date: z.coerce.date(),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

/* ----------------------------------- User ----------------------------------- */

export const updateUserSchema = z.object({
  baseCurrency: currencyEnum.optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
