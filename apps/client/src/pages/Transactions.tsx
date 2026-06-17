import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { TransactionType } from '@/stores/financeStore';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, isWithinInterval, type Interval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTransactions } from '@/hooks/use-transactions';
import { useCategories } from '@/hooks/use-categories';
import { useAccounts } from '@/hooks/use-accounts';

export default function Transactions() {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const { data: transactions = [], isLoading } = useTransactions(activeTab);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || 'Без категории';
  };

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || 'Без счета';
  };

  const categoryStats = transactions.reduce((acc, t) => {
    const name = getCategoryName(t.categoryId);
    acc[name] = (acc[name] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

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
        .filter((t) => {
          const tDate = new Date(t.date);
          return isWithinInterval(tDate, { start: rangeStart, end: rangeEnd });
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { label, amount };
    });
  }, [period, transactions]);

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Операции</h1>
        <p className="text-muted-foreground font-semibold">Статистика и история</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionType)} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted">
          <TabsTrigger value="income" className="text-base font-bold data-[state=active]:bg-accent data-[state=active]:text-foreground">
            Доход
          </TabsTrigger>
          <TabsTrigger value="expense" className="text-base font-bold data-[state=active]:bg-accent data-[state=active]:text-foreground">
            Расход
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="text-sm font-bold mb-4 text-muted-foreground">График доходов</div>
            <div className="mb-4">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month' | 'year')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="year" className="text-sm font-bold">
                    Год
                  </TabsTrigger>
                  <TabsTrigger value="month" className="text-sm font-bold">
                    Месяц
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
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground font-semibold mb-2">Всего доходов</div>
              <div className="text-5xl font-black text-accent">
                {totalAmount.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-bold mb-3 text-muted-foreground">По категориям:</div>
              {Object.entries(categoryStats).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="font-semibold">{category}</span>
                  <span className="font-bold">{amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            <div className="text-lg font-black mb-3">История</div>
            {isLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">Загрузка...</p>
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">Нет операций</p>
              </Card>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
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
                    <div className="text-xl font-black text-accent">
                      +{Number(transaction.amount).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-6 space-y-6">
          <Card className="p-6">
            <div className="text-sm font-bold mb-4 text-muted-foreground">График расходов</div>
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
                    fontWeight: 'bold'
                  }}
                  formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--foreground))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--foreground))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground font-semibold mb-2">Всего расходов</div>
              <div className="text-5xl font-black">
                {totalAmount.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-bold mb-3 text-muted-foreground">По категориям:</div>
              {Object.entries(categoryStats).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="font-semibold">{category}</span>
                  <span className="font-bold">{amount.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            <div className="text-lg font-black mb-3">История</div>
            {isLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">Загрузка...</p>
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">Нет операций</p>
              </Card>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
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
                    <div className="text-xl font-black">
                      -{Number(transaction.amount).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
