import axios from 'axios';
import type {
  Category,
  Account,
  Transaction,
  TransactionType,
  CreateTransactionInput,
  Currency,
} from '@/stores/financeStore';
import { getInitData } from '@/lib/telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Прокидываем Telegram initData в каждый запрос для авторизации (в dev строка пустая → dev-обход)
api.interceptors.request.use((config) => {
  const initData = getInitData();
  if (initData) {
    config.headers['x-telegram-init-data'] = initData;
  }
  return config;
});

export interface User {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  baseCurrency: Currency;
  isOnboarded: boolean;
}

export interface NetWorth {
  baseCurrency: Currency;
  total: number;
  accounts: {
    id: string;
    name: string;
    currency: Currency;
    balance: number;
    balanceInBase: number;
  }[];
}

// Users API
export const usersApi = {
  getMe: () => api.get<User>('/users/me'),
  onboarding: (baseCurrency: Currency) =>
    api.post<User>('/users/me/onboarding', { baseCurrency }),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories'),
  getById: (id: string) => api.get<Category>(`/categories/${id}`),
  create: (data: Omit<Category, 'id'>) => api.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => api.patch<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Accounts API
export const accountsApi = {
  getAll: () => api.get<Account[]>('/accounts'),
  getNetWorth: () => api.get<NetWorth>('/accounts/net-worth'),
  getById: (id: string) => api.get<Account>(`/accounts/${id}`),
  create: (data: Omit<Account, 'id'>) => api.post<Account>('/accounts', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountFrom: number;
  currencyFrom: Currency;
  amountTo: number;
  currencyTo: Currency;
  rate: number;
  description: string;
  date: string;
  fromAccount?: Account;
  toAccount?: Account;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountFrom: number;
  amountTo: number;
  description?: string;
  date: Date;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

// Exchange rates API
export const exchangeRatesApi = {
  getRates: () => api.get<ExchangeRates>('/exchange-rates'),
};

// Transfers API
export const transfersApi = {
  getAll: () => api.get<Transfer[]>('/transfers'),
  create: (data: CreateTransferInput) => api.post<Transfer>('/transfers', data),
  delete: (id: string) => api.delete(`/transfers/${id}`),
};

// Transactions API
export const transactionsApi = {
  getAll: (type?: TransactionType) => {
    const params = type ? { type } : {};
    return api.get<Transaction[]>('/transactions', { params });
  },
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),
  create: (data: CreateTransactionInput) => api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<CreateTransactionInput>) =>
    api.patch<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};
