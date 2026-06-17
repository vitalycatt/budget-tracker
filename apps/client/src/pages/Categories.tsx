import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Category, TransactionType } from "@/stores/financeStore";
import CategoryDialog from "@/components/CategoryDialog";
import { useCategories } from "@/hooks/use-categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Categories() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [activeType, setActiveType] = useState<TransactionType>("expense");
  const { data: categories = [], isLoading } = useCategories();

  const handleCreate = () => {
    setSelectedCategory(null);
    setDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Категории</h1>
        <p className="text-muted-foreground font-semibold">
          Управление категориями
        </p>
      </div>

      <Button
        size="lg"
        className="w-full mb-6 h-14 bg-accent hover:bg-accent/90 text-foreground font-bold text-lg"
        onClick={handleCreate}
      >
        {activeType === "income"
          ? "Создать категорию доходов"
          : "Создать категорию расходов"}
      </Button>

      <Tabs
        value={activeType}
        onValueChange={(value) => setActiveType(value as TransactionType)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="expense" className="font-semibold">
            Расходы
          </TabsTrigger>
          <TabsTrigger value="income" className="font-semibold">
            Доходы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <CategoryList
            categories={categories.filter(
              (category) => category.type === "expense"
            )}
            isLoading={isLoading}
            onEdit={handleEdit}
            emptyMessage="Нет категорий расходов"
          />
        </TabsContent>
        <TabsContent value="income">
          <CategoryList
            categories={categories.filter(
              (category) => category.type === "income"
            )}
            isLoading={isLoading}
            onEdit={handleEdit}
            emptyMessage="Нет категорий доходов"
          />
        </TabsContent>
      </Tabs>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        defaultType={activeType}
      />
    </div>
  );
}

function CategoryList({
  categories,
  isLoading,
  onEdit,
  emptyMessage,
}: {
  categories: Category[];
  isLoading: boolean;
  onEdit: (category: Category) => void;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground font-semibold">Загрузка...</p>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground font-semibold">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <Card key={category.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: category.color + "20" }}
              >
                {category.icon}
              </div>
              <div>
                <div className="font-bold text-lg">{category.name}</div>
                <div className="text-sm text-muted-foreground font-semibold">
                  {category.type === "income"
                    ? "Категория доходов"
                    : "Категория расходов"}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => onEdit(category)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
