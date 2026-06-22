import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

interface DateRangeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Текущий диапазон в формате yyyy-MM-dd (пустая строка = граница не задана). */
  from: string;
  to: string;
  /** Применить выбор. Пустые строки = сбросить произвольный период. */
  onApply: (from: string, to: string) => void;
}

/** yyyy-MM-dd → Date в полдень (без сдвига по UTC) и обратно. */
const parseInput = (s: string): Date | undefined =>
  s ? new Date(`${s}T12:00:00`) : undefined;
const toInput = (d?: Date): string => (d ? format(d, 'yyyy-MM-dd') : '');

/**
 * Мобильный выбор диапазона дат: шторка снизу + календарь react-day-picker
 * в режиме range. Выделение перекрашено под акцент приложения (лайм),
 * чтобы совпадать с остальным UI. Выбор применяется по кнопке (черновик
 * не дёргает страницу на каждый тап).
 */
export default function DateRangeDrawer({
  open,
  onOpenChange,
  from,
  to,
  onApply,
}: DateRangeDrawerProps) {
  const [draft, setDraft] = useState<DateRange | undefined>();

  // При открытии засеваем черновик текущим диапазоном страницы.
  useEffect(() => {
    if (open) setDraft({ from: parseInput(from), to: parseInput(to) });
  }, [open, from, to]);

  const apply = () => {
    onApply(toInput(draft?.from), toInput(draft?.to ?? draft?.from));
    onOpenChange(false);
  };

  const reset = () => {
    onApply('', '');
    onOpenChange(false);
  };

  const label = draft?.from
    ? draft.to && draft.to.getTime() !== draft.from.getTime()
      ? `${format(draft.from, 'd MMM yyyy', { locale: ru })} — ${format(draft.to, 'd MMM yyyy', { locale: ru })}`
      : format(draft.from, 'd MMMM yyyy', { locale: ru })
    : 'Выберите начало и конец периода';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-black">Свой период</DrawerTitle>
          <DrawerDescription className="font-semibold">{label}</DrawerDescription>
        </DrawerHeader>

        <div className="flex justify-center px-2">
          <Calendar
            mode="range"
            selected={draft}
            onSelect={setDraft}
            locale={ru}
            numberOfMonths={1}
            defaultMonth={draft?.from ?? new Date()}
            disabled={{ after: new Date() }}
            // Перекраска под акцент приложения (по умолчанию shadcn красит в primary).
            classNames={{
              day_selected:
                'bg-accent text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground',
              day_range_middle:
                'aria-selected:bg-accent/20 aria-selected:text-foreground rounded-none',
              day_today: 'font-black underline underline-offset-4',
            }}
          />
        </div>

        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 font-bold" onClick={reset}>
            Сбросить
          </Button>
          <Button
            className="flex-1 font-bold bg-accent hover:bg-accent/90 text-foreground"
            onClick={apply}
            disabled={!draft?.from}
          >
            Применить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
