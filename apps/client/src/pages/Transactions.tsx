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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
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

export default function Transactions({ type }: TransactionsProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || 'Без категории';
  const getAccountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name || 'Без счета';

  // Агрегаты считаем в базовой валюте (amountInBase) — транзакции бывают в разных валютах
  const categoryStats = transactions.reduce((acc, t) => {
    const name = getCategoryName(t.categoryId);
    acc[name] = (acc[name] || 0) + Number(t.amountInBase ?? t.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Number(t.amountInBase ?? t.amount),
    0
  );

  const chartData = useMemo(() => {
    const now = new Date();
    let intervals: Date[] = [];
    let dateRange: Interval;

    if (period === 'week') {
      dateRange = { start: startOfWeek(now, { locale: ru }), end: endOfWeek(now, { locale: ru }) };
      intervals = eachDayOfInterval(dateRange);
    } else if (period === 'month') {
      dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
      intervals = eachWeekOfInterval(dateRange);
    } else {
      dateRange = { start: startOfYear(now), end: endOfYear(now) };
      intervals = eachMonthOfInterval(dateRange);
    }

    return intervals.map((date) => {
      let rangeStart: Date;
      let rangeEnd: Date;
      let label: string;

      if (period === 'week') {
        rangeStart = date;
        rangeEnd = date;
        label = format(date, 'EEE', { locale: ru });
      } else if (period === 'month') {
        rangeStart = date;
        rangeEnd = endOfWeek(date, { locale: ru });
        label = format(date, 'd MMM', { locale: ru });
      } else {
        rangeStart = date;
        rangeEnd = endOfMonth(date);
        label = format(date, 'LLL', { locale: ru });
      }

      const amount = transactions
        .filter((t) => isWithinInterval(new Date(t.date), { start: rangeStart, end: rangeEnd }))
        .reduce((sum, t) => sum + Number(t.amountInBase ?? t.amount), 0);

      return { label, amount };
    });
  }, [period, transactions]);

  // Фильтры применяются к списку «История» (по дате и сумме операции)
  const filteredHistory = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);
    const min = amountMin ? parseFloat(amountMin) : null;
    const max = amountMax ? parseFloat(amountMax) : null;

    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      const amt = Number(t.amount);
      if (min !== null && amt < min) return false;
      if (max !== null && amt > max) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo, amountMin, amountMax]);

  const hasActiveFilters = !!(dateFrom || dateTo || amountMin || amountMax);

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">{title}</h1>
        <p className="text-muted-foreground font-semibold">
          {isIncome ? 'Сколько заработал' : 'Сколько потратил'}
        </p>
      </div>

      {/* Итог */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground font-semibold mb-2">
          {isIncome ? 'Всего доходов' : 'Всего расходов'}
        </div>
        <div className={`text-5xl font-black ${isIncome ? 'text-accent' : ''}`}>
          {formatMoney(totalAmount, baseCurrency)}
        </div>
      </div>

      {/* График */}
      <Card className="p-6 mb-6">
        <div className="text-sm font-bold mb-4 text-muted-foreground">
          {isIncome ? 'График доходов' : 'График расходов'}
        </div>
        <div className="mb-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month' | 'year')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week" className="text-sm font-bold">
                Неделя
              </TabsTrigger>
              <TabsTrigger value="month" className="text-sm font-bold">
                Месяц
              </TabsTrigger>
              <TabsTrigger value="year" className="text-sm font-bold">
                Год
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontWeight: 'bold',
              }}
              formatter={(value: number) => formatMoney(value, baseCurrency)}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={isIncome ? 'hsl(var(--accent))' : 'hsl(var(--foreground))'}
              strokeWidth={3}
              dot={{ fill: isIncome ? 'hsl(var(--accent))' : 'hsl(var(--foreground))', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Разбивка по категориям */}
      {Object.keys(categoryStats).length > 0 && (
        <Card className="p-6 mb-6">
          <div className="text-sm font-bold mb-3 text-muted-foreground">По категориям:</div>
          <div className="space-y-3">
            {Object.entries(categoryStats)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="font-semibold">{category}</span>
                  <span className="font-bold">{formatMoney(amount, baseCurrency)}</span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* История + фильтры */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-lg font-black">История</div>
          <Button
            variant="ghost"
            size="sm"
            className={`font-bold ${hasActiveFilters ? 'text-accent' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Фильтры
          </Button>
        </div>

        {showFilters && (
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Дата с</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Дата по</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
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
                Сбросить фильтры
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
              {transactions.length === 0
                ? isIncome
                  ? 'Нет доходов'
                  : 'Нет расходов'
                : 'Ничего не найдено по фильтрам'}
            </p>
          </Card>
        ) : (
          filteredHistory.map((transaction) => (
            <Card
              key={transaction.id}
              className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
              onClick={() => setEditTx(transaction)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg mb-1">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground font-semibold">
                    {getCategoryName(transaction.categoryId)} • {getAccountName(transaction.accountId)}
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold mt-1">
                    {new Date(transaction.date).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className={`text-xl font-black ${amountClass}`}>
                  {sign}
                  {formatMoney(Number(transaction.amount), transaction.currency)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Кнопка добавления */}
      <Button
        size="lg"
        className="fixed bottom-24 h-16 w-16 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-foreground"
        style={{ right: 'calc(1.5rem + env(safe-area-inset-right))' }}
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
