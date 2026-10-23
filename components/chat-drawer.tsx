"use client";

import { isToolUIPart, getToolName } from "ai";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { usePlanStore } from "@/lib/store";
import { useLionChat } from "./chat-provider";

const STARTERS = [
  "What should I take next semester?",
  "Am I on track to graduate?",
  "Fill my empty semesters with a balanced plan",
  "No classes before 10am from now on",
];

const TOOL_LABELS: Record<string, string> = {
  search_courses: "Searched the catalog",
  get_course: "Looked up a course",
};

export function ChatDrawer() {
  const { messages, sendMessage, status, error, stop } = useLionChat();
  const open = usePlanStore((s) => s.chatOpen);
  const setOpen = usePlanStore((s) => s.setChatOpen);
  const undo = usePlanStore((s) => s.undo);
  const canUndo = usePlanStore((s) => s.history.length > 0);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  if (!open) return null;

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <aside
      aria-label="Lionplan assistant"
      className="fixed inset-0 z-40 flex flex-col bg-surface md:sticky md:top-0 md:h-screen md:w-[400px] md:shrink-0 md:border-l md:border-line"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-serif text-xl">Ask Lionplan</h2>
        <div className="flex items-center gap-3 text-sm">
          {canUndo && (
            <button onClick={undo} className="text-ink-soft hover:text-ink">
              Undo last change
            </button>
          )}
          <button onClick={() => setOpen(false)} className="text-ink-soft hover:text-ink" aria-label="Close assistant">
            Close
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-[15px] leading-relaxed">
        {messages.length === 0 && (
          <div>
            <p className="text-ink-soft">
              Ask anything about your plan. I can add, move and remove courses for you, and I check every change
              against your requirements.
            </p>
            <div className="mt-4 flex flex-col items-start gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-line px-3 py-1.5 text-left text-sm hover:border-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-sky-tint px-4 py-2" : "space-y-2"}>
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                  ) : (
                    <div key={i} className="prose-chat">
                      <Markdown>{part.text}</Markdown>
                    </div>
                  );
                }
                if (isToolUIPart(part)) {
                  const name = getToolName(part);
                  if (part.state === "output-error") {
                    return <p key={i} className="rounded-md bg-amber-tint px-3 py-1.5 text-sm text-amber">{part.errorText}</p>;
                  }
                  if (part.state !== "output-available") {
                    return <p key={i} className="text-sm text-ink-faint">Working…</p>;
                  }
                  const label = TOOL_LABELS[name] ?? (typeof part.output === "string" ? part.output : null);
                  return label ? (
                    <p key={i} className="border-l-2 border-moss pl-3 text-sm text-ink-soft">{label}</p>
                  ) : null;
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && <p className="text-sm text-ink-faint">Thinking…</p>}
        {error && (
          <p className="rounded-md bg-amber-tint px-3 py-2 text-sm text-amber">
            {error.message || "Something went wrong reaching the AI. Try again."}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-line p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-paper px-3 py-2 focus-within:border-ink">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Swap my 9am for something in stats…"
            className="max-h-40 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="rounded-lg bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-40">
              Send
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
