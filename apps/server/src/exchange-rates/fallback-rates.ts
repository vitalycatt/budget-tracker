import { Currency } from '@swt/shared';

/**
 * Резервные курсы USD → валюта (приблизительные), на случай недоступности API
 * при пустом кэше. В проде заменяются свежими данными open.er-api.com.
 */
export const FALLBACK_USD_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  JPY: 157,
  GBP: 0.79,
  CNY: 7.2,
  RUB: 90,
  KZT: 480,
  UZS: 12600,
  BYN: 3.3,
  AZN: 1.7,
};
