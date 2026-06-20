import { useState } from 'react';
import { ArrowRight, ChevronRight, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Account } from '@/stores/financeStore';
import { formatMoney } from '@swt/shared';
import AccountDialog from '@/components/AccountDialog';
import TransferDialog from '@/components/TransferDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Transfer } from '@/lib/api';
import { useAccounts } from '@/hooks/use-accounts';
import { useNetWorth } from '@/hooks/use-net-worth';
import { useTransfers, useDeleteTransfer } from '@/hooks/use-transfers';

const accountIcons = {
  bank: '🏦',
  card: '💳',
  cash: '💵',
};

const accountTypeLabel = {
  bank: 'Банковский',
  card: 'Карта',
  cash: 'Наличные',
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: netWorth } = useNetWorth();
  const { data: transfers = [] } = useTransfers();
  const deleteTransfer = useDeleteTransfer();
  const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Счёт';

  const confirmDeleteTransfer = () => {
    if (!transferToDelete) return;
    deleteTransfer.mutate(transferToDelete.id, {
      onSuccess: () => setTransferToDelete(null),
    });
  };

  const handleCreate = () => {
    setSelectedAccount(null);
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Шапка */}
      <div className="pt-1">
        <h1 className="text-2xl font-black">Счета</h1>
        <p className="text-sm text-muted-foreground font-semibold">Состояние и счета</p>
      </div>

      {/* Hero: общее состояние */}
      {netWorth && (
        <Card className="p-5 bg-accent/10 border-accent">
          <div className="text-sm text-muted-foreground font-semibold mb-1">
            Общее состояние
          </div>
          <div className="text-4xl font-black">
            {formatMoney(netWorth.total, netWorth.baseCurrency)}
          </div>
        </Card>
      )}

      {/* Перевод между счетами */}
      {accounts.length >= 2 && (
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 font-bold"
          onClick={() => setTransferOpen(true)}
        >
          <Repeat className="h-5 w-5 mr-2" />
          Перевести между счетами
        </Button>
      )}

      {/* Список счетов */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">Загрузка...</p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <p className="text-muted-foreground font-semibold">
              Пока нет ни одного счёта.
              <br />
              Создайте первый, чтобы вести баланс.
            </p>
            <Button
              size="lg"
              className="w-full h-14 bg-accent hover:bg-accent/90 text-foreground font-bold text-lg"
              onClick={handleCreate}
            >
              <Plus className="h-5 w-5 mr-2" />
              Создать первый счёт
            </Button>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card
              key={account.id}
              className="p-4 cursor-pointer hover:bg-accent/10 active:scale-[0.99] transition-all"
              onClick={() => handleEdit(account)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: account.color + '20' }}
                >
                  {accountIcons[account.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-lg truncate">{account.name}</div>
                  <div className="text-sm text-muted-foreground font-semibold">
                    {accountTypeLabel[account.type]}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black">
                    {formatMoney(Number(account.balance), account.currency)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* История переводов */}
      {transfers.length > 0 && (
        <div className="space-y-3">
          <div className="text-lg font-black">Переводы</div>
          {transfers.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold truncate">
                    <span className="truncate">{accountName(t.fromAccountId)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{accountName(t.toAccountId)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                    {new Date(t.date).toLocaleDateString('ru-RU')}
                    {t.description ? ` · ${t.description}` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black">
                    −{formatMoney(Number(t.amountFrom), t.currencyFrom)}
                  </div>
                  {t.currencyFrom !== t.currencyTo && (
                    <div className="text-xs font-bold text-accent">
                      +{formatMoney(Number(t.amountTo), t.currencyTo)}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  onClick={() => setTransferToDelete(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FAB добавления (когда счета уже есть) */}
      {accounts.length > 0 && (
        <Button
          size="lg"
          className="fixed h-16 w-16 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-foreground z-50"
          style={{
            right: 'calc(1rem + env(safe-area-inset-right))',
            bottom: 'calc(5rem + env(safe-area-inset-bottom) + 1rem)',
          }}
          onClick={handleCreate}
        >
          <Plus className="h-8 w-8" />
        </Button>
      )}

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
      />

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />

      <AlertDialog
        open={!!transferToDelete}
        onOpenChange={(open) => !open && setTransferToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить перевод?</AlertDialogTitle>
            <AlertDialogDescription>
              {transferToDelete && (
                <>
                  {accountName(transferToDelete.fromAccountId)} →{' '}
                  {accountName(transferToDelete.toAccountId)} ·{' '}
                  {formatMoney(Number(transferToDelete.amountFrom), transferToDelete.currencyFrom)}
                  . Балансы счетов будут возвращены к состоянию до перевода.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteTransfer}
              disabled={deleteTransfer.isPending}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
