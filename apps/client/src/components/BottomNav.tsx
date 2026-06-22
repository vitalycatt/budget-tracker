import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: TrendingDown, label: "Расходы", path: "/" },
  { icon: TrendingUp, label: "Доходы", path: "/income" },
  { icon: Wallet, label: "Счета", path: "/accounts" },
];

export const BottomNav = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/80 backdrop-blur-xl"
      style={{
        // Внутри Telegram нижний инсет приходит как --tg-safe-bottom (CSS env() = 0),
        // тянем фон навбара в зону дом-индикатора, чтобы под ним не было тёмной полосы.
        paddingBottom: "var(--tg-safe-bottom, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "var(--tg-safe-left, env(safe-area-inset-left, 0px))",
        paddingRight: "var(--tg-safe-right, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="flex justify-around items-center h-20 px-2 max-w-screen-sm mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition-colors"
            activeClassName=""
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span
                  className={cn(
                    "flex items-center justify-center w-14 h-8 rounded-full transition-colors",
                    isActive ? "bg-accent/15" : "bg-transparent"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isActive ? "text-accent" : "text-muted-foreground"
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
