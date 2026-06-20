import { useEffect, useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounts } from '@/hooks/use-accounts';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useCreateTransfer } from '@/hooks/use-transfers';
import { formatMoney, CURRENCY_META } from '@swt/shared';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const accountEmoji = (type: string) =>
  type === 'bank' ? '🏦' : type === 'card' ? '💳' : '💵';

const todayInput = () => new Date().toISOString().slice(0, 10);

export default function TransferDialog({ open, onOpenChange }: TransferDialogProps) {
  const { data: allAccounts = [] } = useAccounts();
  const accounts = allAccounts.filter((a) => !a.isArchived);
  const { data: exchange } = useExchangeRates();
  const createTransfer = useCreateTransfer();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [manualTo, setManualTo] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayInput());

  const reset = () => {
    setFromId('');
    setToId('');
    setAmountFrom('');
    setAmountTo('');
    setManualTo(false);
    setDescription('');
    setDate(todayInput());
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const sameCurrency = !!from && !!to && from.currency === to.currency;

  // Кросс-курс from→to через USD-пивот: rates[to] / rates[from]
  const crossRate = useMemo(() => {
    if (!from || !to || sameCurrency) return 1;
    const r = exchange?.rates;
    if (!r || !r[from.currency] || !r[to.currency]) return null;
    return r[to.currency] / r[from.currency];
  }, [from, to, sameCurrency, exchange]);

  // Авто-расчёт суммы зачисления, пока пользователь не правил её вручную
  useEffect(() => {
    if (manualTo) return;
    if (!amountFrom) {
      setAmountTo('');
      return;
    }
    const value = parseFloat(amountFrom);
    if (!from || !to || isNaN(value)) return;
    if (sameCurrency) {
      setAmountTo(amountFrom);
    } else if (crossRate != null) {
      setAmountTo((value * crossRate).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountFrom, fromId, toId, sameCurrency, crossRate, manualTo]);

  const amountFromNum = parseFloat(amountFrom) || 0;
  const amountToNum = parseFloat(amountTo) || 0;
  const insufficient = !!from && amountFromNum > Number(from.balance);

  const canSubmit =
    !!from &&
    !!to &&
    fromId !== toId &&
    amountFromNum > 0 &&
    amountToNum > 0 &&
    !insufficient &&
    !createTransfer.isPending;

  const handleSubmit = () => {
    if (!canSubmit || !from || !to) return;
    createTransfer.mutate(
      {
        fromAccountId: from.id,
        toAccountId: to.id,
        amountFrom: amountFromNum,
        amountTo: amountToNum,
        description: description.trim(),
        date: new Date(date),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  const symbolFrom = from ? CURRENCY_META[from.currency]?.symbol ?? from.currency : '';
  const symbolTo = to ? CURRENCY_META[to.currency]?.symbol ?? to.currency : '';

  const renderAccountItem = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return null;
    return (
      <span className="flex items-center gap-2">
        <span>{accountEmoji(a.type)}</span>
        <span className="font-semibold">{a.name}</span>
        <span className="text-muted-foreground">
          {formatMoney(Number(a.balance), a.currency)}
        </span>
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Перевод</DialogTitle>
        </DialogHeader>

        {accounts.length < 2 ? (
          <p className="text-muted-foreground font-semibold py-4 text-center">
            Нужно минимум два счёта, чтобы делать переводы.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Откуда */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Откуда</Label>
              <Select
                value={fromId}
                onValueChange={(v) => {
                  setFromId(v);
                  setManualTo(false);
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Счёт списания">
                    {fromId && renderAccountItem(fromId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === toId}>
                      {renderAccountItem(a.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Сумма списания */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Сумма списания {symbolFrom && `(${symbolFrom})`}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amountFrom}
                onChange={(e) => {
                  setAmountFrom(e.target.value);
                  setManualTo(false);
                }}
                placeholder="0"
                className="h-12 text-lg font-bold"
              />
              {insufficient && (
                <p className="text-xs font-semibold text-destructive">
                  Недостаточно средств: доступно{' '}
                  {from && formatMoney(Number(from.balance), from.currency)}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <ArrowDown className="w-5 h-5" />
              </div>
            </div>

            {/* Куда */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Куда</Label>
              <Select
                value={toId}
                onValueChange={(v) => {
                  setToId(v);
                  setManualTo(false);
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Счёт зачисления">
                    {toId && renderAccountItem(toId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                      {renderAccountItem(a.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Сумма зачисления — показываем при разных валютах (можно править) */}
            {from && to && !sameCurrency && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Зачислится {symbolTo && `(${symbolTo})`}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amountTo}
                  onChange={(e) => {
                    setAmountTo(e.target.value);
                    setManualTo(true);
                  }}
                  placeholder="0"
                  className="h-12 text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground font-semibold">
                  {crossRate != null
                    ? `По курсу 1 ${from.currency} ≈ ${crossRate.toFixed(4)} ${to.currency}. Можно поправить под фактический курс банка.`
                    : 'Курс недоступен — укажите сумму зачисления вручную.'}
                </p>
              </div>
            )}

            {/* Заметка + дата */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Дата</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Заметка</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="необязательно"
                  className="h-12 font-semibold"
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 text-foreground"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Перевести
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
