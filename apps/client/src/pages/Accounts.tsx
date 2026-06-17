import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Account } from '@/stores/financeStore';
import AccountDialog from '@/components/AccountDialog';
import { useAccounts } from '@/hooks/use-accounts';

const accountIcons = {
  bank: '🏦',
  card: '💳',
  cash: '💵',
};

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { data: accounts = [], isLoading } = useAccounts();

  const handleCreate = () => {
    setSelectedAccount(null);
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Счета</h1>
        <p className="text-muted-foreground font-semibold">Управление счетами</p>
      </div>

      <Button
        size="lg"
        className="w-full mb-6 h-14 bg-accent hover:bg-accent/90 text-foreground font-bold text-lg"
        onClick={handleCreate}
      >
        Создать счет
      </Button>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">Загрузка...</p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">Нет счетов</p>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: account.color + '20' }}
                  >
                    {accountIcons[account.type]}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{account.name}</div>
                    <div className="text-sm text-muted-foreground font-semibold capitalize">
                      {account.type === 'bank' && 'Банковский'}
                      {account.type === 'card' && 'Карта'}
                      {account.type === 'cash' && 'Наличные'}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={() => handleEdit(account)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="text-sm text-muted-foreground font-semibold mb-1">Баланс</div>
                <div className="text-3xl font-black">{Number(account.balance).toLocaleString('ru-RU')} ₽</div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
      />
    </div>
  );
}
