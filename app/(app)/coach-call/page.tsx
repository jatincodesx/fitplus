"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhoneOff, Sparkles, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type TranscriptItem = { role: "USER" | "ASSISTANT"; content: string; timestamp?: string };

type CallStatus = "CONNECTING" | "LISTENING" | "THINKING" | "ACTIVE" | "COMPLETED";

export default function CoachCallPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("CONNECTING");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);
  const router = useRouter();

  const greet = () => {
    const welcome =
      "Hey, I'm your FitPilot coach. Tell me your main goal and what your training looks like right now.";
    setTranscript([{ role: "ASSISTANT", content: welcome }]);
  };

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [transcript, status]);

  // load or create session on mount
  useEffect(() => {
    const init = async () => {
      const existingId = initialSessionId;
      const res = await fetch(`/api/coach-call/session${existingId ? `?sessionId=${existingId}` : "?latest=1"}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.id && (existingId || data.status !== "COMPLETED")) {
          setSessionId(data.id);
          setStatus(data.status === "ACTIVE" ? "LISTENING" : (data.status as CallStatus) || "LISTENING");
          setTranscript(data.transcripts || []);
          if (!existingId) {
            const url = new URL(window.location.href);
            url.searchParams.set("sessionId", data.id);
            window.history.replaceState({}, "", url.toString());
          }
          return;
        }
      }
      const create = await fetch("/api/coach-call/session", { method: "POST" });
      if (!create.ok) {
        setError("Could not start coach chat.");
        return;
      }
      const cdata = await create.json();
      setSessionId(cdata.sessionId);
      setStatus("LISTENING");
      const url = new URL(window.location.href);
      url.searchParams.set("sessionId", cdata.sessionId);
      window.history.replaceState({}, "", url.toString());
      greet();
    };
    init();
  }, [initialSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingId = new URLSearchParams(window.location.search).get("sessionId");
    requestAnimationFrame(() => setInitialSessionId(existingId));
  }, []);

  const send = async (message: string) => {
    if (!sessionId || status === "COMPLETED" || !message.trim() || sending) return;
    setSending(true);
    setError("");
    setTranscript((prev) => [...prev, { role: "USER", content: message }]);
    setInput("");
    setStatus("THINKING");
    const res = await fetch("/api/coach-call/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Coach is offline.");
      setStatus("LISTENING");
      setSending(false);
      return;
    }
    const data = await res.json();
    setTranscript((prev) => [...prev, { role: "ASSISTANT", content: data.reply }]);
    setStatus("LISTENING");
    setSending(false);
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    setStatus("COMPLETED");
    router.push(`/coach-call/generating?sessionId=${sessionId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Coach Session</p>
          <h1 className="text-3xl font-semibold">Chat With Your Fitness Coach</h1>
          <p className="text-sm text-[var(--color-muted)]">
            A premium coaching chat that gathers your goals and builds a plan automatically.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/workouts")}>
          Go to workouts
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 flex flex-col gap-4 p-0 overflow-hidden">
          <div className="relative h-48 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)]">
            <div className="absolute inset-0 bg-black/35" />
            <div className="relative flex h-full items-center justify-between px-6">
              <div>
                <p className="text-sm text-white/80">Coach Aria (AI)</p>
                <h2 className="text-3xl font-semibold text-white">Coach Chat</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  {status === "CONNECTING" && "Connecting..."}
                  {status === "LISTENING" && "Listening"}
                  {status === "THINKING" && "Thinking"}
                  {status === "COMPLETED" && "Completed"}
                </div>
              </div>
              <div className="glass rounded-2xl border-white/20 bg-white/10 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-wide">Mode</p>
                <p className="text-sm font-semibold">Guided chat</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" /> The coach will ask questions,
              summarize, and generate a plan. Avoid sharing medical details; consult a professional for injuries.
            </div>

            <div className="min-h-[260px] space-y-3 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-black/20 p-4">
              <div className="space-y-2" ref={listRef}>
                {transcript.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "max-w-xl rounded-2xl px-4 py-3",
                      item.role === "USER"
                        ? "ml-auto bg-[var(--color-accent)]/15 text-foreground"
                        : "mr-auto bg-white/5 text-foreground/90"
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
                      {item.role === "USER" ? "You" : "Coach"}
                    </p>
                    <p className="text-sm">{item.content}</p>
                  </div>
                ))}
              </div>
              {status === "THINKING" && (
                <div className="mr-auto flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm text-[var(--color-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Coach is thinking...
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--color-border)] bg-black/20 px-3 py-2 text-sm text-foreground focus:border-[var(--color-accent)] focus:outline-none"
                  placeholder="Type your reply..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  disabled={sending || status === "COMPLETED"}
                />
                <Button onClick={() => send(input)} disabled={!input.trim() || status === "COMPLETED" || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="lg" className="flex-1" onClick={handleComplete}>
                  <PhoneOff className="h-5 w-5" /> End session & generate plan
                </Button>
              </div>
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Chat Status</p>
                <p className="text-lg font-semibold">{status === "COMPLETED" ? "Completed" : "In progress"}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  status === "COMPLETED"
                    ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                    : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                )}
              >
                {status}
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
              <p>Coach collects your goals, limitations, schedule, and preferences.</p>
              <p>After you end the chat, FitPilot generates and saves a personalized plan automatically.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
