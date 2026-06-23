/**
 * Работа с «днём» в таймзоне приложения.
 *
 * Учёт «какой сейчас день» нельзя вести по UTC: в 00:30 по Москве в UTC ещё
 * предыдущие сутки, и трата уезжает на вчера. Таймзону держим одной константой
 * (вариант A — прагматично, под СНГ); per-user таймзона — задел на будущее.
 */

/** Таймзона приложения для вычисления календарного дня (IANA). */
export const APP_TZ = process.env.APP_TZ || 'Europe/Moscow';

/** 'YYYY-MM-DD' для момента `now` в таймзоне приложения. */
export function appDateStr(now: Date = new Date(), tz: string = APP_TZ): string {
  // en-CA даёт формат YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM-DD' → ISO-метка полудня UTC этого дня (день не плывёт при отображении). */
export function dayStrToIso(dateStr: string): string {
  return `${dateStr}T12:00:00.000Z`;
}

/** Сегодня в таймзоне приложения со сдвигом в днях → ISO (полдень UTC). */
export function appDayIso(offsetDays = 0, now: Date = new Date()): string {
  const d = new Date(dayStrToIso(appDateStr(now)));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString();
}
