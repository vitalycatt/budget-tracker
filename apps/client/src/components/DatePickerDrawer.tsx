import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface DatePickerDrawerProps {
  /** Текущая дата в формате yyyy-MM-dd. */
  value: string;
  /** Выбор новой даты (yyyy-MM-dd). */
  onChange: (value: string) => void;
  /** Заголовок шторки. */
  title?: string;
  /** Запретить будущие даты (после сегодня). */
  disableFuture?: boolean;
  /** Доп. классы для кнопки-триггера (например, чтобы вписать в grid). */
  className?: string;
}

/** yyyy-MM-dd → Date в полдень (без сдвига по UTC) и обратно. */
const parseInput = (s: string): Date | undefined =>
  s ? new Date(`${s}T12:00:00`) : undefined;
const toInput = (d?: Date): string => (d ? format(d, 'yyyy-MM-dd') : '');

const atNoon = (d: Date) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};

/**
 * Одиночный выбор даты в стиле фильтра диапазона дат (`DateRangeDrawer`):
 * кнопка-триггер с подписью выбранной даты, по тапу — нижняя шторка с
 * календарём react-day-picker (акцент перекрашен под лайм приложения) и
 * быстрыми чипами «Сегодня/Вчера». Выбор применяется сразу по тапу.
 * Рендерится как вложенная шторка (`nested`), чтобы корректно стекаться
 * поверх модалки-шторки.
 */
export default function DatePickerDrawer({
  value,
  onChange,
  title = 'Дата',
  disableFuture,
  className,
}: DatePickerDrawerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseInput(value);

  const today = atNoon(new Date());
  const yesterday = atNoon(new Date(Date.now() - 86_400_000));

  const pick = (d?: Date) => {
    if (!d) return;
    onChange(toInput(d));
    setOpen(false);
  };

  const triggerLabel = selected
    ? format(selected, 'd MMMM yyyy', { locale: ru })
    : 'Выберите дату';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn('w-full justify-start font-semibold', className)}
        onClick={() => setOpen(true)}
      >
        <CalendarIcon className="w-4 h-4 mr-2 opacity-70 shrink-0" />
        <span className="truncate">{triggerLabel}</span>
      </Button>

      <Drawer open={open} onOpenChange={setOpen} nested shouldScaleBackground={false}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl font-black">{title}</DrawerTitle>
            <DrawerDescription className="font-semibold">{triggerLabel}</DrawerDescription>
          </DrawerHeader>

          <div className="flex gap-2 px-4">
            <Button
              type="button"
              variant={selected && toInput(selected) === toInput(today) ? 'default' : 'outline'}
              className="flex-1 font-bold"
              onClick={() => pick(today)}
            >
              Сегодня
            </Button>
            <Button
              type="button"
              variant={selected && toInput(selected) === toInput(yesterday) ? 'default' : 'outline'}
              className="flex-1 font-bold"
              onClick={() => pick(yesterday)}
            >
              Вчера
            </Button>
          </div>

          <div className="flex justify-center px-2">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={pick}
              locale={ru}
              numberOfMonths={1}
              defaultMonth={selected ?? new Date()}
              disabled={disableFuture ? { after: new Date() } : undefined}
              // Перекраска под акцент приложения (по умолчанию shadcn красит в primary).
              classNames={{
                day_selected:
                  'bg-accent text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground',
                day_today: 'font-black underline underline-offset-4',
              }}
            />
          </div>

          <DrawerFooter className="pb-[max(1rem,var(--tg-safe-bottom,env(safe-area-inset-bottom,0px)))]">
            <Button
              type="button"
              variant="outline"
              className="w-full font-bold"
              onClick={() => setOpen(false)}
            >
              Закрыть
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
