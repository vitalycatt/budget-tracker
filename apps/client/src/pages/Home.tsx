import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { TransactionType } from "@/stores/financeStore";
import { Card } from "@/components/ui/card";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: transactions = [], isLoading } = useTransactions(activeTab);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const totalAmount = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "Без категории";
  };

  const getAccountName = (id: string) => {
    return accounts.find((a) => a.id === id)?.name || "Без счета";
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Финансы</h1>
        <p className="text-muted-foreground font-semibold">Личный трекер</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TransactionType)}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted">
          <TabsTrigger
            value="income"
            className="text-base font-bold data-[state=active]:bg-accent data-[state=active]:text-foreground"
          >
            Доход
          </TabsTrigger>
          <TabsTrigger
            value="expense"
            className="text-base font-bold data-[state=active]:bg-accent data-[state=active]:text-foreground"
          >
            Расход
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-6">
          <div className="mb-6">
            <div className="text-sm text-muted-foreground font-semibold mb-2">
              Всего доходов
            </div>
            <div className="text-5xl font-black">
              {totalAmount.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">
                  Загрузка...
                </p>
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">
                  Нет доходов
                </p>
              </Card>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg mb-1">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-muted-foreground font-semibold">
                        {getCategoryName(transaction.categoryId)} •{" "}
                        {getAccountName(transaction.accountId)}
                      </div>
                    </div>
                    <div className="text-xl font-black text-accent">
                      +{Number(transaction.amount).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-6">
          <div className="mb-6">
            <div className="text-sm text-muted-foreground font-semibold mb-2">
              Всего расходов
            </div>
            <div className="text-5xl font-black">
              {totalAmount.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">
                  Загрузка...
                </p>
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground font-semibold">
                  Нет расходов
                </p>
              </Card>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg mb-1">
                        {transaction.description}
                      </div>
                      <div className="text-sm text-muted-foreground font-semibold">
                        {getCategoryName(transaction.categoryId)} •{" "}
                        {getAccountName(transaction.accountId)}
                      </div>
                    </div>
                    <div className="text-xl font-black">
                      -{Number(transaction.amount).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        size="lg"
        className="fixed bottom-24 h-16 w-16 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-foreground"
        style={{ right: "calc(1.5rem + env(safe-area-inset-right))" }}
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-8 w-8" />
      </Button>

      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={activeTab}
      />
    </div>
  );
}
