import { useState } from 'react';
import { CURRENCIES, CURRENCY_META, type Currency } from '@swt/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOnboarding } from '@/hooks/use-user';

export default function Onboarding() {
  const [selected, setSelected] = useState<Currency>('RUB');
  const onboarding = useOnboarding();

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <div className="mb-8 mt-8">
        <h1 className="text-4xl font-black mb-2">Добро пожаловать 👋</h1>
        <p className="text-muted-foreground font-semibold">
          Выберите базовую валюту — в ней будет считаться общее состояние и сводная статистика.
          Сменить можно позже.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 content-start">
        {CURRENCIES.map((code) => {
          const meta = CURRENCY_META[code];
          const active = selected === code;
          return (
            <Card
              key={code}
              role="button"
              onClick={() => setSelected(code)}
              className={`p-4 cursor-pointer transition-all ${
                active ? 'border-accent bg-accent/10 ring-2 ring-accent' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black w-8 text-center">{meta.symbol}</span>
                <div>
                  <div className="font-bold">{code}</div>
                  <div className="text-xs text-muted-foreground font-medium">{meta.name}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full h-14 mt-6 text-lg font-bold bg-accent hover:bg-accent/90 text-foreground"
        disabled={onboarding.isPending}
        onClick={() => onboarding.mutate(selected)}
      >
        Продолжить
      </Button>
    </div>
  );
}
