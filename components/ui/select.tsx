"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2 text-sm text-foreground focus:border-[var(--color-accent)] focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";
