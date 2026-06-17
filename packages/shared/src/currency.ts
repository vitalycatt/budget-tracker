/**
 * Поддерживаемые валюты (10 на старте).
 * Мировые топ-5 + СНГ топ-5. Единый источник правды для сервера и клиента.
 */
export const CURRENCIES = [
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'CNY',
  'RUB',
  'KZT',
  'UZS',
  'BYN',
  'AZN',
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'RUB';

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  name: string;
}

/** Метаданные валют: символ + человекочитаемое название (рус.). */
export const CURRENCY_META: Record<Currency, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$', name: 'Доллар США' },
  EUR: { code: 'EUR', symbol: '€', name: 'Евро' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Японская иена' },
  GBP: { code: 'GBP', symbol: '£', name: 'Фунт стерлингов' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Китайский юань' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  KZT: { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
  UZS: { code: 'UZS', symbol: 'сўм', name: 'Узбекский сум' },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' },
  AZN: { code: 'AZN', symbol: '₼', name: 'Азербайджанский манат' },
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}
