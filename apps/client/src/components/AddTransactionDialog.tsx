import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TransactionType, Account, Category } from "@/stores/financeStore";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useCreateTransaction } from "@/hooks/use-transactions";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from "@/components/ui/dialog";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
}

export default function AddTransactionDialog({
  open,
  onOpenChange,
  type,
}: AddTransactionDialogProps) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>(type);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createTransaction = useCreateTransaction();
  const filteredCategories = categories.filter(
    (category) => category.type === transactionType
  );

  useEffect(() => {
    if (!open) {
      setTransactionType(type);
    }
  }, [type, open]);

  const resetDialog = () => {
    setStep(1);
    setAmount("");
    setSelectedAccount(null);
    setDescription("");
    setTransactionType(type);
  };

  const handleNumberClick = (num: string) => {
    if (amount.length < 10) {
      setAmount(amount + num);
    }
  };

  const handleDelete = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleOk = () => {
    if (amount && parseFloat(amount) > 0) {
      setStep(2);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setStep(3);
  };

  const handleCategorySelect = (category: Category) => {
    if (selectedAccount && amount) {
      const numAmount = parseFloat(amount);

      createTransaction.mutate(
        {
          type: transactionType,
          amount: numAmount,
          categoryId: category.id,
          accountId: selectedAccount.id,
          description: description || category.name,
          date: new Date(),
        },
        {
          onSuccess: () => {
            resetDialog();
            onOpenChange(false);
          },
        }
      );
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleTypeChange = (nextType: TransactionType) => {
    if (transactionType === nextType) {
      return;
    }
    setTransactionType(nextType);
    setStep(1);
    setSelectedAccount(null);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                {transactionType === "income" ? "Новый доход" : "Новый расход"}
              </DialogTitle>
            </DialogHeader>
            <TypeToggle value={transactionType} onChange={handleTypeChange} />
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-5xl font-black mb-2">
                  {amount || "0"} ₽
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  ".",
                  "0",
                  "⌫",
                ].map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    onClick={() => {
                      if (key === "⌫") {
                        handleDelete();
                      } else {
                        handleNumberClick(key);
                      }
                    }}
                  >
                    {key}
                  </Button>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 text-foreground"
                onClick={handleOk}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                ОК
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                Выберите счет
              </DialogTitle>
            </DialogHeader>
            <TypeToggle value={transactionType} onChange={handleTypeChange} />
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: account.color + "20" }}
                      >
                        {account.type === "bank" && "🏦"}
                        {account.type === "card" && "💳"}
                        {account.type === "cash" && "💵"}
                      </div>
                      <div>
                        <div className="font-bold">{account.name}</div>
                        <div className="text-sm text-muted-foreground font-semibold">
                          {account.balance.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                Выберите категорию
              </DialogTitle>
            </DialogHeader>
            <TypeToggle value={transactionType} onChange={handleTypeChange} />
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <Card className="p-4 text-center">
                  <div className="text-muted-foreground font-semibold">
                    Нет категорий для{" "}
                    {transactionType === "income" ? "доходов" : "расходов"}
                  </div>
                </Card>
              ) : (
                filteredCategories.map((category) => (
                  <Card
                    key={category.id}
                    className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: category.color + "20" }}
                      >
                        {category.icon}
                      </div>
                      <div className="font-bold">{category.name}</div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {(["expense", "income"] as TransactionType[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-xl border p-3 text-left transition-all ${
            value === option ? "border-accent bg-accent/10" : "border-input"
          }`}
        >
          <div className="font-semibold">
            {option === "income" ? "Доход" : "Расход"}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {option === "income" ? "Поступление на счет" : "Списание со счета"}
          </div>
        </button>
      ))}
    </div>
  );
}
