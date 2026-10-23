"use client";

import { getToolName, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { usePlanStore, type ChatMode } from "@/lib/store";
import { useLionChat } from "./chat-provider";
import { CourseCard } from "./course-card";

const STARTERS = ["What should I take next semester?", "Am I on track to graduate?", "Find an elective for Tue/Thu afternoons", "No classes before 10am from now on"];
const TOOL_LABELS: Record<string, string> = { search_courses: "Searched the catalog", get_course: "Looked up a course" };

const PANEL: Record<Exclude<ChatMode, "closed">, string> = {
  corner: "right-4 bottom-4 w-[420px] max-w-[calc(100%-32px)] h-[640px] max-h-[calc(100%-32px)] rounded-2xl border border-line shadow-float anim-pop md:right-6 md:bottom-6",
  third: "inset-x-0 bottom-0 h-[40%] rounded-t-[18px] border-t border-line shadow-[0_-16px_40px_-28px_rgba(16,24,40,.35)]",
  full: "inset-0",
};

const SparkIcon = ({ className = "" }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
    <path d="M9 2.5l1.6 3.9 3.9 1.6-3.9 1.6L9 13.5 7.4 9.6 3.5 8l3.9-1.6L9 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export function ChatPanel() {
  const { messages, sendMessage, status, error, stop } = useLionChat();
  const mode = usePlanStore((s) => s.chatMode);
  const setMode = usePlanStore((s) => s.setChatMode);
  const lastOpenMode = usePlanStore((s) => s.lastOpenMode);
  const undo = usePlanStore((s) => s.undo);
  const canUndo = usePlanStore((s) => s.history.length > 0);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, mode]);

  if (mode === "closed") {
    const unread = messages.length > 0;
    return (
      <button
        onClick={() => setMode(lastOpenMode)}
        aria-label={unread ? "Open the assistant and continue the conversation" : "Ask Lionplan"}
        className="absolute right-4 bottom-4 z-20 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-button pr-5 pl-4 text-[15px] font-medium text-on-button shadow-float hover:opacity-90 md:right-6 md:bottom-6"
      >
        <SparkIcon />
        {busy ? "Thinking…" : unread ? "Continue chat" : "Ask Lionplan"}
        {(busy || unread) && <span aria-hidden="true" className={`size-2 rounded-full bg-accent ${busy ? "animate-pulse" : ""}`} />}
      </button>
    );
  }

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };
  const wide = mode !== "corner";
  const modeBtn = (m: ChatMode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setMode(m)}
      aria-label={label}
      aria-pressed={mode === m}
      title={label}
      className={`grid size-9 place-items-center rounded-lg ${mode === m ? "bg-hover text-ink" : "text-muted hover:bg-hover hover:text-ink"}`}
    >
      {icon}
    </button>
  );

  return (
    <section
      aria-label="Lionplan assistant"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) setMode("closed");
      }}
      className={`absolute z-20 flex flex-col bg-raised ${PANEL[mode]}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line-soft py-2.5 pr-2.5 pl-4">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <SparkIcon className="text-accent" />
          Ask Lionplan
        </div>
        <div className="flex items-center gap-0.5">
          {canUndo && (
            <button onClick={undo} className="mr-1 min-h-9 rounded-lg px-2.5 text-[13px] text-muted hover:bg-hover hover:text-ink">
              Undo
            </button>
          )}
          {modeBtn(
            "corner",
            "Small window",
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
            </svg>,
          )}
          {modeBtn(
            "third",
            "Dock to bottom",
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
              <rect x="4" y="10.5" width="10" height="3.5" rx="1" fill="currentColor" />
            </svg>,
          )}
          {modeBtn(
            "full",
            "Full screen",
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 7V3h4M15 7V3h-4M3 11v4h4M15 11v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>,
          )}
          <button
            onClick={() => setMode("closed")}
            aria-label="Minimize assistant"
            title="Minimize (Esc). Your conversation is kept."
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4.5 9h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className={`mx-auto flex flex-col gap-4 p-4.5 text-[14px] leading-relaxed ${wide ? "max-w-[820px]" : ""}`}>
          {messages.length === 0 && (
            <div className="anim-fade">
              <p className="text-ink-2">Ask anything about your plan. I can suggest courses, and add, move or remove them for you.</p>
              <div className="mt-4 flex flex-col items-start gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-lg border border-line px-3 py-1.5 text-left text-[13px] hover:border-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`anim-rise ${m.role === "user" ? "flex justify-end" : "space-y-2.5"}`}>
              {m.role === "user" ? (
                <p className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-subtle px-3.5 py-2.5 whitespace-pre-wrap">
                  {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                </p>
              ) : (
                m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div key={i} className="prose-chat">
                        <Markdown>{part.text}</Markdown>
                      </div>
                    );
                  }
                  if (!isToolUIPart(part)) return null;
                  const name = getToolName(part);
                  if (name === "show_courses") {
                    const input = part.input as { courses?: { code: string; reason?: string }[]; termId?: string } | undefined;
                    if (!input?.courses?.length) return <p key={i} className="text-[13px] text-muted">Finding courses…</p>;
                    return (
                      <div key={i} className="flex flex-wrap gap-2.5">
                        {input.courses.filter((c) => c?.code).map((c) => (
                          <CourseCard key={c.code} code={c.code} reason={c.reason} termId={input.termId} />
                        ))}
                      </div>
                    );
                  }
                  if (part.state === "output-error") {
                    return (
                      <p key={i} className="rounded-lg bg-warn-tint px-3 py-1.5 text-[13px] text-warn-ink">
                        {part.errorText}
                      </p>
                    );
                  }
                  if (part.state !== "output-available") return <p key={i} className="text-[13px] text-muted">Working…</p>;
                  const label = TOOL_LABELS[name] ?? (typeof part.output === "string" ? part.output : null);
                  return label ? (
                    <p key={i} className="border-l-2 border-accent pl-3 text-[13px] text-muted">
                      {label}
                    </p>
                  ) : null;
                })
              )}
            </div>
          ))}

          {status === "submitted" && <p className="text-[13px] text-muted">Thinking…</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-warn-tint px-3 py-2 text-[13px] text-warn-ink">
              {error.message || "Couldn't reach the assistant. Try again."}
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className={`mx-auto w-full px-4 pt-2 pb-4 ${wide ? "max-w-[852px]" : ""}`}
      >
        <div className="flex items-end gap-2 rounded-[14px] border border-line bg-bg py-2 pr-2 pl-3.5 focus-within:border-accent">
          <label htmlFor="lp-chat" className="sr-only">
            Message Lionplan
          </label>
          <textarea
            id="lp-chat"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask anything, or tell me what to change"
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-normal outline-none"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className="min-h-[34px] rounded-lg px-3 text-[13px] text-muted hover:text-ink">
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="grid size-[34px] place-items-center rounded-[9px] bg-accent text-on-accent disabled:opacity-40">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
