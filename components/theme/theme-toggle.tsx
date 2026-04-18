"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { toggle, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const icon =
    !mounted ? (
      <div className="h-4 w-4 rounded-full bg-white/30" />
    ) : theme === "dark" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    );

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => mounted && toggle()}
      className="rounded-full"
    >
      {icon}
    </Button>
  );
}
