import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "FitPilot AI | Adaptive Fitness Copilot",
  description:
    "FitPilot AI is a full-stack fitness coach with AI workouts, nutrition, progress tracking, and a premium SaaS experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-surface text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
