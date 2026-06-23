import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';

/** Цитаты известных людей о деньгах, бережливости и дисциплине — скрашивают ожидание. */
const QUOTES: { text: string; author: string }[] = [
  {
    text: 'Берегись мелких расходов: маленькая течь потопит большой корабль.',
    author: 'Бенджамин Франклин',
  },
  {
    text: 'Не копите то, что осталось после трат, а тратьте то, что осталось после накоплений.',
    author: 'Уоррен Баффетт',
  },
  {
    text: 'Цена — это то, что вы платите. Ценность — то, что вы получаете.',
    author: 'Уоррен Баффетт',
  },
  {
    text: 'Инвестиция в знания платит лучшие дивиденды.',
    author: 'Бенджамин Франклин',
  },
  {
    text: 'Деньги — хороший слуга, но плохой хозяин.',
    author: 'Фрэнсис Бэкон',
  },
  {
    text: 'Бережливость — важный источник благосостояния.',
    author: 'Цицерон',
  },
  {
    text: 'Богатство состоит не в обладании сокровищами, а в умении ими пользоваться.',
    author: 'Наполеон Бонапарт',
  },
  {
    text: 'Дисциплина — это мост между целью и её достижением.',
    author: 'Джим Рон',
  },
];

interface LoadingScreenProps {
  /** Короткий статус под анимацией (по умолчанию — без него, говорят цитаты). */
  message?: string;
}

/**
 * Экран первичной загрузки: брендовый пульс (кошелёк в лаймовом круге +
 * вращающееся кольцо) и сменяющиеся цитаты. Контент смещён чуть выше центра.
 */
export default function LoadingScreen({ message }: LoadingScreenProps) {
  // Стартуем со случайной цитаты, чтобы каждый запуск был чуть другим.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const quote = QUOTES[index];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
      {/* Контент заметно выше центра. */}
      <div className="-translate-y-[22%] flex flex-col items-center">
        {/* Брендовый пульс: вращающееся кольцо + пульсирующий кошелёк. */}
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-accent/15 flex items-center justify-center animate-logo-pulse">
            <Wallet className="w-9 h-9 text-accent" strokeWidth={2.5} />
          </div>
        </div>

        {/* Цитата в блоке фиксированной высоты, чтобы лоадер не «прыгал»
            при смене текста (2 vs 3 строки). */}
        <div className="h-28 max-w-xs flex flex-col items-center justify-start">
          <div key={index} className="animate-fade-in">
            <p className="text-base font-bold leading-snug text-foreground">
              «{quote.text}»
            </p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              — {quote.author}
            </p>
          </div>
        </div>

        {message && (
          <p className="text-sm font-semibold text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}
