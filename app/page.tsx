"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSE_BY_CODE } from "@/data/courses";
import { addCourse, emptyPlan } from "@/lib/plan-ops";
import { normalizeGrad, normalizeMajors, normalizeName, normalizeSchool, parseClasses, SCHOOL_LABEL } from "@/lib/onboarding";
import { usePlanStore, useHydrated } from "@/lib/store";

type Key = "name" | "school" | "grad" | "major" | "classes" | "goals";

interface Question {
  key: Key;
  text: (name: string) => string;
  hint: string;
  placeholder: string;
  optional?: boolean;
  multiline?: boolean;
}

const QUESTIONS: Question[] = [
  { key: "name", text: () => "What should we call you?", hint: "Your first name is fine.", placeholder: "Type your name" },
  { key: "school", text: (n) => `Which school are you in, ${n}?`, hint: "Columbia College, SEAS, Barnard or GS. Type it however you like.", placeholder: "cc, seas, barnard…" },
  { key: "grad", text: () => "When do you graduate?", hint: "A year works, or just your class standing.", placeholder: "2029, or sophomore" },
  { key: "major", text: () => "What are you studying, or thinking about?", hint: "Majors, minors, or not sure yet. All of it helps.", placeholder: "math and cs" },
  {
    key: "classes",
    text: () => "What classes have you taken?",
    hint: "List them any way you like: codes, nicknames, typos are fine. Paste a transcript if you have one.",
    placeholder: "calc 1, lit hum, data structures, intro econ…",
    optional: true,
    multiline: true,
  },
  {
    key: "goals",
    text: () => "What do you want to do after Columbia?",
    hint: "Quant, grad school, a startup, no idea yet. This shapes what we recommend.",
    placeholder: "quant trading, maybe a PhD",
    optional: true,
    multiline: true,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const hydrated = useHydrated();
  const hasPlan = usePlanStore((s) => !!s.plan);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<Key, string>>>({});
  const [val, setVal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (hydrated && hasPlan && !building) router.replace("/next-semester");
  }, [hydrated, hasPlan, building, router]);

  const q = QUESTIONS[step];
  const done = step >= QUESTIONS.length;
  const name = normalizeName(answers.name ?? "") || "there";

  // Live feedback for the current answer: what we understood.
  const feedback = useMemo(() => {
    if (!q || !val.trim()) return null;
    if (q.key === "school") {
      const s = normalizeSchool(val);
      if (!s || s === "Other") return null;
      return { read: SCHOOL_LABEL[s], note: s === "CC" ? null : "Requirement tracking is Columbia College only for now. Everything else works." };
    }
    if (q.key === "grad") {
      const y = normalizeGrad(val);
      return y ? { read: `Class of ${y}`, note: null } : null;
    }
    if (q.key === "major") {
      const m = normalizeMajors(val);
      const untracked = m.label !== "Undecided" && m.ids.length === 0;
      return m.label.toLowerCase() === val.trim().toLowerCase() && !untracked
        ? null
        : { read: m.label, note: untracked ? "We can't track this major's requirements yet, but the assistant can still help." : null };
    }
    return null;
  }, [q, val]);

  const parsed = useMemo(() => (q?.key === "classes" ? parseClasses(val) : null), [q, val]);

  if (!hydrated || (hasPlan && !building)) return null;

  const submit = () => {
    if (!q) return;
    const v = val.trim();
    if (!v && !q.optional) return setError("Type an answer to continue.");
    if (q.key === "grad" && !normalizeGrad(v)) return setError("Try a year like 2029, or freshman, sophomore, junior or senior.");
    const next = { ...answers, [q.key]: v };
    setAnswers(next);
    setError(null);
    setStep(step + 1);
    setVal(QUESTIONS[step + 1] ? (next[QUESTIONS[step + 1].key] ?? "") : "");
  };

  const back = () => {
    if (step === 0) return;
    setError(null);
    setStep(step - 1);
    setVal(answers[QUESTIONS[step - 1].key] ?? "");
  };

  const finalClasses = parseClasses(answers.classes ?? "");
  const school = normalizeSchool(answers.school ?? "") ?? "CC";
  const majors = normalizeMajors(answers.major ?? "");
  const classYear = normalizeGrad(answers.grad ?? "") ?? new Date().getFullYear() + 3;

  const build = async () => {
    setBuilding(true);
    let plan = emptyPlan({
      name: normalizeName(answers.name ?? ""),
      school,
      classYear,
      majors: school === "CC" ? majors.ids : [],
      studying: majors.label,
      goals: answers.goals || undefined,
    });
    for (const code of finalClasses.matched) {
      const r = addCourse(plan, code, "PRE");
      if (r.ok) plan = r.plan;
    }
    const store = usePlanStore.getState();
    store.setPlan(plan);

    // If the assistant is set up, let it sort out anything we couldn't and suggest next semester.
    let ai = false;
    try {
      ai = (await (await fetch("/api/chat")).json()).ai;
    } catch {}
    if (ai) {
      const parts = ["I just set up my plan."];
      if (finalClasses.matched.length) parts.push(`You've added these as already taken: ${finalClasses.matched.join(", ")}. If I said when I took them, move them to those semesters.`);
      if (finalClasses.unmatched.length) parts.push(`You couldn't match these classes I've taken: ${finalClasses.unmatched.join("; ")}. Find them in the catalog and add them, or ask me about them.`);
      parts.push("Then suggest courses for next semester.");
      store.setPendingMessage(parts.join(" "));
      store.setChatMode("corner");
    }
    router.push("/next-semester");
  };

  const summary = [
    ["School", SCHOOL_LABEL[school]],
    ["Graduating", `Class of ${classYear}`],
    ["Studying", majors.label || "Not set yet"],
    ["Classes taken", finalClasses.matched.length ? finalClasses.matched.map((c) => COURSE_BY_CODE[c].title).join(", ") : "None yet"],
    ["Goals", answers.goals || "Not set yet"],
  ];

  const progress = `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%`;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="h-[3px] bg-line-soft" aria-hidden="true">
        <div className="h-[3px] bg-accent transition-[width] duration-500 ease-out" style={{ width: progress }} />
      </div>

      <header className="flex items-center justify-between gap-4 px-6 py-6 md:px-10">
        <Logo />
        <div className="flex items-center gap-4">
          {!done && (
            <span className="text-sm text-muted tabular-nums">
              {step + 1} of {QUESTIONS.length}
            </span>
          )}
          <ThemeToggle className="w-28" />
        </div>
      </header>

      <main className="flex flex-1 items-center px-6 pb-24 md:px-10">
        <div className="mx-auto w-full max-w-[760px]">
          {q && (
            <div key={step} className="anim-rise">
              <label htmlFor="answer" className="mb-3.5 block text-[32px] leading-[1.15] font-medium tracking-[-0.025em] md:text-[40px]">
                {q.text(name)}
              </label>
              <p className="mb-9 text-lg leading-relaxed text-muted">{q.hint}</p>

              {q.multiline ? (
                <textarea
                  id="answer"
                  autoFocus
                  rows={3}
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={q.placeholder}
                  className="w-full resize-none border-0 bg-transparent p-0 text-[24px] leading-snug tracking-[-0.015em] text-ink caret-accent outline-none md:text-[30px]"
                />
              ) : (
                <input
                  id="answer"
                  autoFocus
                  autoComplete="off"
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={q.placeholder}
                  className="w-full border-0 bg-transparent p-0 text-[32px] tracking-[-0.025em] text-ink caret-accent outline-none md:text-[40px]"
                />
              )}

              {parsed && parsed.matched.length > 0 && (
                <div className="mt-7">
                  <p className="mb-3 text-sm text-muted">
                    Recognized {parsed.matched.length} {parsed.matched.length === 1 ? "class" : "classes"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {parsed.matched.map((code) => (
                      <span key={code} className="anim-rise inline-flex items-baseline gap-2 rounded-[10px] border border-line bg-raised px-3 py-2 text-sm">
                        <strong className="font-semibold">{code}</strong>
                        <span className="text-muted">{COURSE_BY_CODE[code].title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsed && parsed.unmatched.length > 0 && val.trim() && (
                <p className="mt-4 text-sm text-muted">The assistant will look up: {parsed.unmatched.join(", ")}</p>
              )}

              {feedback && (
                <div className="mt-6 text-[15px] text-muted">
                  <p>
                    We&apos;ll read that as <strong className="font-semibold text-ink">{feedback.read}</strong>
                  </p>
                  {feedback.note && <p className="mt-1">{feedback.note}</p>}
                </div>
              )}

              <div className="mt-11 flex flex-wrap items-center gap-4">
                <button onClick={submit} className="min-h-11 rounded-[10px] bg-button px-5.5 text-base font-medium text-on-button hover:opacity-90">
                  {q.optional && !val.trim() ? "Skip" : "OK"}
                </button>
                <span className="text-sm text-muted">{q.multiline ? "press Enter, or Shift + Enter for a new line" : "press Enter"}</span>
                {error && (
                  <span role="alert" className="text-sm text-warn-ink">
                    {error}
                  </span>
                )}
              </div>
            </div>
          )}

          {done && (
            <div className="anim-rise">
              <h1 className="mb-3.5 text-[40px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[48px]">You&apos;re set, {name}.</h1>
              <p className="mb-10 text-lg text-muted">Here&apos;s what we heard. You can change any of it later.</p>
              <dl className="grid grid-cols-[120px_1fr] gap-x-6 gap-y-4 text-[17px] md:grid-cols-[160px_1fr] md:text-lg">
                {summary.map(([label, value], i) => (
                  <div key={label} className="contents">
                    <dt className="anim-fade text-muted" style={{ animationDelay: `${120 + i * 110}ms` }}>
                      {label}
                    </dt>
                    <dd className="anim-rise" style={{ animationDelay: `${120 + i * 110}ms` }}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <button
                  onClick={build}
                  disabled={building}
                  className="min-h-12 rounded-xl bg-button px-6.5 text-[17px] font-medium text-on-button hover:opacity-90 disabled:opacity-60"
                >
                  {building ? "Building your plan…" : "Build my plan"}
                </button>
                <button onClick={back} className="min-h-11 px-3 text-[15px] text-muted hover:text-ink">
                  Change an answer
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed right-6 bottom-6 flex gap-1.5 md:right-8 md:bottom-8">
        <button onClick={back} aria-label="Previous question" disabled={step === 0} className="grid size-11 place-items-center rounded-l-[10px] bg-subtle text-ink hover:bg-hover disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 11l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button onClick={submit} aria-label="Next question" disabled={done} className="grid size-11 place-items-center rounded-r-[10px] bg-subtle text-ink hover:bg-hover disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
