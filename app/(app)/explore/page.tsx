"use client";

import { useState } from "react";
import { useLionChat } from "@/components/chat-provider";
import { analyzePlan, termStatus } from "@/lib/engine";
import { addCourse } from "@/lib/plan-ops";
import { searchCourses } from "@/lib/search";
import { usePlanStore } from "@/lib/store";

export default function ExplorePage() {
  const plan = usePlanStore((s) => s.plan)!;
  const apply = usePlanStore((s) => s.apply);
  const setChatOpen = usePlanStore((s) => s.setChatOpen);
  const { sendMessage } = useLionChat();
  const report = analyzePlan(plan);

  const futureTerms = plan.terms.filter((t) => ["current", "future"].includes(termStatus(t)));
  const [query, setQuery] = useState("");
  const [requirement, setRequirement] = useState("");
  const [target, setTarget] = useState(futureTerms.find((t) => termStatus(t) === "future")?.id ?? futureTerms[0]?.id ?? "PRE");
  const [notice, setNotice] = useState<string | null>(null);

  const open = report.programs.flatMap((p) =>
    p.requirements.filter((r) => r.status === "missing" && !r.manualId).map((r) => ({ key: `${p.id}/${r.id}`, label: `${p.name}: ${r.name}` })),
  );
  const inPlan = new Map(plan.terms.flatMap((t) => t.courses.map((c) => [c, t.label] as const)));
  const results = searchCourses({ query, requirement: requirement || undefined, limit: 60 });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl tracking-tight">Explore courses</h1>
        <button
          onClick={() => {
            setChatOpen(true);
            sendMessage({ text: "Recommend courses for my next semester based on my open requirements and goals." });
          }}
          className="rounded-lg border border-ink px-3 py-1.5 text-sm hover:bg-ink hover:text-white"
        >
          Get recommendations
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code or title"
          aria-label="Search courses"
          className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-ink"
        />
        <select
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          aria-label="Filter by open requirement"
          className="rounded-lg border border-line bg-surface px-3 py-2"
        >
          <option value="">All courses</option>
          {open.map((o) => (
            <option key={o.key} value={o.key}>
              Fills {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Add to
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            {futureTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && <p className="mt-4 rounded-md bg-amber-tint px-3 py-2 text-sm text-amber">{notice}</p>}

      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
        {results.map((c) => (
          <li key={c.code} className="flex items-start gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {c.code} <span className="font-normal text-ink-soft">{c.title}</span>
              </p>
              <p className="text-sm text-ink-faint">
                {c.points} pts
                {c.prereqs ? `. Prereqs: ${c.prereqs.map((g) => g.join(" or ")).join("; ")}` : ""}
              </p>
            </div>
            {inPlan.has(c.code) ? (
              <span className="text-sm text-ink-faint">In {inPlan.get(c.code)}</span>
            ) : (
              <button
                onClick={() => {
                  const res = apply((p) => addCourse(p, c.code, target));
                  setNotice(res && !res.ok ? res.error : null);
                }}
                className="shrink-0 rounded-md bg-ink px-3 py-1 text-sm text-white hover:bg-ink/90"
              >
                Add
              </button>
            )}
          </li>
        ))}
        {results.length === 0 && <li className="px-5 py-6 text-ink-soft">No matching courses in the catalog yet.</li>}
      </ul>
    </div>
  );
}
