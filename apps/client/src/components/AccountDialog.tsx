import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Account } from '@/stores/financeStore';
import { CURRENCIES, CURRENCY_META, type Currency } from '@swt/shared';
import { useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/use-accounts';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

const accountTypes = [
  { value: 'bank' as const, label: 'Банковский', icon: '🏦' },
  { value: 'card' as const, label: 'Карта', icon: '💳' },
  { value: 'cash' as const, label: 'Наличные', icon: '💵' },
];

const colors = ['#BFFF00', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94'];

export default function AccountDialog({ open, onOpenChange, account }: AccountDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'card' | 'cash'>('card');
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(colors[0]);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCurrency(account.currency);
      setBalance(account.balance.toString());
      setColor(account.color);
    } else {
      setName('');
      setType('card');
      setCurrency('RUB');
      setBalance('0');
      setColor(colors[0]);
    }
  }, [account, open]);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    const accountData = {
      name: name.trim(),
      type,
      currency,
      balance: parseFloat(balance) || 0,
      color,
    };

    if (account) {
      updateAccount.mutate({ id: account.id, data: accountData }, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    } else {
      createAccount.mutate(accountData, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (account) {
      deleteAccount.mutate(account.id, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const handleToggleArchive = () => {
    if (account) {
      updateAccount.mutate(
        { id: account.id, data: { isArchived: !account.isArchived } },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-black">
            {account ? 'Редактировать счет' : 'Создать счет'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Основная карта"
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Тип</Label>
            <div className="grid grid-cols-3 gap-2">
              {accountTypes.map((t) => (
                <Button
                  key={t.value}
                  variant={type === t.value ? 'default' : 'outline'}
                  className="h-20 flex flex-col gap-2 font-bold"
                  onClick={() => setType(t.value)}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Валюта</Label>
            <div className="grid grid-cols-5 gap-2">
              {CURRENCIES.map((code) => (
                <Button
                  key={code}
                  type="button"
                  variant={currency === code ? 'default' : 'outline'}
                  disabled={!!account}
                  className="h-12 flex flex-col gap-0.5 font-bold p-1"
                  onClick={() => setCurrency(code)}
                >
                  <span className="text-sm">{CURRENCY_META[code].symbol}</span>
                  <span className="text-[10px]">{code}</span>
                </Button>
              ))}
            </div>
            {account && (
              <p className="text-xs text-muted-foreground font-medium">
                Валюту существующего счёта изменить нельзя
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance" className="font-bold">Начальный баланс</Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Цвет</Label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  className="w-10 h-10 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'black' : 'transparent',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter className="pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
          <Button
            onClick={handleSubmit}
            disabled={createAccount.isPending || updateAccount.isPending}
            className="w-full font-bold bg-accent hover:bg-accent/90 text-foreground"
          >
            {account ? 'Сохранить' : 'Создать'}
          </Button>
          {account && (
            <Button
              variant="outline"
              onClick={handleToggleArchive}
              disabled={updateAccount.isPending}
              className="w-full font-bold"
            >
              {account.isArchived ? 'Вернуть из архива' : 'Архивировать счёт'}
            </Button>
          )}
          {account && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
              className="w-full font-bold"
            >
              Удалить счет
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
