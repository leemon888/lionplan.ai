"use client";

import { useState } from "react";
import { COURSE_BY_CODE } from "@/data/courses";
import { formatTime, meetingFor, toMinutes } from "@/data/sections";
import { dropCourse, isCourseDrag } from "@/lib/dnd";
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
}: {
  termId: string;
  codes: string[];
  planned: boolean;
  conflicted: Set<string>;
  onRemove: (code: string) => void;
}) {
  const flash = usePlanStore((s) => s.flash);
  const [over, setOver] = useState(false);
  const hours = Array.from({ length: END - START }, (_, i) => START + i);

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
            className={`relative border-l border-line-soft transition-colors ${over ? "bg-accent-tint" : ""}`}
            style={{ height: (END - START) * HOUR }}
          >
            {hours.map((h, i) => (
              <div key={h} className="absolute inset-x-0 border-t border-line-soft" style={{ top: i * HOUR }} />
            ))}
            {[1, 2, 3, 4].map((d) => (
              <div key={d} className="absolute inset-y-0 border-l border-line-soft" style={{ left: `${d * 20}%` }} />
            ))}
            {blocks.map((b) => {
              const c = COURSE_BY_CODE[b.code];
              const isFlash = flash === b.code;
              const clash = conflicted.has(b.code);
              return (
                <div
                  key={b.key}
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
