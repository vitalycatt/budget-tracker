/** Тип транзакции: доход или расход. */
export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Тип счёта (не валюта!). */
export const ACCOUNT_TYPES = ['bank', 'card', 'cash'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Тип категории совпадает с типом транзакции. */
export const CATEGORY_TYPES = ['income', 'expense'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];
