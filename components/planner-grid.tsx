"use client";

import { useState } from "react";
import { COURSE_BY_CODE } from "@/data/courses";
import { pointsOf, termStatus } from "@/lib/engine";
import { addCourse, moveCourse, removeCourse } from "@/lib/plan-ops";
import { usePlanStore } from "@/lib/store";
import type { Plan, Term, TermStatus, Warning } from "@/lib/types";
import { CoursePicker } from "./course-picker";

const CHIP: Record<TermStatus, string> = {
  credit: "border-l-ink-soft bg-surface",
  past: "border-l-ink bg-surface",
  current: "border-l-sky bg-surface",
  future: "border-l-line bg-surface/60 border-dashed",
};

export function PlannerGrid({ plan, warnings }: { plan: Plan; warnings: Warning[] }) {
  const apply = usePlanStore((s) => s.apply);
  const [notice, setNotice] = useState<string | null>(null);

  const run = (res: ReturnType<typeof apply>) => {
    if (res && !res.ok) setNotice(res.error);
    else setNotice(null);
  };

  const credit = plan.terms[0];
  const semesters = plan.terms.slice(1);
  const years = [0, 1, 2, 3].map((i) => semesters.slice(i * 2, i * 2 + 2));

  const column = (term: Term, wide = false) => (
    <TermColumn
      key={term.id}
      wide={wide}
      term={term}
      warnings={warnings.filter((w) => w.termId === term.id)}
      onAdd={(code) => run(apply((p) => addCourse(p, code, term.id)))}
      onRemove={(code) => run(apply((p) => removeCourse(p, code)))}
      onDrop={(code) => run(apply((p) => moveCourse(p, code, term.id)))}
    />
  );

  return (
    <div className="@container">
      {notice && (
        <p role="alert" className="mb-4 rounded-md bg-amber-tint px-3 py-2 text-sm text-amber">
          {notice}
        </p>
      )}
      <div className="mb-8">{column(credit, true)}</div>
      <div className="grid gap-x-8 gap-y-10 @[58rem]:grid-cols-2">
        {years.map((pair, i) => (
          <section key={i}>
            <h3 className="mb-3 font-serif text-lg">
              Year {i + 1}
              <span className="ml-2 text-sm text-ink-faint">
                {pair[0]?.year}–{pair[1]?.year}
              </span>
            </h3>
            <div className="grid gap-3 @sm:grid-cols-2">{pair.map((t) => column(t))}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TermColumn({
  wide,
  term,
  warnings,
  onAdd,
  onRemove,
  onDrop,
}: {
  wide: boolean;
  term: Term;
  warnings: Warning[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  onDrop: (code: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [over, setOver] = useState(false);
  const status = termStatus(term);
  const pts = term.courses.reduce((s, c) => s + pointsOf(c), 0);
  const heavy = warnings.some((w) => w.kind === "overload");

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const code = e.dataTransfer.getData("text/course");
        if (code) onDrop(code);
      }}
      className={`rounded-xl border p-3 transition-colors ${over ? "border-ink bg-sky-tint" : "border-line bg-paper"} ${status === "current" ? "ring-1 ring-sky" : ""}`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">
          {term.label}
          {status === "current" && <span className="ml-2 font-normal text-ink-soft">now</span>}
        </h4>
        <span className={`text-xs tabular-nums ${heavy ? "font-semibold text-amber" : "text-ink-faint"}`}>{pts} pts</span>
      </div>

      <ul className={wide ? "grid gap-1.5 @md:grid-cols-2 @3xl:grid-cols-4" : "space-y-1.5"}>
        {term.courses.map((code) => {
          const c = COURSE_BY_CODE[code];
          const issues = warnings.filter((w) => w.code === code);
          return (
            <li
              key={code}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/course", code)}
              className={`group flex cursor-grab items-start gap-2 rounded-md border border-line border-l-[3px] px-2.5 py-1.5 active:cursor-grabbing ${CHIP[status]}`}
              title={c?.prereqs ? `Prereqs: ${c.prereqs.map((g) => g.join(" or ")).join("; ")}` : undefined}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight">{code}</p>
                <p className="truncate text-[13px] text-ink-soft">{c?.title ?? "Not in catalog"}</p>
                {issues.map((w, i) => (
                  <p key={i} className="mt-0.5 text-xs text-amber">
                    {w.message}
                  </p>
                ))}
              </div>
              <button
                onClick={() => onRemove(code)}
                aria-label={`Remove ${code}`}
                className="text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2">
        {adding ? (
          <CoursePicker
            onPick={(code) => {
              onAdd(code);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button onClick={() => setAdding(true)} className="w-full rounded-md px-2 py-1 text-left text-sm text-ink-faint hover:bg-surface hover:text-ink">
            + Add course
          </button>
        )}
      </div>
    </div>
  );
}
