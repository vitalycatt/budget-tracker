import { Currency, CURRENCY_META } from './currency';

/**
 * Единый хелпер форматирования денег. Валюта всегда передаётся рядом с суммой.
 * Использует Intl.NumberFormat (ru-RU) с фолбэком на символ из CURRENCY_META.
 */
export function formatMoney(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const meta = CURRENCY_META[currency];
    const formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${meta?.symbol ?? currency}`;
  }
}
