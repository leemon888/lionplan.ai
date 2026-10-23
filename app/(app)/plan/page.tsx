"use client";

import { PlannerGrid } from "@/components/planner-grid";
import { ProgramSummary } from "@/components/requirements-view";
import { analyzePlan } from "@/lib/engine";
import { usePlanStore } from "@/lib/store";

export default function PlanPage() {
  const plan = usePlanStore((s) => s.plan)!;
  const report = analyzePlan(plan);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight">Your four years</h1>
        <p className="text-sm tabular-nums text-ink-soft">
          {report.points.done} points completed, {report.points.planned} planned of {report.points.required}
        </p>
      </div>
      <ProgramSummary programs={report.programs} />
      <div className="mt-10">
        <PlannerGrid plan={plan} warnings={report.warnings} />
      </div>
    </div>
  );
}
