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
  Drawer,
  DrawerTitle,
  DrawerHeader,
  DrawerContent,
} from "@/components/ui/drawer";
import DatePickerDrawer from "@/components/DatePickerDrawer";

/** Шаги ввода: сначала категория, потом счёт (он задаёт валюту), потом сумма. */
type Step = "category" | "account" | "amount";

const accountEmoji = (type: Account["type"]) =>
  type === "bank" ? "🏦" : type === "card" ? "💳" : "💵";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
}

const NEW_CATEGORY_ICONS = ["🏷️", "🍔", "🚌", "🏠", "🎮", "💊", "🛍️", "💰", "🎁", "✨", "📱", "✈️"];
const NEW_CATEGORY_COLORS = ["#F97316", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#22C55E", "#EF4444"];

/** Дата → строка yyyy-mm-dd для <input type="date"> (в локальном времени, без сдвига по UTC). */
const toDateInput = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const todayInput = () => toDateInput(new Date());

export default function AddTransactionDialog({
  open,
  onOpenChange,
  type,
}: AddTransactionDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("category");
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  // Создание категории на лету
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(NEW_CATEGORY_ICONS[0]);
  const [newColor, setNewColor] = useState(NEW_CATEGORY_COLORS[0]);
  // Дата операции (yyyy-mm-dd). По умолчанию сегодня — но можно внести задним числом.
  const [date, setDate] = useState(todayInput());

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
    setStep("category");
    setAmount("");
    setSelectedAccount(null);
    setSelectedCategory(null);
    setCreatingCategory(false);
    setNewName("");
    setNewIcon(NEW_CATEGORY_ICONS[0]);
    setNewColor(NEW_CATEGORY_COLORS[0]);
    setDate(todayInput());
  };

  const handleNumberClick = (num: string) => {
    if (amount.length < 10) {
      setAmount(amount + num);
    }
  };

  const handleDelete = () => setAmount(amount.slice(0, -1));

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep("account");
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setStep("amount");
  };

  // Символ валюты выбранного счёта — показываем рядом с суммой при вводе.
  const currencySymbol = selectedAccount
    ? CURRENCY_META[selectedAccount.currency]?.symbol ?? selectedAccount.currency
    : "";

  // Финальный шаг (сумма): категория и счёт уже выбраны — сохраняем операцию.
  const submitTransaction = () => {
    if (!selectedAccount || !selectedCategory || !amount || parseFloat(amount) <= 0) {
      return;
    }
    createTransaction.mutate(
      {
        type,
        amount: parseFloat(amount),
        categoryId: selectedCategory.id,
        accountId: selectedAccount.id,
        description: selectedCategory.name,
        // Полдень локального времени — чтобы выбранная дата не «сползла» на сутки при конвертации в UTC.
        date: new Date(`${date}T12:00:00`),
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
    setSelectedCategory(created);
    setCreatingCategory(false);
    setStep("account");
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const title = type === "income" ? "Новый доход" : "Новый расход";

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[92vh]">
        {/* Шаг 2 — счёт (задаёт валюту операции) */}
        {step === "account" && (
          <>
            <DrawerHeader className="text-left">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStep("category")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle className="text-2xl font-black">{title}</DrawerTitle>
              </div>
            </DrawerHeader>
            <p className="text-sm text-muted-foreground font-semibold -mt-2 px-4">
              Выберите счёт — от него зависит валюта операции
            </p>
            <div className="space-y-3 overflow-y-auto px-4 pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
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

        {/* Шаг 3 — сумма в валюте выбранного счёта (финальный шаг — сохраняет) */}
        {step === "amount" && selectedAccount && (
          <>
            <DrawerHeader className="text-left">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStep("account")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle className="text-2xl font-black">{title}</DrawerTitle>
              </div>
            </DrawerHeader>
            <div className="space-y-6 overflow-y-auto px-4 pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
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

              {/* Дата операции: по умолчанию сегодня, можно внести задним числом. */}
              <div className="space-y-2">
                <Label className="font-bold">Дата операции</Label>
                <DatePickerDrawer
                  value={date}
                  onChange={setDate}
                  title="Дата операции"
                  disableFuture
                />
              </div>

              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 text-foreground"
                onClick={submitTransaction}
                disabled={!amount || parseFloat(amount) <= 0}
                loading={createTransaction.isPending}
              >
                Сохранить
              </Button>
            </div>
          </>
        )}

        {/* Шаг 1 — категория (первый шаг ввода) */}
        {step === "category" && !creatingCategory && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-2xl font-black">{title}</DrawerTitle>
            </DrawerHeader>
            <p className="text-sm text-muted-foreground font-semibold -mt-2 px-4">
              Выберите категорию
            </p>
            <div className="space-y-3 overflow-y-auto px-4 pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
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
              ))}
            </div>
          </>
        )}

        {step === "category" && creatingCategory && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-2xl font-black">Новая категория</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 py-2 overflow-y-auto px-4 pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
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
                  disabled={!newName.trim()}
                  loading={createCategory.isPending}
                >
                  Создать и продолжить
                </Button>
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
