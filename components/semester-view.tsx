"use client";

import { useState } from "react";
import { conflicts } from "@/data/sections";
import { analyzePlan, currentAndNext, pointsOf } from "@/lib/engine";
import { placeCourse } from "@/lib/dnd";
import { removeCourse } from "@/lib/plan-ops";
import type { Slot } from "@/lib/slots";
import { usePlanStore } from "@/lib/store";
import { CoursePicker } from "./course-picker";
import { SlotMatches } from "./slot-matches";
import { WeekCalendar } from "./week-calendar";

export function SemesterView({ which }: { which: "current" | "next" }) {
  const plan = usePlanStore((s) => s.plan)!;
  const apply = usePlanStore((s) => s.apply);
  const setChatMode = usePlanStore((s) => s.setChatMode);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const terms = currentAndNext(plan);
  const term = which === "current" ? terms.current : terms.next;
  const title = which === "current" ? "This semester" : "Next semester";

  if (!term) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-9 md:px-10">
        <h1 className="text-[30px] font-semibold tracking-[-0.025em]">{title}</h1>
        <p className="mt-2 text-muted">There&apos;s no {which === "current" ? "current" : "next"} semester in your plan. Check your graduation year.</p>
      </div>
    );
  }

  const report = analyzePlan(plan);
  const pts = term.courses.reduce((s, c) => s + pointsOf(c), 0);
  const clashes = conflicts(term.courses, term.id);
  const conflicted = new Set(clashes.flat());
  const warnings = report.warnings.filter((w) => w.termId === term.id && w.kind !== "duplicate");

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-9 md:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-[-0.025em]">{title}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {term.label}
            {which === "next" ? ", planned" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-subtle px-2.5 py-1.5 text-[13px] text-ink-2">
            {term.courses.length} {term.courses.length === 1 ? "class" : "classes"}
          </span>
          <span className="rounded-lg bg-subtle px-2.5 py-1.5 text-[13px] text-ink-2">{pts} points</span>
          <div className="relative">
            {adding ? (
              <div className="w-64">
                <CoursePicker
                  onPick={(code) => {
                    const res = placeCourse(code, term.id);
                    setNotice(res && !res.ok ? res.error : null);
                    setAdding(false);
                  }}
                  onClose={() => setAdding(false)}
                />
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="min-h-9 rounded-lg bg-button px-3.5 text-[13px] font-medium text-on-button hover:opacity-90">
                Add course
              </button>
            )}
          </div>
        </div>
      </div>

      {(notice || clashes.length > 0 || warnings.length > 0) && (
        <div role="status" className="mb-4 space-y-1 rounded-xl bg-warn-tint px-4 py-3 text-[13px] text-warn-ink">
          {notice && <p>{notice}</p>}
          {clashes.map(([a, b]) => (
            <p key={a + b}>
              {a} and {b} meet at the same time.
            </p>
          ))}
          {warnings.map((w, i) => (
            <p key={i}>{w.message}</p>
          ))}
        </div>
      )}

      <div className="gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_300px]">
        <WeekCalendar
          termId={term.id}
          codes={term.courses}
          planned={which === "next"}
          conflicted={conflicted}
          onRemove={(code) => apply((p) => removeCourse(p, code))}
          slots={slots}
          onSlotsChange={setSlots}
        />
        <div className="mt-6 xl:mt-0">
          <SlotMatches termId={term.id} slots={slots} onClear={() => setSlots([])} onNotice={setNotice} />
        </div>
      </div>

      {term.courses.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Nothing here yet. Add a course, drag one in from the assistant, or{" "}
          <button onClick={() => setChatMode("corner")} className="text-accent underline-offset-2 hover:underline">
            ask for suggestions
          </button>
          .
        </p>
      )}
      <p className="mt-3 text-xs text-muted">Times are the last ones published in the Directory of Classes (Fall 2024 or Spring 2025); this year&apos;s are only in Vergil. Classes with no published time show a placeholder.</p>
    </div>
  );
}
