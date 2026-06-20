import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Сверху по центру: там нет кликабельных элементов (только нативная шапка Telegram),
      // в отличие от низа, где нижняя навигация. Отступ — с учётом safe-area Telegram.
      position="top-center"
      offset="calc(var(--tg-safe-top, env(safe-area-inset-top, 0px)) + 16px)"
      mobileOffset="calc(var(--tg-safe-top, env(safe-area-inset-top, 0px)) + 16px)"
      duration={2500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
