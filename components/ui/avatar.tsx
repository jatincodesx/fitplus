"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root className={cn("inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white/5", className)}>
      <AvatarPrimitive.Image src={src ?? undefined} alt={name ?? "User"} className="h-full w-full object-cover" />
      <AvatarPrimitive.Fallback className="text-sm font-semibold text-foreground">
        {name?.slice(0, 2).toUpperCase() ?? "FP"}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
