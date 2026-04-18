import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  color = "accent",
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  trend?: string;
  color?: "accent" | "success" | "warning";
}) {
  const colorMap = {
    accent: "text-[var(--color-accent)] bg-[var(--color-accent)]/10",
    success: "text-[var(--color-success)] bg-[var(--color-success)]/10",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning)]/10",
  };
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-muted)]">{title}</p>
        <span className={cn("rounded-full p-2", colorMap[color])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {(subtext || trend) && (
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>{subtext}</span>
          {trend && <span className="text-[var(--color-success)]">{trend}</span>}
        </div>
      )}
    </Card>
  );
}
