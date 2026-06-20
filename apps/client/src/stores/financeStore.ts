import { create } from "zustand";
import type { Currency } from "@swt/shared";

export type { Currency } from "@swt/shared";

export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: "bank" | "card" | "cash";
  currency: Currency;
  balance: number;
  color: string;
  isArchived?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  exchangeRate?: number;
  amountInBase?: number;
  categoryId: string;
  accountId: string;
  description: string;
  date: Date | string;
}

/** Полезная нагрузка для создания транзакции (валюта/курс выводятся сервером). */
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  description: string;
  date: Date | string;
}

interface FinanceStore {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addAccount: (account: Omit<Account, "id">) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
}

export const useFinanceStore = create<FinanceStore>((set) => ({
  categories: [
    {
      id: "1",
      name: "Коммунальные",
      icon: "🏠",
      color: "#FF6B6B",
      type: "expense",
    },
    {
      id: "2",
      name: "Транспорт",
      icon: "🚗",
      color: "#4ECDC4",
      type: "expense",
    },
    {
      id: "3",
      name: "Продукты",
      icon: "🛒",
      color: "#FFE66D",
      type: "expense",
    },
    {
      id: "4",
      name: "Подписки",
      icon: "📱",
      color: "#A8E6CF",
      type: "expense",
    },
    { id: "5", name: "Зарплата", icon: "💼", color: "#6C63FF", type: "income" },
    {
      id: "6",
      name: "Дивиденды",
      icon: "📈",
      color: "#40C057",
      type: "income",
    },
  ],
  accounts: [
    {
      id: "1",
      name: "Основная карта",
      type: "card",
      currency: "RUB",
      balance: 50000,
      color: "#BFFF00",
    },
    {
      id: "2",
      name: "Наличные",
      type: "cash",
      currency: "RUB",
      balance: 5000,
      color: "#000000",
    },
  ],
  transactions: [
    {
      id: "1",
      type: "expense",
      amount: 1500,
      currency: "RUB",
      categoryId: "1",
      accountId: "1",
      description: "Электричество",
      date: new Date(),
    },
    {
      id: "2",
      type: "income",
      amount: 50000,
      currency: "RUB",
      categoryId: "5",
      accountId: "1",
      description: "Зарплата",
      date: new Date(),
    },
  ],
  addCategory: (category) =>
    set((state) => ({
      categories: [
        ...state.categories,
        { ...category, id: Date.now().toString() },
      ],
    })),
  updateCategory: (id, category) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...category } : c
      ),
    })),
  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),
  addAccount: (account) =>
    set((state) => ({
      accounts: [...state.accounts, { ...account, id: Date.now().toString() }],
    })),
  updateAccount: (id, account) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...account } : a
      ),
    })),
  deleteAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    })),
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [
        ...state.transactions,
        { ...transaction, id: Date.now().toString() },
      ],
    })),
  deleteTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),
}));
