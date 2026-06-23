import { InlineKeyboard } from 'grammy';
import { formatMoney, Currency } from '@swt/shared';
import { appDateStr } from '../common/app-date';

/**
 * Черновик операции в боте — единая точка подтверждения для всех способов ввода
 * (текст сейчас; голос и пошаговый мастер — позже приземляются в эту же карточку).
 * Хранится в grammY-сессии пользователя до сохранения/отмены.
 *
 * UI следует принципу «канал диктует дизайн»: бот — быстрый захват, поэтому по
 * умолчанию показываем минимум (сводка + Сохранить/Отмена), а полный редактор
 * полей разворачивается по «✏️ Изменить» (progressive disclosure). Доскональная
 * правка — в приложении.
 */
export interface Draft {
  userId: string;
  baseCurrency: string;
  type: 'income' | 'expense';
  amount: number;
  categoryName: string;
  categoryIcon: string;
  /** Выбранный счёт; пока не выбран — сохранение заблокировано. */
  accountId?: string;
  description: string;
  /** ISO-строка момента операции. */
  date: string;
  /** id сообщения с карточкой — чтобы редактировать его, а не плодить новые. */
  cardMessageId?: number;
  /** Метка времени последнего изменения — для TTL-очистки протухших черновиков. */
  updatedAt: number;
}

/** Минимум данных о счёте, нужный карточке (из AccountsService.findAll). */
export interface AccountLite {
  id: string;
  name: string;
  currency: string;
  isArchived: boolean;
}

/** Режим карточки: сводка (по умолчанию) или развёрнутый редактор полей. */
export type DraftView = 'summary' | 'edit';

const MS_PER_DAY = 86_400_000;

/** Экранирование для parse_mode: 'HTML' — описание/имена могут содержать <, >, &. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Человекочитаемая метка даты: сегодня / вчера / позавчера / дд.мм.гггг (в таймзоне приложения). */
export function formatDateLabel(iso: string, now = new Date()): string {
  const dayStr = appDateStr(new Date(iso));
  const startOf = (s: string) => Date.parse(`${s}T00:00:00.000Z`);
  const diffDays = Math.round((startOf(appDateStr(now)) - startOf(dayStr)) / MS_PER_DAY);
  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'вчера';
  if (diffDays === 2) return 'позавчера';
  const [y, mm, dd] = dayStr.split('-');
  return `${dd}.${mm}.${y}`;
}

/**
 * Текст-сводка карточки: что понял парсер. `account` — выбранный счёт (если есть),
 * `view` влияет на хвостовую подсказку (нужен счёт / что поправить).
 */
export function renderDraftText(draft: Draft, account?: AccountLite, view: DraftView = 'summary'): string {
  const typeLine = draft.type === 'expense' ? '💸 Расход' : '💰 Доход';
  const currency = (account?.currency ?? draft.baseCurrency) as Currency;
  const money = esc(formatMoney(draft.amount, currency));

  // Вторая строка — детали через « · »; счёт показываем, только когда выбран.
  const parts: string[] = [];
  if (account) parts.push(`🏦 ${esc(account.name)}`);
  parts.push(`${draft.categoryIcon} ${esc(draft.categoryName)}`);
  parts.push(`📅 ${formatDateLabel(draft.date)}`);

  const lines = [`${typeLine} · <b>${money}</b>`, parts.join(' · ')];
  if (draft.description) lines.push(`«${esc(draft.description)}»`);

  if (!account) lines.push('', '⚠️ Выберите счёт, чтобы сохранить:');
  else if (view === 'edit') lines.push('', 'Что поправить?');

  return lines.join('\n');
}

/**
 * Клавиатура карточки по состоянию:
 * - нет счёта → пикер счетов прямо в карточке + Изменить/Отмена;
 * - режим edit → полный редактор полей + Готово;
 * - всё готово → Сохранить/Отмена + Изменить.
 */
export function renderDraftKeyboard(
  draft: Draft,
  accounts: AccountLite[],
  view: DraftView,
): InlineKeyboard {
  if (view === 'edit') return editKeyboard();

  if (!draft.accountId) {
    const kb = new InlineKeyboard();
    for (const acc of accounts) {
      kb.text(`${acc.name} (${acc.currency})`, `d:setacc:${acc.id}`).row();
    }
    kb.text('✏️ Изменить', 'd:edit').text('❌ Отмена', 'd:cancel');
    return kb;
  }

  return new InlineKeyboard()
    .text('✅ Сохранить', 'd:save')
    .text('❌ Отмена', 'd:cancel')
    .row()
    .text('✏️ Изменить', 'd:edit');
}

/** Полный редактор полей (разворачивается по «Изменить»). */
function editKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Сумма', 'd:f:amount')
    .text('🔄 Тип', 'd:f:type')
    .row()
    .text('🏦 Счёт', 'd:f:acc')
    .text('🏷️ Категория', 'd:f:cat')
    .row()
    .text('📅 Дата', 'd:f:date')
    .text('📝 Описание', 'd:f:desc')
    .row()
    .text('« Готово', 'd:done');
}

/** Подменю выбора счёта (только не архивные) с возвратом в редактор. */
export function accountKeyboard(accounts: AccountLite[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const acc of accounts) {
    kb.text(`${acc.name} (${acc.currency})`, `d:setacc:${acc.id}`).row();
  }
  return kb.text('« Назад', 'd:back');
}

/** Подменю выбора категории нужного типа + «новая». */
export function categoryKeyboard(
  categories: { id: string; name: string; icon: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of categories) {
    kb.text(`${c.icon} ${c.name}`, `d:setcat:${c.id}`).row();
  }
  kb.text('➕ Новая категория', 'd:newcat').row();
  return kb.text('« Назад', 'd:back');
}

/** Подменю выбора даты. */
export function dateKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Сегодня', 'd:setdate:today')
    .text('Вчера', 'd:setdate:yesterday')
    .text('Позавчера', 'd:setdate:dbefore')
    .row()
    .text('📅 Другую дату', 'd:setdate:custom')
    .row()
    .text('« Назад', 'd:back');
}
