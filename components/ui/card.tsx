import { cn } from "@/lib/utils";
import React from "react";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl border border-[var(--color-border)] p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
