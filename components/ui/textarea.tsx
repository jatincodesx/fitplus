"use client";

import { cn } from "@/lib/utils";
import React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2 text-sm text-foreground shadow-inner shadow-black/10 transition focus:border-[var(--color-accent)] focus:outline-none",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
