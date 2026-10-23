"use client";

import { useState } from "react";
import { COURSE_BY_CODE } from "@/data/courses";
import { analyzePlan, pointsOf, termStatus } from "@/lib/engine";
import { dropCourse, isCourseDrag, placeCourse, startCourseDrag } from "@/lib/dnd";
import { SCHOOL_LABEL } from "@/lib/onboarding";
import { removeCourse, setManual } from "@/lib/plan-ops";
import { usePlanStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";
import type { ProgramResult, RequirementResult, Term, TermStatus, Warning } from "@/lib/types";
import { CoursePicker } from "./course-picker";

const STATUS_TEXT: Record<TermStatus, string> = { credit: "Credit", past: "Completed", current: "In progress", future: "Planned" };

export function FourYearPlan() {
  const plan = usePlanStore((s) => s.plan)!;
  const report = analyzePlan(plan);
  const p = plan.profile;
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-9 md:px-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.025em]">Four-year plan</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Class of {p.classYear}
        {p.studying ? `, ${p.studying}` : ""}. {report.points.done} of {report.points.required} points done, {report.points.planned} with planned courses.
      </p>

      {p.school !== "CC" && (
        <p className="mt-4 rounded-xl bg-subtle px-4 py-3 text-[13px] text-ink-2">
          Requirement tracking covers Columbia College only for now, so {SCHOOL_LABEL[p.school]} requirements aren&apos;t checked yet. Planning and the assistant still work.
        </p>
      )}

      {report.programs.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.programs.map((prog) => (
            <a key={prog.id} href={`#req-${prog.id}`} className="rounded-xl border border-line p-4 hover:bg-subtle">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{prog.name}</span>
                <span className="text-xs text-muted">
                  {prog.done} of {prog.total} done
                </span>
              </div>
              <Progress done={prog.done} planned={prog.planned} total={prog.total} />
            </a>
          ))}
        </div>
      )}

      {notice && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-tint px-4 py-2.5 text-[13px] text-warn-ink">
          {notice}
        </p>
      )}

      <div className="mt-7 overflow-x-auto pb-2">
        <div className="grid min-w-[1560px] grid-cols-9 gap-2.5">
          {plan.terms.map((t) => (
            <TermColumn key={t.id} term={t} warnings={report.warnings.filter((w) => w.termId === t.id)} onNotice={setNotice} />
          ))}
        </div>
      </div>

      {report.programs.length > 0 && (
        <>
          <h2 className="mt-10 mb-3.5 text-lg font-semibold tracking-[-0.01em]">Requirements</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {report.programs.map((prog) => (
              <RequirementCard key={prog.id} program={prog} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Unofficial. Confirm graduation requirements with your advisor.</p>
        </>
      )}
    </div>
  );
}

function Progress({ done, planned, total }: { done: number; planned: number; total: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft" role="img" aria-label={`${done} of ${total} done, ${planned} including planned`}>
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent/35" style={{ width: pct(planned) }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: pct(done) }} />
    </div>
  );
}

function TermColumn({ term, warnings, onNotice }: { term: Term; warnings: Warning[]; onNotice: (n: string | null) => void }) {
  const apply = usePlanStore((s) => s.apply);
  const flash = usePlanStore((s) => s.flash);
  const [adding, setAdding] = useState(false);
  const [over, setOver] = useState(false);
  const status = termStatus(term);
  const pts = term.courses.reduce((s, c) => s + pointsOf(c), 0);

  return (
    <section
      aria-label={term.label}
      onDragOver={(e) => {
        if (!isCourseDrag(e)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const res = dropCourse(e, term.id);
        onNotice(res && !res.ok ? res.error : null);
      }}
      className={`flex min-h-[280px] flex-col rounded-xl border p-3 transition-colors ${over ? "border-accent bg-accent-tint" : status === "current" ? "border-accent bg-bg" : "border-line-soft bg-subtle/60"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold">{term.id === "PRE" ? "Taken earlier" : term.label}</h3>
        <span className={`text-xs tabular-nums ${warnings.some((w) => w.kind === "overload") ? "font-semibold text-warn-ink" : "text-muted"}`}>{pts} pts</span>
      </div>
      <p className="mb-2.5 text-xs text-muted">{term.id === "PRE" ? "AP and other credit" : STATUS_TEXT[status]}</p>

      <ul className="flex flex-col gap-1.5">
        {term.courses.map((code) => {
          const c = COURSE_BY_CODE[code];
          const issues = warnings.filter((w) => w.code === code && w.kind !== "unknown");
          return (
            <li
              key={code}
              draggable
              onDragStart={(e) => startCourseDrag(e, code)}
              title={c?.prereqs ? `Prereqs: ${c.prereqs.map((g) => g.join(" or ")).join("; ")}` : undefined}
              className={`group flex cursor-grab items-start gap-2 rounded-lg border bg-bg p-2 active:cursor-grabbing ${flash === code ? "anim-pop border-accent" : "border-line"}`}
            >
              <span aria-hidden="true" className={`mt-1 size-2 flex-none rounded-full ${toneFor(code)} bg-tone-ink`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium whitespace-nowrap">{code}</div>
                <div className="truncate text-xs text-muted">{c?.title ?? "Not in catalog"}</div>
                {issues.map((w, i) => (
                  <p key={i} className="mt-0.5 text-[11px] leading-snug text-warn-ink">
                    {w.message}
                  </p>
                ))}
              </div>
              <button
                onClick={() => apply((p) => removeCourse(p, code))}
                aria-label={`Remove ${code}`}
                className="grid size-5 place-items-center rounded text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-1.5">
        {adding ? (
          <CoursePicker
            onPick={(code) => {
              const res = placeCourse(code, term.id);
              onNotice(res && !res.ok ? res.error : null);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
        ) : (
          <button onClick={() => setAdding(true)} className="min-h-8 w-full rounded-lg border border-dashed border-line px-2 text-left text-xs text-muted hover:border-accent hover:text-ink">
            + Add course
          </button>
        )}
      </div>
    </section>
  );
}

const PILL: Record<RequirementResult["status"], string> = {
  done: "bg-ok-tint text-ok-ink",
  planned: "bg-accent-tint text-accent-ink",
  missing: "bg-subtle text-ink-2",
};
const PILL_TEXT: Record<RequirementResult["status"], string> = { done: "Done", planned: "Planned", missing: "Open" };

function RequirementCard({ program }: { program: ProgramResult }) {
  const apply = usePlanStore((s) => s.apply);
  return (
    <section id={`req-${program.id}`} className="scroll-mt-6 rounded-xl border border-line px-4 py-1.5">
      <div className="flex items-baseline justify-between gap-2 pt-2.5 pb-1">
        <h3 className="text-sm font-semibold">{program.name}</h3>
        <a href={program.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-muted underline-offset-2 hover:underline">
          Official requirements
        </a>
      </div>
      <ul>
        {program.requirements.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-2.5">
            <div className="min-w-0">
              <p className="text-[13px]">{r.name}</p>
              {r.progress.unit !== "items" && r.status !== "done" && (
                <p className="text-xs text-muted">
                  {r.progress.have} of {r.progress.need} {r.progress.unit}
                  {r.counted.length ? `: ${r.counted.join(", ")}` : ""}
                </p>
              )}
            </div>
            {r.manualId ? (
              <button
                onClick={() => apply((p) => setManual(p, r.manualId!, r.status !== "done"))}
                aria-pressed={r.status === "done"}
                className={`flex-none rounded-md px-2 py-0.5 text-xs font-medium ${r.status === "done" ? PILL.done : "border border-dashed border-line text-muted hover:text-ink"}`}
              >
                {r.status === "done" ? "Done" : "Mark done"}
              </button>
            ) : (
              <span className={`flex-none rounded-md px-2 py-0.5 text-xs font-medium ${PILL[r.status]}`}>{PILL_TEXT[r.status]}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
