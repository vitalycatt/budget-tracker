import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  // Верхние/боковые safe-area отступы Telegram теперь на #root (см. index.css).
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto px-4">{children}</div>
      <BottomNav />
    </div>
  );
};
