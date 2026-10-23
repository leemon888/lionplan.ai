"use client";

import { useEffect, useRef, useState } from "react";
import { COURSE_BY_CODE } from "@/data/courses";
import { formatTime, meetingFor, toMinutes } from "@/data/sections";
import { dropCourse, isCourseDrag } from "@/lib/dnd";
import { type Slot, sameSlot, slotRuns } from "@/lib/slots";
import { usePlanStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";

const DAYS = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["R", "Thursday"],
  ["F", "Friday"],
] as const;
const START = 8; // 8am
const END = 20; // 8pm
const HOUR = 52; // px per hour

export function WeekCalendar({
  termId,
  codes,
  planned,
  conflicted,
  onRemove,
  slots,
  onSlotsChange,
}: {
  termId: string;
  codes: string[];
  planned: boolean;
  conflicted: Set<string>;
  onRemove: (code: string) => void;
  /** Hours the student picked. Pass onSlotsChange to let them click or drag to pick. */
  slots?: Slot[];
  onSlotsChange?: (slots: Slot[]) => void;
}) {
  const flash = usePlanStore((s) => s.flash);
  const [over, setOver] = useState(false);
  const hours = Array.from({ length: END - START }, (_, i) => START + i);

  // Click an hour to pick or unpick it; drag to do several. The first hour decides which.
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<{ on: boolean; slots: Slot[] } | null>(null);
  const slotAt = (x: number, y: number): Slot | null => {
    const r = grid.current?.getBoundingClientRect();
    if (!r || x < r.left || x >= r.right || y < r.top || y >= r.bottom) return null;
    const day = DAYS[Math.floor(((x - r.left) / r.width) * 5)]?.[0];
    const hour = START + Math.floor((y - r.top) / HOUR);
    return day && hour < END ? { day, hour } : null;
  };
  const setSlot = (slot: Slot) => {
    const d = drag.current;
    if (!d || !onSlotsChange) return;
    const has = d.slots.some((s) => sameSlot(s, slot));
    if (has === d.on) return;
    d.slots = d.on ? [...d.slots, slot] : d.slots.filter((s) => !sameSlot(s, slot));
    onSlotsChange(d.slots);
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const slot = slotAt(e.clientX, e.clientY);
      if (slot) setSlot(slot);
    };
    const end = () => (drag.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  });

  const blocks = codes.flatMap((code) => {
    const m = meetingFor(code, termId);
    if (!m) return [];
    const top = ((toMinutes(m.start) - START * 60) / 60) * HOUR + 1;
    const height = ((toMinutes(m.end) - toMinutes(m.start)) / 60) * HOUR - 3;
    return m.days.split("").map((d) => ({
      key: code + d,
      code,
      day: DAYS.findIndex(([k]) => k === d),
      top,
      height,
      time: `${formatTime(m.start)} to ${formatTime(m.end)}`,
    }));
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-bg">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[60px_repeat(5,minmax(0,1fr))] border-b border-line">
          <span />
          {DAYS.map(([k, name]) => (
            <span key={k} className="px-2.5 py-3 text-[13px] font-medium text-ink-2">
              {name}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-[60px_minmax(0,1fr)]">
          <div className="relative" style={{ height: (END - START) * HOUR }}>
            {hours.map((h, i) => (
              <span key={h} className="absolute right-2.5 text-[11px] text-muted" style={{ top: i === 0 ? 4 : i * HOUR - 7 }}>
                {h > 12 ? h - 12 : h} {h >= 12 ? "pm" : "am"}
              </span>
            ))}
          </div>
          <div
            ref={grid}
            onPointerDown={(e) => {
              if (!onSlotsChange || e.button !== 0 || (e.target as HTMLElement).closest("[data-block]")) return;
              const slot = slotAt(e.clientX, e.clientY);
              if (!slot) return;
              e.preventDefault();
              const current = slots ?? [];
              drag.current = { on: !current.some((s) => sameSlot(s, slot)), slots: current };
              setSlot(slot);
            }}
            onDragOver={(e) => {
              if (!isCourseDrag(e)) return;
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              setOver(false);
              dropCourse(e, termId);
            }}
            className={`relative touch-pan-y border-l border-line-soft transition-colors ${over ? "bg-accent-tint" : ""} ${onSlotsChange ? "cursor-cell select-none" : ""}`}
            style={{ height: (END - START) * HOUR }}
          >
            {hours.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-line-soft" style={{ top: i * HOUR }} />
            ))}
            {[1, 2, 3, 4].map((d) => (
              <div key={d} className="absolute inset-y-0 border-l border-line-soft" style={{ left: `${d * 20}%` }} />
            ))}
            {slotRuns(slots ?? []).map((r) => (
              <div
                key={r.day + r.from}
                aria-hidden="true"
                className="pointer-events-none absolute border-y-2 border-accent bg-accent-tint"
                style={{ top: (r.from - START) * HOUR, height: (r.to - r.from) * HOUR, left: `${"MTWRF".indexOf(r.day) * 20}%`, width: "20%" }}
              />
            ))}
            {blocks.map((b) => {
              const c = COURSE_BY_CODE[b.code];
              const isFlash = flash === b.code;
              const clash = conflicted.has(b.code);
              return (
                <div
                  key={b.key}
                  data-block
                  className={`group absolute box-border overflow-hidden rounded-lg border px-2 py-1.5 ${toneFor(b.code)} bg-tone-bg text-tone-ink ${planned ? "border-dashed" : ""} border-tone-line ${isFlash ? "anim-pop ring-2 ring-accent" : ""} ${clash ? "ring-2 ring-warn-ink" : ""}`}
                  style={{ top: b.top, height: b.height, left: `calc(${b.day * 20}% + 4px)`, width: "calc(20% - 8px)" }}
                >
                  <div className="text-xs font-semibold">{b.code}</div>
                  <div className="truncate text-xs opacity-85">{c?.title}</div>
                  <div className="mt-0.5 text-[11px] opacity-75">{b.time}</div>
                  <button
                    onClick={() => onRemove(b.code)}
                    aria-label={`Remove ${b.code}`}
                    className="absolute top-1 right-1 grid size-6 place-items-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg/60 focus:opacity-100"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
