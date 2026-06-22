import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Transfer } from '../transfers/entities/transfer.entity';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  bank: '🏦 банк',
  card: '💳 карта',
  cash: '💵 наличные',
};

/**
 * Метрики активности для команды /stats (только владельцу).
 * Всё считается из уже существующих таблиц — «активность» аппроксимируется
 * по созданию операций/переводов (отдельного трекинга событий пока нет).
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(Transfer)
    private readonly transfers: Repository<Transfer>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  /** Готовый HTML-текст со сводкой для отправки в бот. */
  async getStatsText(): Promise<string> {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const d7 = new Date(now.getTime() - 7 * DAY_MS);
    const d30 = new Date(now.getTime() - 30 * DAY_MS);

    // ── Пользователи ─────────────────────────────────────────────
    const [totalUsers, onboarded, newToday, new7, new30] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { isOnboarded: true } }),
      this.users.count({ where: { createdAt: MoreThanOrEqual(startToday) } }),
      this.users.count({ where: { createdAt: MoreThanOrEqual(d7) } }),
      this.users.count({ where: { createdAt: MoreThanOrEqual(d30) } }),
    ]);

    // ── Активность (уникальные авторы операций/переводов за период) ──
    const [activeToday, active7, active30] = await Promise.all([
      this.activeUsers(startToday),
      this.activeUsers(d7),
      this.activeUsers(d30),
    ]);

    // ── Операции ─────────────────────────────────────────────────
    const [totalTx, tx30, byType, topCategories] = await Promise.all([
      this.transactions.count(),
      this.transactions.count({ where: { createdAt: MoreThanOrEqual(d30) } }),
      this.volumeByType(d30),
      this.topCategories(5),
    ]);
    const expense = byType.expense ?? { count: 0, volume: 0 };
    const income = byType.income ?? { count: 0, volume: 0 };

    // ── Счета / категории / переводы ─────────────────────────────
    const [
      activeAccounts,
      archivedAccounts,
      accountsByType,
      totalCategories,
      totalTransfers,
      transfers30,
    ] = await Promise.all([
      this.accounts.count({ where: { isArchived: false } }),
      this.accounts.count({ where: { isArchived: true } }),
      this.accountTypeBreakdown(),
      this.categories.count(),
      this.transfers.count(),
      this.transfers.count({ where: { createdAt: MoreThanOrEqual(d30) } }),
    ]);

    const engagement =
      totalUsers > 0 ? Math.round((active7 / totalUsers) * 100) : 0;
    const onboardRate =
      totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0;
    const avgTxPerUser =
      totalUsers > 0 ? (totalTx / totalUsers).toFixed(1) : '0';
    const avgAccPerUser =
      totalUsers > 0 ? (activeAccounts / totalUsers).toFixed(1) : '0';

    const lines: string[] = [];
    lines.push('📊 <b>Статистика Smart Wallet</b>');
    lines.push(`<i>на ${now.toLocaleString('ru-RU')}</i>`);
    lines.push('');

    lines.push('👥 <b>Пользователи</b>');
    lines.push(`Всего: <b>${this.n(totalUsers)}</b>`);
    lines.push(
      `Новые: +${this.n(newToday)} сегодня · +${this.n(new7)} за 7д · +${this.n(new30)} за 30д`,
    );
    lines.push(`Онбординг: ${this.n(onboarded)} (${onboardRate}%)`);
    lines.push('');

    lines.push('🔥 <b>Активность</b>');
    lines.push(
      `Активны: ${this.n(activeToday)} сегодня · ${this.n(active7)} за 7д · ${this.n(active30)} за 30д`,
    );
    lines.push(`Вовлечённость (7д): ${engagement}%`);
    lines.push('');

    lines.push('💸 <b>Операции</b>');
    lines.push(`Всего: <b>${this.n(totalTx)}</b> · за 30д: ${this.n(tx30)}`);
    lines.push(
      `За 30д — расходы: ${this.n(expense.count)} (оборот ${this.money(expense.volume)}) · ` +
        `доходы: ${this.n(income.count)} (оборот ${this.money(income.volume)})`,
    );
    lines.push(`Среднее на пользователя: ${avgTxPerUser}`);
    lines.push('');

    if (topCategories.length > 0) {
      lines.push('🏆 <b>Топ категорий</b> (по числу операций)');
      topCategories.forEach((c, i) =>
        lines.push(`${i + 1}. ${c.name} — ${this.n(c.count)}`),
      );
      lines.push('');
    }

    lines.push('🏦 <b>Счета</b>');
    lines.push(
      `Активные: ${this.n(activeAccounts)} · в архиве: ${this.n(archivedAccounts)} · ~${avgAccPerUser} на юзера`,
    );
    if (accountsByType.length > 0) {
      lines.push(
        'Типы: ' +
          accountsByType
            .map(
              (a) =>
                `${ACCOUNT_TYPE_LABEL[a.type] ?? a.type} ${this.n(a.count)}`,
            )
            .join(' · '),
      );
    }
    lines.push('');

    lines.push('🔁 <b>Переводы</b>');
    lines.push(
      `Всего: ${this.n(totalTransfers)} · за 30д: ${this.n(transfers30)}`,
    );
    lines.push('');

    lines.push(`🏷️ Категорий всего: ${this.n(totalCategories)}`);
    lines.push('');
    lines.push(
      '<i>* «активность» — по созданию операций; обороты — в базовых валютах пользователей.</i>',
    );

    return lines.join('\n');
  }

  /** Уникальные пользователи, создавшие операцию или перевод с момента since. */
  private async activeUsers(since: Date): Promise<number> {
    const [tx, tr] = await Promise.all([
      this.transactions
        .createQueryBuilder('t')
        .select('DISTINCT t.userId', 'userId')
        .where('t.createdAt >= :since', { since })
        .getRawMany<{ userId: string }>(),
      this.transfers
        .createQueryBuilder('t')
        .select('DISTINCT t.userId', 'userId')
        .where('t.createdAt >= :since', { since })
        .getRawMany<{ userId: string }>(),
    ]);
    const set = new Set<string>();
    tx.forEach((r) => set.add(r.userId));
    tr.forEach((r) => set.add(r.userId));
    return set.size;
  }

  /** Кол-во и оборот операций по типу за период (с момента since). */
  private async volumeByType(
    since: Date,
  ): Promise<Record<string, { count: number; volume: number }>> {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('COALESCE(SUM(t.amountInBase), 0)', 'vol')
      .where('t.createdAt >= :since', { since })
      .groupBy('t.type')
      .getRawMany<{ type: string; cnt: string; vol: string }>();
    const out: Record<string, { count: number; volume: number }> = {};
    rows.forEach((r) => {
      out[r.type] = { count: Number(r.cnt), volume: Number(r.vol) };
    });
    return out;
  }

  /** Топ-N категорий по числу операций (по названию, через все пользователей). */
  private async topCategories(
    limit: number,
  ): Promise<{ name: string; count: number }[]> {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .leftJoin('t.category', 'c')
      .select('c.name', 'name')
      .addSelect('COUNT(*)', 'cnt')
      .where('c.name IS NOT NULL')
      .groupBy('c.name')
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany<{ name: string; cnt: string }>();
    return rows.map((r) => ({ name: r.name, count: Number(r.cnt) }));
  }

  /** Распределение активных счетов по типу. */
  private async accountTypeBreakdown(): Promise<
    { type: string; count: number }[]
  > {
    const rows = await this.accounts
      .createQueryBuilder('a')
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.isArchived = :archived', { archived: false })
      .groupBy('a.type')
      .orderBy('cnt', 'DESC')
      .getRawMany<{ type: string; cnt: string }>();
    return rows.map((r) => ({ type: r.type, count: Number(r.cnt) }));
  }

  private n(value: number): string {
    return value.toLocaleString('ru-RU');
  }

  private money(value: number): string {
    return Math.round(value).toLocaleString('ru-RU');
  }
}
