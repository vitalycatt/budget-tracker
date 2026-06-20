import { useState, useMemo } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TransactionType, Transaction } from '@/stores/financeStore';
import { Card } from '@/components/ui/card';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import EditTransactionDialog from '@/components/EditTransactionDialog';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWithinInterval,
  getHours,
  type Interval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTransactions } from '@/hooks/use-transactions';
import { useCategories } from '@/hooks/use-categories';
import { useAccounts } from '@/hooks/use-accounts';
import { useCurrentUser } from '@/hooks/use-user';
import { formatMoney } from '@swt/shared';

interface TransactionsProps {
  /** Тип страницы: расходы или доходы (приходит из маршрута). */
  type: TransactionType;
}

type Period = 'day' | 'week' | 'month' | 'year';

const PERIOD_LABEL: Record<Period, string> = {
  day: 'за сегодня',
  week: 'за неделю',
  month: 'за месяц',
  year: 'за год',
};

/** Границы выбранного периода относительно текущего момента. */
function getRange(period: Period, now: Date): Interval {
  switch (period) {
    case 'day':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export default function Transactions({ type }: TransactionsProps) {
  const [period, setPeriod] = useState<Period>('day');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const { data: transactions = [], isLoading } = useTransactions(type);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: user } = useCurrentUser();
  const baseCurrency = user?.baseCurrency ?? 'RUB';

  const isIncome = type === 'income';
  const title = isIncome ? 'Доходы' : 'Расходы';
  const sign = isIncome ? '+' : '−';
  const amountClass = isIncome ? 'text-accent' : 'text-foreground';
  const accentColor = isIncome ? 'hsl(var(--accent))' : 'hsl(var(--foreground))';

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getCategoryName = (id: string) => getCategory(id)?.name || 'Без категории';
  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || 'Без счета';

  // Все агрегаты страницы (итог, категории, история, график) — за выбранный период.
  const range = useMemo(() => getRange(period, new Date()), [period]);

  const periodTx = useMemo(
    () => transactions.filter((t) => isWithinInterval(new Date(t.date), range)),
    [transactions, range]
  );

  // Агрегаты считаем в базовой валюте (amountInBase) — транзакции бывают в разных валютах
  const totalAmount = periodTx.reduce(
    (sum, t) => sum + Number(t.amountInBase ?? t.amount),
    0
  );

  const categoryStats = useMemo(() => {
    const map = periodTx.reduce((acc, t) => {
      const name = getCategoryName(t.categoryId);
      acc[name] = (acc[name] || 0) + Number(t.amountInBase ?? t.amount);
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodTx, categories]);

  const chartData = useMemo(() => {
    const now = new Date();
    const sumIn = (start: Date, end: Date) =>
      periodTx
        .filter((t) => isWithinInterval(new Date(t.date), { start, end }))
        .reduce((sum, t) => sum + Number(t.amountInBase ?? t.amount), 0);

    if (period === 'day') {
      // День разбиваем на 6 блоков по 4 часа — компактно и наглядно на телефоне.
      return Array.from({ length: 6 }, (_, i) => {
        const from = i * 4;
        const to = from + 4;
        const amount = periodTx
          .filter((t) => {
            const h = getHours(new Date(t.date));
            return h >= from && h < to;
          })
          .reduce((sum, t) => sum + Number(t.amountInBase ?? t.amount), 0);
        return { label: `${String(from).padStart(2, '0')}:00`, amount };
      });
    }

    let intervals: Date[];
    if (period === 'week') {
      intervals = eachDayOfInterval(range);
      return intervals.map((date) => ({
        label: format(date, 'EEEEEE', { locale: ru }),
        amount: sumIn(startOfDay(date), endOfDay(date)),
      }));
    }
    if (period === 'month') {
      intervals = eachWeekOfInterval(range, { locale: ru });
      return intervals.map((date) => ({
        label: format(date, 'd MMM', { locale: ru }),
        amount: sumIn(date, endOfWeek(date, { locale: ru })),
      }));
    }
    intervals = eachMonthOfInterval(range);
    return intervals.map((date) => ({
      label: format(date, 'LLL', { locale: ru }),
      amount: sumIn(date, endOfMonth(date)),
    }));
  }, [period, range, periodTx]);

  // Доп. фильтр истории по сумме операции (период уже задаёт диапазон дат).
  const filteredHistory = useMemo(() => {
    const min = amountMin ? parseFloat(amountMin) : null;
    const max = amountMax ? parseFloat(amountMax) : null;
    return periodTx
      .filter((t) => {
        const amt = Number(t.amount);
        if (min !== null && amt < min) return false;
        if (max !== null && amt > max) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodTx, amountMin, amountMax]);

  const hasActiveFilters = !!(amountMin || amountMax);

  const resetFilters = () => {
    setAmountMin('');
    setAmountMax('');
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Шапка */}
      <div className="pt-1">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="text-sm text-muted-foreground font-semibold">
          {isIncome ? 'Сколько заработал' : 'Сколько потратил'}
        </p>
      </div>

      {/* Переключатель периода — управляет всей страницей */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="day" className="text-sm font-bold">День</TabsTrigger>
          <TabsTrigger value="week" className="text-sm font-bold">Неделя</TabsTrigger>
          <TabsTrigger value="month" className="text-sm font-bold">Месяц</TabsTrigger>
          <TabsTrigger value="year" className="text-sm font-bold">Год</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Hero: итог за период + тренд */}
      <Card className="p-5 overflow-hidden">
        <div className="text-sm text-muted-foreground font-semibold mb-1">
          {(isIncome ? 'Доходы ' : 'Расходы ') + PERIOD_LABEL[period]}
        </div>
        <div className={`text-4xl font-black mb-4 ${isIncome ? 'text-accent' : ''}`}>
          {formatMoney(totalAmount, baseCurrency)}
        </div>
        <div className="-mx-5 -mb-5">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                formatter={(value: number) => [formatMoney(value, baseCurrency), '']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={accentColor}
                strokeWidth={3}
                fill={`url(#fill-${type})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Разбивка по категориям за период */}
      {categoryStats.length > 0 && (
        <Card className="p-5">
          <div className="text-sm font-bold mb-3 text-muted-foreground">По категориям</div>
          <div className="space-y-3">
            {categoryStats.map(([category, amount]) => {
              const share = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold">{category}</span>
                    <span className="font-bold">{formatMoney(amount, baseCurrency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(share, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* История + фильтр по сумме */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-black">История</div>
          <Button
            variant="ghost"
            size="sm"
            className={`font-bold ${hasActiveFilters ? 'text-accent' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Фильтр
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Сумма от</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Сумма до</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="∞"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="w-full font-bold" onClick={resetFilters}>
                Сбросить
              </Button>
            )}
          </Card>
        )}

        {isLoading ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">Загрузка...</p>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">
              {periodTx.length === 0
                ? `Нет операций ${PERIOD_LABEL[period]}`
                : 'Ничего не найдено по фильтру'}
            </p>
          </Card>
        ) : (
          filteredHistory.map((transaction) => {
            const cat = getCategory(transaction.categoryId);
            return (
              <Card
                key={transaction.id}
                className="p-4 cursor-pointer hover:bg-accent/10 active:scale-[0.99] transition-all"
                onClick={() => setEditTx(transaction)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: (cat?.color ?? '#999') + '20' }}
                  >
                    {cat?.icon ?? '🏷️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{transaction.description}</div>
                    <div className="text-xs text-muted-foreground font-semibold truncate">
                      {getAccountName(transaction.accountId)} ·{' '}
                      {new Date(transaction.date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <div className={`text-lg font-black shrink-0 ${amountClass}`}>
                    {sign}
                    {formatMoney(Number(transaction.amount), transaction.currency)}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* FAB добавления — над нижней навигацией (5rem) + safe-area, поверх по z-index */}
      <Button
        size="lg"
        className="fixed h-16 w-16 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-foreground z-50"
        style={{
          right: 'calc(1rem + env(safe-area-inset-right))',
          bottom: 'calc(5rem + env(safe-area-inset-bottom) + 1rem)',
        }}
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-8 w-8" />
      </Button>

      <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} type={type} />

      <EditTransactionDialog
        open={!!editTx}
        onOpenChange={(open) => !open && setEditTx(null)}
        transaction={editTx}
      />
    </div>
  );
}
