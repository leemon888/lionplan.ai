"use client";

import Link from "next/link";
import { setManual } from "@/lib/plan-ops";
import { usePlanStore } from "@/lib/store";
import type { ProgramResult, RequirementResult } from "@/lib/types";

export function ProgressBar({ done, planned, total }: { done: number; planned: number; total: number }) {
  const pct = (n: number) => `${total ? Math.min(100, (n / total) * 100) : 0}%`;
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${done} of ${total} done, ${planned} including planned`}>
      <div className="absolute inset-y-0 left-0 bg-sky" style={{ width: pct(planned) }} />
      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: pct(done) }} />
    </div>
  );
}

/** Compact per-program summary used on the planner page. */
export function ProgramSummary({ programs }: { programs: ProgramResult[] }) {
  return (
    <div className="@container"><div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
      {programs.map((p) => (
        <Link key={p.id} href="/requirements" className="rounded-xl border border-line bg-surface p-4 hover:border-ink">
          <p className="text-sm font-semibold">{p.name}</p>
          <p className="mt-0.5 mb-3 text-xs text-ink-soft">
            {p.done} done, {p.planned - p.done} planned, {p.total - p.planned} open
          </p>
          <ProgressBar done={p.done} planned={p.planned} total={p.total} />
        </Link>
      ))}
    </div></div>
  );
}

const STATUS_TEXT: Record<RequirementResult["status"], string> = {
  done: "Done",
  planned: "Planned",
  missing: "Open",
};
const STATUS_STYLE: Record<RequirementResult["status"], string> = {
  done: "bg-moss-tint text-moss",
  planned: "bg-sky-tint text-ink",
  missing: "bg-line/60 text-ink-soft",
};

export function ProgramDetail({ program }: { program: ProgramResult }) {
  const apply = usePlanStore((s) => s.apply);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">{program.name}</h2>
        <a href={program.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-ink-faint underline underline-offset-2">
          Official requirements
        </a>
      </div>
      <div className="mt-3 mb-5">
        <ProgressBar done={program.done} planned={program.planned} total={program.total} />
      </div>
      <ul className="divide-y divide-line">
        {program.requirements.map((r) => (
          <li key={r.id} className="flex items-start gap-4 py-3">
            {r.manualId ? (
              <input
                type="checkbox"
                checked={r.status === "done"}
                onChange={(e) => apply((p) => setManual(p, r.manualId!, e.target.checked))}
                aria-label={`Mark ${r.name} complete`}
                className="mt-1 size-4 accent-ink"
              />
            ) : (
              <span className={`mt-0.5 w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                {STATUS_TEXT[r.status]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium">{r.name}</p>
                {r.progress.unit !== "items" && (
                  <p className="text-sm tabular-nums text-ink-soft">
                    {r.progress.have}/{r.progress.need} {r.progress.unit}
                  </p>
                )}
              </div>
              {r.counted.length > 0 && <p className="text-sm text-ink-soft">{r.counted.join(", ")}</p>}
              {r.note && <p className="mt-0.5 text-sm text-ink-faint">{r.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
