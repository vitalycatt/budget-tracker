import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Bot, Context, InlineKeyboard, session, SessionFlavor } from 'grammy';
import { formatMoney, Currency } from '@swt/shared';
import { UsersService } from '../users/users.service';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/entities/category.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionParserService } from './transaction-parser.service';
import { StatsService } from './stats.service';
import {
  Draft,
  AccountLite,
  DraftView,
  renderDraftText,
  renderDraftKeyboard,
  accountKeyboard,
  categoryKeyboard,
  dateKeyboard,
  formatDateLabel,
} from './draft-card';
import { appDayIso, dayStrToIso } from '../common/app-date';

/** Какое поле черновика бот ждёт текстом от пользователя. */
type EditField = 'amount' | 'desc' | 'newcat' | 'datecustom';

interface SessionData {
  draft?: Draft;
  view: DraftView;
  editing?: EditField | null;
}

type MyContext = Context & SessionFlavor<SessionData>;

const NEW_CATEGORY_ICON = '🏷️';
const NEW_CATEGORY_COLOR = '#64748B';
/** Черновик «протухает» — защита от старых callback'ов после простоя. */
const DRAFT_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot<MyContext> | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly parser: TransactionParserService,
    private readonly statsService: StatsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN не задан — Telegram-бот не запущен');
      return;
    }
    if (!this.parser.isEnabled) {
      this.logger.warn('Парсер (LLM) не настроен — Telegram-бот не запущен');
      return;
    }

    this.bot = new Bot<MyContext>(token);
    this.bot.use(
      session({
        initial: (): SessionData => ({
          draft: undefined,
          view: 'summary',
          editing: null,
        }),
      }),
    );
    this.registerHandlers(this.bot);

    void this.bot.api.setMyCommands([
      { command: 'start', description: 'Начало работы' },
      { command: 'undo', description: 'Отменить последнюю операцию' },
      { command: 'help', description: 'Как пользоваться' },
    ]);

    // Long-polling в фоне (не блокируем bootstrap Nest)
    void this.bot.start({
      onStart: (info) =>
        this.logger.log(`🤖 Telegram-бот запущен: @${info.username}`),
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }

  private registerHandlers(bot: Bot<MyContext>): void {
    bot.catch((err) => this.logger.error(`Ошибка бота: ${err.message}`));

    bot.command('start', (ctx) =>
      ctx.reply(
        'Привет! Я помогаю вести финансы.\n\n' +
          'Просто напишите трату или доход — например «потратил 500 на кофе» или ' +
          '«вчера зарплата 120000». Я покажу черновик, его можно поправить и сохранить.\n\n' +
          '/undo — отменить последнюю операцию.',
      ),
    );
    bot.command('help', (ctx) =>
      ctx.reply(
        'Напишите операцию свободным текстом: «такси 700», «кофе 200 вчера», «зарплата 120000».\n' +
          'Я разберу фразу и покажу карточку. Если всё верно — «Сохранить». Нужно поправить — ' +
          '«✏️ Изменить» (сумма, тип, счёт, категория, дата, описание).\n\n' +
          'После сохранения есть «↩️ Отменить». Команда /undo отменяет последнюю операцию.\n' +
          'Доскональная правка и статистика — в приложении.',
      ),
    );
    bot.command('undo', (ctx) => this.handleUndoCommand(ctx));
    bot.command('stats', (ctx) => this.handleStatsCommand(ctx));

    bot.on('message:text', (ctx) => this.handleText(ctx));
    bot.on('callback_query:data', (ctx) => this.handleCallback(ctx));
  }

  // ─────────────────────────── Текстовые сообщения ───────────────────────────

  private async handleText(ctx: MyContext): Promise<void> {
    const from = ctx.from;
    const text = ctx.message?.text;
    if (!from || !text) return;

    try {
      // Если ждём правку конкретного поля — трактуем сообщение как значение, не парсим заново.
      if (ctx.session.editing && ctx.session.draft) {
        await this.applyFieldEdit(ctx, ctx.session.editing, text);
        return;
      }

      const user = await this.usersService.findOrCreateByTelegram({
        id: from.id,
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        language_code: from.language_code,
      });

      const [categories, accountsAll] = await Promise.all([
        this.categoriesService.findAll(user.id),
        this.accountsService.findAll(user.id),
      ]);
      const accounts = accountsAll.filter((a) => !a.isArchived);

      const parsed = await this.parser.parse(
        text,
        categories.map((c) => c.name),
        accounts.map((a) => ({ name: a.name, currency: a.currency })),
      );
      if (!parsed) {
        await ctx.reply(
          'Не понял операцию. Опишите трату или доход, например: «потратил 500 на кофе».',
        );
        return;
      }

      if (accounts.length === 0) {
        await ctx.reply(
          'Сначала создайте счёт в приложении, затем повторите операцию.',
        );
        return;
      }

      // Иконку категории берём у существующей одноимённой (тот же тип), иначе дефолт.
      const categoryType = parsed.type as CategoryType;
      const existing = categories.find(
        (c) =>
          c.type === categoryType &&
          c.name.toLowerCase() === parsed.categoryName.toLowerCase(),
      );

      const draft: Draft = {
        userId: user.id,
        baseCurrency: user.baseCurrency,
        type: parsed.type,
        amount: parsed.amount,
        categoryName: existing?.name ?? parsed.categoryName,
        categoryIcon: existing?.icon ?? NEW_CATEGORY_ICON,
        accountId:
          this.matchAccount(accounts, parsed.accountName, parsed.accountCurrency) ??
          (accounts.length === 1 ? accounts[0].id : undefined),
        description: parsed.description || parsed.categoryName,
        date: this.resolveParsedDate(parsed.date),
        updatedAt: Date.now(),
      };

      ctx.session.draft = draft;
      ctx.session.view = 'summary';
      ctx.session.editing = null;

      const account = accounts.find((a) => a.id === draft.accountId);
      const sent = await ctx.reply(renderDraftText(draft, account, 'summary'), {
        parse_mode: 'HTML',
        reply_markup: renderDraftKeyboard(draft, accounts, 'summary'),
      });
      draft.cardMessageId = sent.message_id;
    } catch (error) {
      this.logger.error(`handleText: ${(error as Error).message}`);
      await ctx.reply('Произошла ошибка. Попробуйте ещё раз.');
    }
  }

  /** Применяет введённое текстом значение к полю черновика и обновляет карточку. */
  private async applyFieldEdit(
    ctx: MyContext,
    field: EditField,
    text: string,
  ): Promise<void> {
    const draft = ctx.session.draft!;
    switch (field) {
      case 'amount': {
        const value = Number(text.replace(',', '.').replace(/[^\d.]/g, ''));
        if (!Number.isFinite(value) || value <= 0) {
          await ctx.reply('Введите сумму числом, например 500.');
          return;
        }
        draft.amount = Number(value.toFixed(2));
        break;
      }
      case 'desc':
        draft.description = text.trim().slice(0, 500);
        break;
      case 'newcat':
        draft.categoryName = text.trim().slice(0, 100);
        draft.categoryIcon = NEW_CATEGORY_ICON;
        break;
      case 'datecustom': {
        const iso = this.parseManualDate(text);
        if (!iso) {
          await ctx.reply(
            'Не понял дату. Формат: дд.мм.гггг, например 15.05.2026.',
          );
          return;
        }
        draft.date = iso;
        break;
      }
    }
    ctx.session.editing = null;
    await this.renderCard(ctx, draft, ctx.session.view);
  }

  // ─────────────────────────── Callback-кнопки ───────────────────────────

  private async handleCallback(ctx: MyContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    try {
      if (data.startsWith('undo:'))
        return await this.handleUndoCallback(ctx, data.slice(5));
      if (data === 'dismiss') {
        await ctx.editMessageReplyMarkup();
        await ctx.answerCallbackQuery({ text: 'Ок, оставил.' });
        return;
      }

      const draft = ctx.session.draft;
      if (!draft || Date.now() - draft.updatedAt > DRAFT_TTL_MS) {
        ctx.session.draft = undefined;
        ctx.session.editing = null;
        await ctx.answerCallbackQuery({
          text: 'Черновик устарел, повторите ввод.',
        });
        return;
      }

      await this.routeDraftCallback(ctx, draft, data);
    } catch (error) {
      this.logger.error(`handleCallback: ${(error as Error).message}`);
      await ctx.answerCallbackQuery({
        text: 'Не удалось обработать действие.',
      });
    }
  }

  private async routeDraftCallback(
    ctx: MyContext,
    draft: Draft,
    data: string,
  ): Promise<void> {
    // Завершающие действия.
    if (data === 'd:cancel') {
      ctx.session.draft = undefined;
      ctx.session.editing = null;
      await ctx.editMessageText('❌ Черновик отменён.');
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:save') {
      return await this.commitDraft(ctx, draft);
    }

    // Переключение режима сводка ⇄ редактор.
    if (data === 'd:edit') {
      ctx.session.view = 'edit';
      await this.renderCard(ctx, draft, 'edit', true);
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:done') {
      ctx.session.view = 'summary';
      await this.renderCard(ctx, draft, 'summary', true);
      return void ctx.answerCallbackQuery();
    }

    // Подменю (только меняем клавиатуру, текст оставляем).
    if (data === 'd:f:acc') {
      const accounts = await this.activeAccounts(draft.userId);
      await ctx.editMessageReplyMarkup({
        reply_markup: accountKeyboard(accounts),
      });
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:f:cat') {
      const cats = await this.categoriesOfType(draft.userId, draft.type);
      await ctx.editMessageReplyMarkup({
        reply_markup: categoryKeyboard(cats),
      });
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:f:date') {
      await ctx.editMessageReplyMarkup({ reply_markup: dateKeyboard() });
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:back') {
      const accounts = await this.activeAccounts(draft.userId);
      await ctx.editMessageReplyMarkup({
        reply_markup: renderDraftKeyboard(draft, accounts, ctx.session.view),
      });
      return void ctx.answerCallbackQuery();
    }

    // Поля, требующие текстового ввода.
    if (data === 'd:f:amount') {
      ctx.session.editing = 'amount';
      await ctx.reply('Введите сумму числом:');
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:f:desc') {
      ctx.session.editing = 'desc';
      await ctx.reply('Введите описание:');
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:newcat') {
      ctx.session.editing = 'newcat';
      await ctx.reply('Введите название категории:');
      return void ctx.answerCallbackQuery();
    }
    if (data === 'd:setdate:custom') {
      ctx.session.editing = 'datecustom';
      await ctx.reply('Введите дату в формате дд.мм.гггг:');
      return void ctx.answerCallbackQuery();
    }

    // Мгновенные изменения значений → перерисовываем карточку в текущем режиме.
    if (data === 'd:f:type') {
      draft.type = draft.type === 'expense' ? 'income' : 'expense';
    } else if (data.startsWith('d:setacc:')) {
      draft.accountId = data.slice('d:setacc:'.length);
    } else if (data.startsWith('d:setcat:')) {
      const id = data.slice('d:setcat:'.length);
      const cat = (await this.categoriesOfType(draft.userId, draft.type)).find(
        (c) => c.id === id,
      );
      if (cat) {
        draft.categoryName = cat.name;
        draft.categoryIcon = cat.icon;
      }
    } else if (data.startsWith('d:setdate:')) {
      draft.date = this.relativeDate(data.slice('d:setdate:'.length));
    } else {
      return void ctx.answerCallbackQuery();
    }

    await this.renderCard(ctx, draft, ctx.session.view, true);
    await ctx.answerCallbackQuery();
  }

  /** Сохраняет черновик как транзакцию, заменяет карточку подтверждением с кнопкой отмены. */
  private async commitDraft(ctx: MyContext, draft: Draft): Promise<void> {
    if (!draft.accountId) {
      return void ctx.answerCallbackQuery({ text: 'Сначала выберите счёт.' });
    }

    const categoryType = draft.type as CategoryType;
    const categories = await this.categoriesService.findAll(draft.userId);
    let category = categories.find(
      (c) =>
        c.type === categoryType &&
        c.name.toLowerCase() === draft.categoryName.toLowerCase(),
    );
    if (!category) {
      category = await this.categoriesService.create(draft.userId, {
        name: draft.categoryName,
        icon: draft.categoryIcon || NEW_CATEGORY_ICON,
        color: NEW_CATEGORY_COLOR,
        type: categoryType,
      });
    }

    try {
      const tx = await this.transactionsService.create(
        draft.userId,
        draft.baseCurrency,
        {
          type: draft.type,
          amount: draft.amount,
          categoryId: category.id,
          accountId: draft.accountId,
          description: draft.description || category.name,
          date: new Date(draft.date),
        },
      );

      ctx.session.draft = undefined;
      ctx.session.editing = null;
      ctx.session.view = 'summary';

      const sign = tx.type === 'expense' ? '−' : '+';
      const money = formatMoney(Number(tx.amount), tx.currency as Currency);
      const text = `✅ Записано: ${sign}${money} · ${draft.description || category.name} · ${formatDateLabel(draft.date)}`;
      const kb = new InlineKeyboard().text('↩️ Отменить', `undo:${tx.id}`);
      await ctx.editMessageText(text, { reply_markup: kb });
      await ctx.answerCallbackQuery({ text: 'Сохранено' });
    } catch (error) {
      // Напр. «Недостаточно средств на счете» — оставляем черновик, чтобы поправить.
      await ctx.answerCallbackQuery({
        text: (error as Error).message.slice(0, 190),
      });
    }
  }

  // ─────────────────────────── Отмена операции ───────────────────────────

  private async handleUndoCallback(
    ctx: MyContext,
    txId: string,
  ): Promise<void> {
    const user = await this.userFromCtx(ctx);
    if (!user) return;
    try {
      await this.transactionsService.remove(user.id, txId);
      await ctx.editMessageText('↩️ Операция отменена.');
      await ctx.answerCallbackQuery({ text: 'Отменено' });
    } catch {
      await ctx.answerCallbackQuery({
        text: 'Не удалось отменить (возможно, уже удалена).',
      });
    }
  }

  private async handleUndoCommand(ctx: MyContext): Promise<void> {
    const user = await this.userFromCtx(ctx);
    if (!user) return;
    const last = await this.transactionsService.findLast(user.id);
    if (!last) {
      await ctx.reply('Нет операций для отмены.');
      return;
    }
    const sign = last.type === 'expense' ? '−' : '+';
    const money = formatMoney(Number(last.amount), last.currency as Currency);
    const kb = new InlineKeyboard()
      .text('↩️ Отменить', `undo:${last.id}`)
      .text('Нет', 'dismiss');
    await ctx.reply(
      `Последняя операция:\n${sign}${money} · ${last.description}\n\nОтменить её?`,
      {
        reply_markup: kb,
      },
    );
  }

  // ─────────────────────────── Статистика (только владелец) ───────────────────────────

  /**
   * Сводка активности. Доступна только владельцу (TELEGRAM_ADMIN_ID).
   * Команда скрыта из меню; для всех остальных молча игнорируется,
   * чтобы не раскрывать её существование.
   */
  private async handleStatsCommand(ctx: MyContext): Promise<void> {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    const fromId = ctx.from?.id;
    if (!adminId || !fromId || String(fromId) !== adminId) {
      if (!adminId) {
        this.logger.warn(
          'TELEGRAM_ADMIN_ID не задан — команда /stats недоступна',
        );
      }
      return;
    }
    try {
      const text = await this.statsService.getStatsText();
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error(`handleStatsCommand: ${(error as Error).message}`);
      await ctx.reply('Не удалось собрать статистику.');
    }
  }

  // ─────────────────────────── Вспомогательное ───────────────────────────

  /**
   * Рендерит карточку в заданном режиме. `fromCallback` — правка пришла нажатием
   * кнопки (редактируем текущее сообщение); иначе правка пришла отдельным
   * сообщением — правим карточку по сохранённому id, при сбое шлём новую.
   */
  private async renderCard(
    ctx: MyContext,
    draft: Draft,
    view: DraftView,
    fromCallback = false,
  ): Promise<void> {
    draft.updatedAt = Date.now();
    const accounts = await this.activeAccounts(draft.userId);
    const account = accounts.find((a) => a.id === draft.accountId);
    const text = renderDraftText(draft, account, view);
    const opts = {
      parse_mode: 'HTML' as const,
      reply_markup: renderDraftKeyboard(draft, accounts, view),
    };

    if (fromCallback) {
      await ctx.editMessageText(text, opts);
      return;
    }
    const chatId = ctx.chat?.id;
    if (chatId && draft.cardMessageId) {
      try {
        await ctx.api.editMessageText(chatId, draft.cardMessageId, text, opts);
        return;
      } catch {
        /* карточку нельзя отредактировать (стара/удалена) — пошлём новую ниже */
      }
    }
    const sent = await ctx.reply(text, opts);
    draft.cardMessageId = sent.message_id;
  }

  private async userFromCtx(ctx: MyContext) {
    const from = ctx.from;
    if (!from) return null;
    return this.usersService.findOrCreateByTelegram({
      id: from.id,
      first_name: from.first_name,
      last_name: from.last_name,
      username: from.username,
      language_code: from.language_code,
    });
  }

  private async activeAccounts(userId: string): Promise<AccountLite[]> {
    const all = await this.accountsService.findAll(userId);
    return all.filter((a) => !a.isArchived);
  }

  private async categoriesOfType(
    userId: string,
    type: Draft['type'],
  ): Promise<{ id: string; name: string; icon: string }[]> {
    const all = await this.categoriesService.findAll(userId);
    return all.filter((c) => c.type === (type as CategoryType));
  }

  /**
   * Сопоставляет распознанный парсером счёт с реальным счётом пользователя.
   * Совпадение по имени (без учёта регистра); при одноимённых счетах различаем
   * по валюте (`accountCurrency`). Если однозначно определить не вышло —
   * возвращает undefined (сработает обычный фолбэк: один счёт / пикер).
   */
  private matchAccount(
    accounts: { id: string; name: string; currency: string }[],
    name?: string,
    currency?: string,
  ): string | undefined {
    if (!name) return undefined;
    const wanted = name.trim().toLowerCase();
    let matches = accounts.filter((a) => a.name.toLowerCase() === wanted);
    if (matches.length > 1 && currency) {
      const cur = currency.trim().toUpperCase();
      const narrowed = matches.filter((a) => a.currency.toUpperCase() === cur);
      if (narrowed.length) matches = narrowed;
    }
    return matches.length === 1 ? matches[0].id : undefined;
  }

  /** Дата из парсера: валидный YYYY-MM-DD → полдень того дня; иначе сегодня (в таймзоне приложения). */
  private resolveParsedDate(dateStr?: string): string {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dayStrToIso(dateStr));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return appDayIso(0);
  }

  /** today/yesterday/dbefore → ISO (полдень UTC дня в таймзоне приложения). */
  private relativeDate(kind: string): string {
    if (kind === 'yesterday') return appDayIso(-1);
    if (kind === 'dbefore') return appDayIso(-2);
    return appDayIso(0);
  }

  /** Ручной ввод даты: дд.мм.гггг или дд.мм → ISO (полдень UTC); null при ошибке. */
  private parseManualDate(text: string): string | null {
    const m = text.trim().match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
    if (!m) return null;
    const day = Number(m[1]);
    const mon = Number(m[2]) - 1;
    let year = m[3] ? Number(m[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    // Валидация через UTC, чтобы отловить переполнение (31.02 → март).
    const d = new Date(Date.UTC(year, mon, day, 12, 0, 0));
    if (
      Number.isNaN(d.getTime()) ||
      d.getUTCMonth() !== mon ||
      d.getUTCDate() !== day
    )
      return null;
    return d.toISOString();
  }
}
