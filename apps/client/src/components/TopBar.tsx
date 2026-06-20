import { useLocation } from 'react-router-dom';
import { isTelegramMobile } from '@/lib/telegram';

/** Назначение страницы по маршруту — показываем по центру нативной шапки Telegram. */
const TITLES: Record<string, string> = {
  '/': 'Расходы',
  '/income': 'Доходы',
  '/accounts': 'Счета',
};

/**
 * Непрозрачная верхняя полоса на всю safe-area Telegram.
 * - Перекрывает контент, который при скролле уезжает наверх (иначе он просвечивает
 *   сквозь заголовок и под нативными кнопками Telegram).
 * - Заголовок страницы центрируется в полосе content-safe-area (между Close и ⋯).
 * Высота = вся верхняя safe-area; верхний паддинг = device safe-area (вырез),
 * поэтому текст оказывается ровно в полосе нативных кнопок. Вне Telegram safe-area
 * симулируется (см. lib/telegram.ts), так что полоса видна и в браузере.
 */
export const TopBar = () => {
  const { pathname } = useLocation();
  const title = TITLES[pathname];

  // Полоса нативных кнопок поверх контента есть только в мобильном Telegram —
  // в браузере и desktop-клиентах TopBar не нужен (там обычный системный/оконный хедер).
  if (!isTelegramMobile()) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-background"
      style={{
        height: 'var(--tg-safe-top, 0px)',
        paddingTop: 'var(--tg-device-top, 0px)',
        paddingLeft: 'var(--tg-safe-left, 0px)',
        paddingRight: 'var(--tg-safe-right, 0px)',
      }}
    >
      {title && (
        <div className="flex h-full items-center justify-center">
          <span className="max-w-[60%] truncate text-base font-black text-foreground">
            {title}
          </span>
        </div>
      )}
    </div>
  );
};
