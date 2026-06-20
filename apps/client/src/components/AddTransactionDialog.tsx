import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TransactionType, Account, Category } from "@/stores/financeStore";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { formatMoney, CURRENCY_META } from "@swt/shared";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from "@/components/ui/dialog";

/** Шаги ввода: сначала счёт (он задаёт валюту), потом сумма, потом категория. */
type Step = "account" | "amount" | "category";

const accountEmoji = (type: Account["type"]) =>
  type === "bank" ? "🏦" : type === "card" ? "💳" : "💵";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
}

const NEW_CATEGORY_ICONS = ["🏷️", "🍔", "🚌", "🏠", "🎮", "💊", "🛍️", "💰", "🎁", "✨", "📱", "✈️"];
const NEW_CATEGORY_COLORS = ["#F97316", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#22C55E", "#EF4444"];

export default function AddTransactionDialog({
  open,
  onOpenChange,
  type,
}: AddTransactionDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("account");
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // Создание категории на лету
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(NEW_CATEGORY_ICONS[0]);
  const [newColor, setNewColor] = useState(NEW_CATEGORY_COLORS[0]);

  const { data: allAccounts = [] } = useAccounts();
  const accounts = allAccounts.filter((a) => !a.isArchived);
  const { data: categories = [] } = useCategories();
  const createTransaction = useCreateTransaction();
  const createCategory = useCreateCategory();
  const filteredCategories = categories.filter((category) => category.type === type);

  useEffect(() => {
    if (!open) {
      resetDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetDialog = () => {
    setStep("account");
    setAmount("");
    setSelectedAccount(null);
    setCreatingCategory(false);
    setNewName("");
    setNewIcon(NEW_CATEGORY_ICONS[0]);
    setNewColor(NEW_CATEGORY_COLORS[0]);
  };

  const handleNumberClick = (num: string) => {
    if (amount.length < 10) {
      setAmount(amount + num);
    }
  };

  const handleDelete = () => setAmount(amount.slice(0, -1));

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setStep("amount");
  };

  const handleOk = () => {
    if (amount && parseFloat(amount) > 0) {
      setStep("category");
    }
  };

  // Символ валюты выбранного счёта — показываем рядом с суммой при вводе.
  const currencySymbol = selectedAccount
    ? CURRENCY_META[selectedAccount.currency]?.symbol ?? selectedAccount.currency
    : "";

  const submitTransaction = (category: Category) => {
    if (!selectedAccount || !amount) {
      return;
    }
    createTransaction.mutate(
      {
        type,
        amount: parseFloat(amount),
        categoryId: category.id,
        accountId: selectedAccount.id,
        description: category.name,
        date: new Date(),
      },
      {
        onSuccess: () => {
          resetDialog();
          onOpenChange(false);
        },
      }
    );
  };

  const handleCreateCategory = async () => {
    if (!newName.trim()) {
      return;
    }
    const created = await createCategory.mutateAsync({
      name: newName.trim(),
      icon: newIcon,
      color: newColor,
      type,
    });
    submitTransaction(created);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const title = type === "income" ? "Новый доход" : "Новый расход";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        {/* Шаг 1 — счёт (задаёт валюту операции) */}
        {step === "account" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground font-semibold -mt-2">
              Выберите счёт — от него зависит валюта операции
            </p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {accounts.length === 0 ? (
                <Card className="p-4 text-center space-y-3">
                  <div className="text-muted-foreground font-semibold">
                    Сначала создайте счёт на вкладке «Счета»
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleClose();
                      navigate("/accounts");
                    }}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Перейти к счетам
                  </Button>
                </Card>
              ) : (
                accounts.map((account) => (
                  <Card
                    key={account.id}
                    className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => handleAccountSelect(account)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: account.color + "20" }}
                      >
                        {accountEmoji(account.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">{account.name}</div>
                        <div className="text-sm text-muted-foreground font-semibold">
                          {formatMoney(Number(account.balance), account.currency)}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-muted-foreground">
                        {account.currency}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Шаг 2 — сумма в валюте выбранного счёта */}
        {step === "amount" && selectedAccount && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStep("account")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-2xl font-black">{title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="text-5xl font-black mb-2">
                  {amount || "0"}{" "}
                  <span className="text-3xl text-muted-foreground">{currencySymbol}</span>
                </div>
                <div className="text-sm text-muted-foreground font-semibold">
                  {accountEmoji(selectedAccount.type)} {selectedAccount.name} ·{" "}
                  {selectedAccount.currency}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((key) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    onClick={() => (key === "⌫" ? handleDelete() : handleNumberClick(key))}
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

        {step === "category" && !creatingCategory && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStep("amount")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-2xl font-black">Выберите категорию</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <Card
                className="p-4 cursor-pointer border-dashed hover:bg-accent/10 transition-colors"
                onClick={() => setCreatingCategory(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="font-bold">Новая категория</div>
                </div>
              </Card>

              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => submitTransaction(category)}
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
              ))}
            </div>
          </>
        )}

        {step === "category" && creatingCategory && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Новая категория</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cat-name" className="font-bold">Название</Label>
                <Input
                  id="cat-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={type === "income" ? "Подработка" : "Продукты"}
                  className="font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Иконка</Label>
                <div className="grid grid-cols-6 gap-2">
                  {NEW_CATEGORY_ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-11 h-11 rounded-lg border-2 flex items-center justify-center text-2xl transition-all"
                      style={{
                        borderColor: newIcon === i ? newColor : "transparent",
                        backgroundColor: newIcon === i ? newColor + "20" : "transparent",
                      }}
                      onClick={() => setNewIcon(i)}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Цвет</Label>
                <div className="flex flex-wrap gap-2">
                  {NEW_CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-9 h-9 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: newColor === c ? "black" : "transparent",
                        transform: newColor === c ? "scale(1.1)" : "scale(1)",
                      }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 font-bold"
                  onClick={() => setCreatingCategory(false)}
                >
                  Назад
                </Button>
                <Button
                  className="flex-1 font-bold bg-accent hover:bg-accent/90 text-foreground"
                  onClick={handleCreateCategory}
                  disabled={!newName.trim() || createCategory.isPending || createTransaction.isPending}
                >
                  Создать и добавить
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
