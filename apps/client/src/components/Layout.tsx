import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  // Верхние/боковые safe-area отступы Telegram теперь на #root (см. index.css).
  // Горизонтальные отступы страниц — единственный источник здесь (px-4), страницы
  // задают только вертикальный ритм. Нижний отступ = высота навбара (5rem) + его
  // safe-area + воздух, чтобы контент и FAB не уходили под навигацию.
  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom) + 1rem)" }}
    >
      <TopBar />
      <div className="max-w-screen-sm mx-auto px-4 pt-3">{children}</div>
      <BottomNav />
    </div>
  );
};
