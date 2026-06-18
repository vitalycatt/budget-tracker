import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Bot, InlineKeyboard } from 'grammy';
import { formatMoney, Currency } from '@swt/shared';
import { UsersService } from '../users/users.service';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/entities/category.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionParserService } from './transaction-parser.service';

/** Отложенная транзакция: ждём, пока пользователь выберет счёт инлайн-кнопкой. */
interface PendingTransaction {
  userId: string;
  baseCurrency: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  description: string;
}

const NEW_CATEGORY_ICON = '🏷️';
const NEW_CATEGORY_COLOR = '#64748B';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot | null = null;
  private readonly pending = new Map<string, PendingTransaction>();

  constructor(
    private readonly usersService: UsersService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
    private readonly parser: TransactionParserService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN не задан — Telegram-бот не запущен');
      return;
    }
    if (!this.parser.isEnabled) {
      this.logger.warn('Парсер (Claude) не настроен — Telegram-бот не запущен');
      return;
    }

    this.bot = new Bot(token);
    this.registerHandlers(this.bot);

    // Long-polling в фоне (не блокируем bootstrap Nest)
    void this.bot.start({
      onStart: (info) => this.logger.log(`🤖 Telegram-бот запущен: @${info.username}`),
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }

  private registerHandlers(bot: Bot): void {
    bot.catch((err) => this.logger.error(`Ошибка бота: ${err.message}`));

    bot.command('start', (ctx) =>
      ctx.reply(
        'Привет! Я помогаю вести финансы. Просто напишите трату или доход — например ' +
          '«потратил 500 на кофе» или «зарплата 120000».',
      ),
    );

    bot.on('message:text', (ctx) => this.handleText(ctx));
    bot.on('callback_query:data', (ctx) => this.handleCallback(ctx));
  }

  private async handleText(ctx: any): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    try {
      const user = await this.usersService.findOrCreateByTelegram({
        id: from.id,
        first_name: from.first_name,
        last_name: from.last_name,
        username: from.username,
        language_code: from.language_code,
      });

      const [categories, accounts] = await Promise.all([
        this.categoriesService.findAll(user.id),
        this.accountsService.findAll(user.id),
      ]);

      const parsed = await this.parser.parse(
        ctx.message.text,
        categories.map((c) => c.name),
      );
      if (!parsed) {
        await ctx.reply(
          'Не понял операцию. Опишите трату или доход, например: «потратил 500 на кофе».',
        );
        return;
      }

      // Категория: ищем существующую нужного типа или создаём на лету
      const categoryType = parsed.type as CategoryType;
      let category = categories.find(
        (c) => c.type === categoryType && c.name.toLowerCase() === parsed.categoryName.toLowerCase(),
      );
      if (!category) {
        category = await this.categoriesService.create(user.id, {
          name: parsed.categoryName,
          icon: NEW_CATEGORY_ICON,
          color: NEW_CATEGORY_COLOR,
          type: categoryType,
        });
      }

      // Счёт: нет — просим создать; один — используем; несколько — переспрашиваем
      if (accounts.length === 0) {
        await ctx.reply('Сначала создайте счёт в приложении, затем повторите операцию.');
        return;
      }

      const pending: PendingTransaction = {
        userId: user.id,
        baseCurrency: user.baseCurrency,
        type: parsed.type,
        amount: parsed.amount,
        categoryId: category.id,
        description: parsed.description || parsed.categoryName,
      };

      if (accounts.length === 1) {
        await this.commitTransaction(ctx, pending, accounts[0].id);
        return;
      }

      // Несколько счетов → инлайн-кнопки
      const pendingId = randomUUID().slice(0, 8);
      this.pending.set(pendingId, pending);

      const keyboard = new InlineKeyboard();
      for (const acc of accounts) {
        keyboard.text(`${acc.name} (${acc.currency})`, `acc:${pendingId}:${acc.id}`).row();
      }
      const sign = parsed.type === 'expense' ? '−' : '+';
      await ctx.reply(
        `${sign}${parsed.amount} · ${category.name}\nВыберите счёт:`,
        { reply_markup: keyboard },
      );
    } catch (error) {
      this.logger.error(`handleText: ${(error as Error).message}`);
      await ctx.reply('Произошла ошибка при сохранении операции. Попробуйте ещё раз.');
    }
  }

  private async handleCallback(ctx: any): Promise<void> {
    const data: string = ctx.callbackQuery.data;
    if (!data.startsWith('acc:')) {
      await ctx.answerCallbackQuery();
      return;
    }

    const [, pendingId, accountId] = data.split(':');
    const pending = this.pending.get(pendingId);
    if (!pending) {
      await ctx.answerCallbackQuery({ text: 'Операция устарела, повторите ввод.' });
      return;
    }
    this.pending.delete(pendingId);

    try {
      await this.commitTransaction(ctx, pending, accountId, true);
      await ctx.answerCallbackQuery();
    } catch (error) {
      this.logger.error(`handleCallback: ${(error as Error).message}`);
      await ctx.answerCallbackQuery({ text: 'Не удалось сохранить операцию.' });
    }
  }

  /** Создаёт транзакцию и отправляет подтверждение. */
  private async commitTransaction(
    ctx: any,
    pending: PendingTransaction,
    accountId: string,
    edit = false,
  ): Promise<void> {
    const tx = await this.transactionsService.create(pending.userId, pending.baseCurrency, {
      type: pending.type,
      amount: pending.amount,
      categoryId: pending.categoryId,
      accountId,
      description: pending.description,
      date: new Date(),
    });

    const sign = tx.type === 'expense' ? '−' : '+';
    const money = formatMoney(Number(tx.amount), tx.currency as Currency);
    const text = `✅ Записано: ${sign}${money} · ${pending.description}`;

    if (edit) {
      await ctx.editMessageText(text);
    } else {
      await ctx.reply(text);
    }
  }
}
