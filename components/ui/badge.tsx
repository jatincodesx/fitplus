import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const variants = {
    default: "bg-white/10 text-foreground border border-[var(--color-border)]",
    success: "bg-[var(--color-success)]/15 text-[var(--color-success)] border-0",
    warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)] border-0",
    danger: "bg-[var(--color-error)]/15 text-[var(--color-error)] border-0",
  };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}
