import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category, TransactionType } from '@/stores/financeStore';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/use-categories';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  defaultType?: TransactionType;
}

const icons = ['🏠', '🚗', '🛒', '📱', '🍕', '💊', '🎮', '✈️', '👕', '📚', '🎬', '🏋️'];
const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#BFFF00'];

export default function CategoryDialog({
  open,
  onOpenChange,
  category,
  defaultType = 'expense',
}: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(icons[0]);
  const [color, setColor] = useState(colors[0]);
  const [type, setType] = useState<TransactionType>(defaultType);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setType(category.type);
    } else {
      setName('');
      setIcon(icons[0]);
      setColor(colors[0]);
      setType(defaultType);
    }
  }, [category, open, defaultType]);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    const categoryData = {
      name: name.trim(),
      icon,
      color,
      type,
    };

    if (category) {
      updateCategory.mutate({ id: category.id, data: categoryData }, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    } else {
      createCategory.mutate(categoryData, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (category) {
      deleteCategory.mutate(category.id, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {category ? 'Редактировать категорию' : 'Создать категорию'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="font-bold">Тип</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as TransactionType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    type === option ? 'border-accent bg-accent/10' : 'border-input'
                  }`}
                >
                  <div className="font-semibold">
                    {option === 'expense' ? 'Расходы' : 'Доходы'}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {option === 'expense' ? 'Категория списаний' : 'Категория поступлений'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Продукты"
              className="font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold">Иконка</Label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((i) => (
                <button
                  key={i}
                  className="w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all hover:scale-110"
                  style={{
                    borderColor: icon === i ? color : 'transparent',
                    backgroundColor: icon === i ? color + '20' : 'transparent',
                  }}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
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

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSubmit}
            disabled={createCategory.isPending || updateCategory.isPending}
            className="w-full font-bold bg-accent hover:bg-accent/90 text-foreground"
          >
            {category ? 'Сохранить' : 'Создать'}
          </Button>
          {category && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
              className="w-full font-bold"
            >
              Удалить категорию
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
