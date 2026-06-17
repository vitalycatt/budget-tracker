import axios from 'axios';
import type { Category, Account, Transaction, TransactionType } from '@/stores/financeStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getById: (id: string) => api.get<Account>(`/accounts/${id}`),
  create: (data: Omit<Account, 'id'>) => api.post<Account>('/accounts', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// Transactions API
export const transactionsApi = {
  getAll: (type?: TransactionType) => {
    const params = type ? { type } : {};
    return api.get<Transaction[]>('/transactions', { params });
  },
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),
  create: (data: Omit<Transaction, 'id'>) => api.post<Transaction>('/transactions', data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

