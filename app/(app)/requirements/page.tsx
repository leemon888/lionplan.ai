"use client";

import { ProgramDetail } from "@/components/requirements-view";
import { analyzePlan } from "@/lib/engine";
import { usePlanStore } from "@/lib/store";

export default function RequirementsPage() {
  const plan = usePlanStore((s) => s.plan)!;
  const report = analyzePlan(plan);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl tracking-tight">Requirements</h1>
      <p className="mt-2 mb-8 max-w-prose text-ink-soft">
        Checked against your plan as you edit it. Some requirements, like the swim test, can&apos;t be tracked from courses
        yet, so tick them off yourself. Confirm anything important with your advisor.
      </p>
      <div className="space-y-6">
        {report.programs.map((p) => (
          <ProgramDetail key={p.id} program={p} />
        ))}
      </div>
    </div>
  );
}
