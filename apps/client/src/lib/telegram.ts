import WebApp from '@twa-dev/sdk';

/** Запущены ли мы внутри Telegram (есть initData). */
export function isTelegram(): boolean {
  return Boolean(WebApp.initData && WebApp.initData.length > 0);
}

/** initData для авторизации на сервере (заголовок x-telegram-init-data). */
export function getInitData(): string {
  return WebApp.initData || '';
}

/** Применяет тему Telegram к CSS-переменным (фон/текст из themeParams). */
function applyTheme(): void {
  const root = document.documentElement;
  const p = (WebApp.themeParams || {}) as Record<string, string | undefined>;
  if (WebApp.colorScheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Подкрашиваем фон страницы под Telegram, если значение пришло
  if (p.bg_color) {
    document.body.style.backgroundColor = p.bg_color;
  }
}

/** Инициализация Mini App: готовность, разворот на весь экран, тема. */
export function initTelegram(): void {
  try {
    WebApp.ready();
    WebApp.expand();
    applyTheme();
    WebApp.onEvent('themeChanged', applyTheme);
  } catch {
    // Вне Telegram (обычный браузер) SDK может бросать — это нормально для dev.
  }
}
