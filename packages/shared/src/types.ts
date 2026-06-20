import { Currency } from './currency';
import { AccountType, CategoryType, TransactionType } from './enums';

/** Сущности в том виде, в каком их отдаёт API (даты — ISO-строки). */

export interface User {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  baseCurrency: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  amountInBase: number;
  categoryId: string;
  accountId: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  account?: Account;
}
