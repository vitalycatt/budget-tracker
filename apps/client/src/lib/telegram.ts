import WebApp from '@twa-dev/sdk';

/** Доступ к API Bot API 8.0 (fullscreen + safe area), которых может не быть в типах SDK. */
type Inset = { top: number; bottom: number; left: number; right: number };
type TelegramApp = typeof WebApp & {
  isFullscreen?: boolean;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  safeAreaInset?: Inset;
  contentSafeAreaInset?: Inset;
};

const app = WebApp as TelegramApp;

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

/**
 * Прокидывает безопасные отступы Telegram в CSS-переменные.
 * Полный отступ для контента = device safe area (вырез/чёлка) + content safe area
 * (нативная панель Telegram сверху в полноэкранном режиме).
 */
function applySafeArea(): void {
  const root = document.documentElement;
  const zero: Inset = { top: 0, bottom: 0, left: 0, right: 0 };
  const sa = app.safeAreaInset ?? zero;
  const ca = app.contentSafeAreaInset ?? zero;
  root.style.setProperty('--tg-safe-top', `${(sa.top ?? 0) + (ca.top ?? 0)}px`);
  root.style.setProperty('--tg-safe-bottom', `${(sa.bottom ?? 0) + (ca.bottom ?? 0)}px`);
  root.style.setProperty('--tg-safe-left', `${(sa.left ?? 0) + (ca.left ?? 0)}px`);
  root.style.setProperty('--tg-safe-right', `${(sa.right ?? 0) + (ca.right ?? 0)}px`);
}

/** Инициализация Mini App: готовность, полноэкранный режим, тема, safe-area. */
export function initTelegram(): void {
  try {
    WebApp.ready();
    WebApp.expand();

    // Полноэкранный режим (Bot API 8.0). На десктопе/в старом клиенте может бросить — это ок.
    try {
      app.requestFullscreen?.();
    } catch {
      /* fullscreen недоступен */
    }
    // Чтобы свайп вниз в полноэкранном режиме не закрывал приложение случайно.
    try {
      app.disableVerticalSwipes?.();
    } catch {
      /* метод недоступен */
    }

    applyTheme();
    applySafeArea();

    // Реакция на изменения темы / отступов / режима
    const onEvent = WebApp.onEvent as unknown as (event: string, cb: () => void) => void;
    onEvent('themeChanged', applyTheme);
    onEvent('safeAreaChanged', applySafeArea);
    onEvent('contentSafeAreaChanged', applySafeArea);
    onEvent('fullscreenChanged', applySafeArea);
  } catch {
    // Вне Telegram (обычный браузер) SDK может бросать — это нормально для dev.
  }
}
