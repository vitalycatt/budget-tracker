import { InlineKeyboard } from 'grammy';
import { formatMoney, Currency } from '@swt/shared';

/**
 * Черновик операции в боте — единая точка подтверждения для всех способов ввода
 * (текст сейчас; голос и пошаговый мастер — позже приземляются в эту же карточку).
 * Хранится в grammY-сессии пользователя до сохранения/отмены.
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

const MS_PER_DAY = 86_400_000;

/** Экранирование для parse_mode: 'HTML' — описание/имена могут содержать <, >, &. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Человекочитаемая метка даты: сегодня / вчера / позавчера / дд.мм.гггг. */
export function formatDateLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOf(now) - startOf(d)) / MS_PER_DAY);
  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'вчера';
  if (diffDays === 2) return 'позавчера';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Текст карточки-черновика. `account` — выбранный счёт (если уже выбран). */
export function renderDraftText(draft: Draft, account?: AccountLite): string {
  const typeLine = draft.type === 'expense' ? '💸 Расход' : '💰 Доход';
  const currency = (account?.currency ?? draft.baseCurrency) as Currency;
  const money = formatMoney(draft.amount, currency);
  const accountLine = account ? esc(`${account.name} (${account.currency})`) : '— выберите —';
  return [
    '📝 <b>Черновик операции</b>',
    '',
    typeLine,
    `Сумма: <b>${esc(money)}</b>`,
    `Счёт: ${accountLine}`,
    `Категория: ${draft.categoryIcon} ${esc(draft.categoryName)}`,
    `Дата: ${formatDateLabel(draft.date)}`,
    `Описание: ${draft.description ? esc(draft.description) : '—'}`,
  ].join('\n');
}

/** Главная клавиатура карточки. Сохранение доступно только когда выбран счёт. */
export function mainKeyboard(draft: Draft): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (draft.accountId) {
    kb.text('✅ Сохранить', 'draft:save').text('❌ Отмена', 'draft:cancel').row();
  } else {
    kb.text('❌ Отмена', 'draft:cancel').row();
  }
  kb.text('✏️ Сумма', 'draft:edit:amount')
    .text('🔄 Тип', 'draft:type')
    .text('🏦 Счёт', 'draft:acc')
    .row();
  kb.text('🏷️ Категория', 'draft:cat')
    .text('📅 Дата', 'draft:date')
    .text('📝 Описание', 'draft:edit:desc')
    .row();
  return kb;
}

/** Подменю выбора счёта (только не архивные). */
export function accountKeyboard(accounts: AccountLite[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const acc of accounts) {
    kb.text(`${acc.name} (${acc.currency})`, `draft:setacc:${acc.id}`).row();
  }
  kb.text('« Назад', 'draft:back');
  return kb;
}

/** Подменю выбора категории нужного типа + «новая». */
export function categoryKeyboard(
  categories: { id: string; name: string; icon: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of categories) {
    kb.text(`${c.icon} ${c.name}`, `draft:setcat:${c.id}`).row();
  }
  kb.text('➕ Новая категория', 'draft:newcat').row();
  kb.text('« Назад', 'draft:back');
  return kb;
}

/** Подменю выбора даты. */
export function dateKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Сегодня', 'draft:setdate:today')
    .text('Вчера', 'draft:setdate:yesterday')
    .text('Позавчера', 'draft:setdate:dbefore')
    .row()
    .text('📅 Другую дату', 'draft:setdate:custom')
    .row()
    .text('« Назад', 'draft:back');
}
