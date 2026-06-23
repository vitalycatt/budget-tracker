import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePickerDrawer from "@/components/DatePickerDrawer";
import type { Transaction, TransactionType } from "@/stores/financeStore";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

/** Преобразует дату транзакции в формат yyyy-mm-dd для <input type="date">. */
function toDateInput(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export default function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: EditTransactionDialogProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  // Архивные счета прячем из выбора, но текущий счёт операции оставляем доступным.
  const selectableAccounts = accounts.filter(
    (a) => !a.isArchived || a.id === accountId,
  );
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setAccountId(transaction.accountId);
      setCategoryId(transaction.categoryId);
      setDescription(transaction.description);
      setDate(toDateInput(transaction.date));
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    // Если выбранная категория не подходит новому типу — сбрасываем
    const stillValid = categories.some((c) => c.id === categoryId && c.type === next);
    if (!stillValid) {
      setCategoryId("");
    }
  };

  const canSave =
    !!transaction &&
    parseFloat(amount) > 0 &&
    !!accountId &&
    !!categoryId &&
    !!description.trim() &&
    !!date;

  const handleSave = () => {
    if (!transaction || !canSave) {
      return;
    }
    updateTransaction.mutate(
      {
        id: transaction.id,
        data: {
          type,
          amount: parseFloat(amount),
          accountId,
          categoryId,
          description: description.trim(),
          date,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const handleDelete = () => {
    if (!transaction) {
      return;
    }
    deleteTransaction.mutate(transaction.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-black">Редактировать операцию</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as TransactionType[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleTypeChange(option)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  type === option ? "border-accent bg-accent/10" : "border-input"
                }`}
              >
                <div className="font-semibold">{option === "expense" ? "Расход" : "Доход"}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount" className="font-bold">Сумма</Label>
            <Input
              id="edit-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Счёт</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="font-semibold">
                <SelectValue placeholder="Выберите счёт" />
              </SelectTrigger>
              <SelectContent>
                {selectableAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency}){a.isArchived ? ' · архив' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="font-semibold">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc" className="font-bold">Описание</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Дата</Label>
            <DatePickerDrawer value={date} onChange={setDate} title="Дата операции" disableFuture />
          </div>
        </div>

        <DrawerFooter className="pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
          <Button
            onClick={handleSave}
            disabled={!canSave || updateTransaction.isPending}
            className="w-full font-bold bg-accent hover:bg-accent/90 text-foreground"
          >
            Сохранить
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTransaction.isPending}
            className="w-full font-bold"
          >
            Удалить операцию
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
