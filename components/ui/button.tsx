"use client";

import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";
import React from "react";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-accent)] text-white shadow-lg shadow-purple-500/25 hover:brightness-110 focus-visible:outline-[var(--color-accent)]",
        secondary:
          "bg-white/5 text-foreground border border-[var(--color-border)] hover:bg-white/10 focus-visible:outline-[var(--color-border)]",
        ghost: "text-foreground hover:bg-white/5 focus-visible:outline-[var(--color-border)]",
        danger:
          "bg-[var(--color-danger)] text-white hover:brightness-105 focus-visible:outline-[var(--color-danger)]",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-2.5",
        lg: "px-5 py-3 text-base",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  }
);
Button.displayName = "Button";
