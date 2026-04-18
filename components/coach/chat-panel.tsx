"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";

type Message = { id: string; role: string; content: string; createdAt?: Date };

export function CoachChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!input.trim() || loading) return;

    const temp: Message = { id: `temp-${Date.now()}`, role: "USER", content: input.trim() };
    setMessages((prev) => [...prev, temp]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: temp.content }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Coach is unavailable right now.");
      }

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== temp.id),
        { ...temp, id: `${Date.now()}` },
        { id: `assistant-${Date.now()}`, role: "ASSISTANT", content: data.reply },
      ]);
    } catch (caughtError) {
      setMessages((prev) => prev.filter((message) => message.id !== temp.id));
      setError(caughtError instanceof Error ? caughtError.message : "Coach is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-[var(--color-border)]/70 bg-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Aria</p>
          <p className="text-sm text-[var(--color-muted)]">Uses your latest plan, nutrition target, and progress context.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)]/70 bg-white/5 px-3 py-1 text-xs text-[var(--color-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-2)]" />
          Premium mode
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)]/70 bg-white/5 p-4 text-sm text-[var(--color-muted)]">
            Ask for a better substitute, shoulder-friendly swaps, deload advice, or how to adjust the current week.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-2xl border border-[var(--color-border)]/60 bg-white/5 p-4"
          >
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
              {message.role === "ASSISTANT" ? "Coach" : "You"}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{message.content}</p>
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)]/60 bg-white/5 px-3 py-2 text-xs text-[var(--color-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Coach is thinking
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border)]/60 bg-black/25 p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Adjust my lower day if my knee is flaring up..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button onClick={() => void send()} disabled={loading || !input.trim()}>
            <SendHorizonal className="h-4 w-4" />
            Send
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
      </div>
    </div>
  );
}
