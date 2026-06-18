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
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="flex justify-around items-center h-20 px-4 max-w-screen-sm mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors"
            activeClassName="text-accent"
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <item.icon
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
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
