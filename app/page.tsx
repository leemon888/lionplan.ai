"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MAJORS } from "@/data/programs";
import { emptyPlan } from "@/lib/plan-ops";
import { usePlanStore, useHydrated } from "@/lib/store";

const YEARS = [2027, 2028, 2029, 2030];

export default function Onboarding() {
  const router = useRouter();
  const hydrated = useHydrated();
  const hasPlan = usePlanStore((s) => !!s.plan);
  const [classYear, setClassYear] = useState(2029);
  const [majors, setMajors] = useState<string[]>([]);
  const [about, setAbout] = useState("");

  useEffect(() => {
    if (hydrated && hasPlan) router.replace("/plan");
  }, [hydrated, hasPlan, router]);

  if (!hydrated || hasPlan) return null;

  const start = () => {
    const { setPlan, setPendingMessage } = usePlanStore.getState();
    setPlan(emptyPlan({ school: "CC", classYear, majors }));
    if (about.trim()) {
      setPendingMessage(
        `Here's my background. Add the courses I've already taken to my plan, save my goals to my profile, then suggest what I should take next semester.\n\n${about.trim()}`,
      );
    }
    router.push("/plan");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-16">
      <p className="font-serif text-xl">Lionplan</p>
      <h1 className="mt-10 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
        Plan your four years at Columbia.
      </h1>
      <p className="mt-5 max-w-prose text-lg text-ink-soft">
        Tell us where you are. Lionplan lays out your semesters, tracks the Core and your major, and rearranges the plan
        when you ask.
      </p>

      <form
        className="mt-12 space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <fieldset>
          <legend className="mb-3 font-medium">Class of</legend>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((y) => (
              <button
                type="button"
                key={y}
                onClick={() => setClassYear(y)}
                aria-pressed={classYear === y}
                className={`rounded-lg border px-4 py-2 tabular-nums ${classYear === y ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}
              >
                {y}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-medium">
            Major <span className="font-normal text-ink-faint">(pick any, or none yet)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {MAJORS.map((m) => {
              const on = majors.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMajors(on ? majors.filter((x) => x !== m.id) : [...majors, m.id])}
                  aria-pressed={on}
                  className={`rounded-lg border px-4 py-2 ${on ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="about" className="mb-3 block font-medium">
            Anything else? <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={6}
            placeholder={"Paste your transcript or list courses you've taken, with semesters.\nAdd career goals and constraints, like: quant finance, no 9ams, studying abroad junior spring."}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 leading-relaxed outline-none placeholder:text-ink-faint focus:border-ink"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="rounded-xl bg-ink px-6 py-3 font-medium text-white hover:bg-ink/90">
            Build my plan
          </button>
          <p className="text-sm text-ink-faint">Columbia College only for now. Your plan stays in this browser.</p>
        </div>
      </form>
    </main>
  );
}
