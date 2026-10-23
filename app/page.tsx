"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { PickedRow, Picker, Segmented, type PickerOption } from "@/components/picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURSE_BY_CODE } from "@/data/courses";
import { MAJORS, MINORS, searchStudies, type StudyOption } from "@/data/majors";
import { formatDays, formatTime, meetingFor } from "@/data/sections";
import { currentAndNext } from "@/lib/engine";
import { normalizeGrad, normalizeName, parseClasses, SCHOOL_LABEL } from "@/lib/onboarding";
import { addCourse, emptyPlan } from "@/lib/plan-ops";
import { searchCourses } from "@/lib/search";
import { usePlanStore, useHydrated } from "@/lib/store";
import type { School, Study } from "@/lib/types";

type Step = "name" | "school" | "year" | "major" | "minor" | "taken" | "want" | "goals";
const STEPS: Step[] = ["name", "school", "year", "major", "minor", "taken", "want", "goals"];
const OPTIONAL: Step[] = ["major", "minor", "taken", "want", "goals"];

const SCHOOLS: { id: School; label: string }[] = [
  { id: "CC", label: "Columbia College" },
  { id: "SEAS", label: "Columbia Engineering" },
  { id: "Barnard", label: "Barnard" },
  { id: "GS", label: "General Studies" },
  { id: "Other", label: "Somewhere else" },
];
const YEARS = ["First-year", "Sophomore", "Junior", "Senior"];

const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

interface Picked extends Study {
  key: string;
  subtitle: string;
}

export default function Onboarding() {
  const router = useRouter();
  const hydrated = useHydrated();
  const hasPlan = usePlanStore((s) => !!s.plan);
  const [building, setBuilding] = useState(false);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [majors, setMajors] = useState<Picked[]>([]);
  const [minors, setMinors] = useState<Picked[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [takenUnknown, setTakenUnknown] = useState<string[]>([]);
  const [want, setWant] = useState<string[]>([]);
  const [wantUnknown, setWantUnknown] = useState<string[]>([]);
  const [goals, setGoals] = useState("");

  const current = STEPS[step];
  const done = step >= STEPS.length;
  const displayName = normalizeName(name) || "there";
  const upperclass = year === "Junior" || year === "Senior";

  useEffect(() => {
    if (hydrated && hasPlan && !building) router.replace("/next-semester");
  }, [hydrated, hasPlan, building, router]);

  const hasAnswer = (s: Step | undefined) =>
    s === "name" ? !!name.trim()
    : s === "school" ? !!school
    : s === "year" ? !!year
    : s === "major" ? majors.length > 0
    : s === "minor" ? minors.length > 0
    : s === "taken" ? taken.length + takenUnknown.length > 0
    : s === "want" ? want.length + wantUnknown.length > 0
    : s === "goals" ? !!goals.trim()
    : false;

  const next = useCallback(() => {
    if (!current) return;
    if (!hasAnswer(current) && !OPTIONAL.includes(current)) {
      setError(current === "name" ? "Type your name to continue." : "Pick one to continue.");
      return;
    }
    setError(null);
    setStep((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, name, school, year, majors, minors, taken, takenUnknown, want, wantUnknown, goals]);

  const back = () => {
    if (step === 0) return;
    setError(null);
    setStep(step - 1);
  };

  const choose = (set: () => void) => {
    set();
    setError(null);
    setTimeout(() => setStep((s) => s + 1), 180);
  };

  // Number keys pick an option on the school and year screens.
  useEffect(() => {
    if (current !== "school" && current !== "year") return;
    const onKey = (e: KeyboardEvent) => {
      // The Enter that submitted the previous screen is already handled.
      if (e.defaultPrevented || e.repeat) return;
      const n = Number(e.key);
      if (current === "school" && n >= 1 && n <= SCHOOLS.length) choose(() => setSchool(SCHOOLS[n - 1].id));
      if (current === "year" && n >= 1 && n <= YEARS.length) choose(() => setYear(YEARS[n - 1]));
      if (e.key === "Enter") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, next]);

  if (!hydrated || (hasPlan && !building)) return null;

  // ---- majors & minors ----
  const schoolGroup = school === "SEAS" ? "Engineering" : school === "Other" || !school ? null : "College";
  const studyList = (list: StudyOption[]) => {
    const scoped = schoolGroup ? list.filter((o) => o.schools.includes(schoolGroup)) : list;
    return scoped.length ? scoped : list;
  };
  const toPicked = (o: StudyOption, kind: Study["kind"]): Picked => {
    const tracked = !!o.programId && school === "CC";
    return {
      key: o.id,
      name: o.name,
      kind,
      status: upperclass ? "declared" : "potential",
      programId: tracked ? o.programId : undefined,
      subtitle: `${o.schools.join(", ")}${kind === "major" ? (tracked ? ". Requirements tracked" : ". Requirement tracking coming later") : ""}`,
    };
  };
  const custom = (text: string, kind: Study["kind"]): Picked => ({
    key: `custom:${text.toLowerCase()}`,
    name: normalizeName(text),
    kind,
    status: upperclass ? "declared" : "potential",
    subtitle: "Not in our list yet. The assistant will still use it.",
  });
  const addStudy = (kind: Study["kind"], items: Picked[]) => {
    const set = kind === "major" ? setMajors : setMinors;
    set((prev) => [...prev, ...items.filter((i) => !prev.some((p) => p.key === i.key))]);
  };
  const studyPicker = (kind: Study["kind"], picked: Picked[]) => {
    const list = studyList(kind === "major" ? MAJORS : MINORS);
    return (
      <Picker
        id="answer"
        placeholder={kind === "major" ? "Type a major, like “cs”, “econ” or “urban planning”" : "Type a minor, like “stats” or “music”"}
        search={(q) =>
          searchStudies(list, q)
            .filter((o) => !picked.some((p) => p.key === o.id))
            .map((o) => ({ key: o.id, title: o.name, subtitle: o.schools.join(", ") }))
        }
        onAdd={(key) => addStudy(kind, [toPicked(list.find((o) => o.id === key)!, kind)])}
        onBulk={(text) =>
          addStudy(
            kind,
            text
              .split(/[,;\n]+/)
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) => {
                const hit = searchStudies(list, t, 1)[0];
                return hit ? toPicked(hit, kind) : custom(t, kind);
              }),
          )
        }
        onNoMatch={(text) => addStudy(kind, [custom(text, kind)])}
        onDone={next}
      />
    );
  };
  const studyRows = (picked: Picked[], set: React.Dispatch<React.SetStateAction<Picked[]>>) => (
    <ul className="mt-3 flex flex-col gap-2">
      {picked.map((p) => (
        <PickedRow key={p.key} title={p.name} subtitle={p.subtitle} onRemove={() => set((prev) => prev.filter((x) => x.key !== p.key))}>
          <Segmented
            label={`${p.name} status`}
            value={p.status}
            options={["declared", "potential"]}
            onChange={(status) => set((prev) => prev.map((x) => (x.key === p.key ? { ...x, status } : x)))}
          />
        </PickedRow>
      ))}
    </ul>
  );

  // ---- classes ----
  const classYear = normalizeGrad(year ?? "") ?? new Date().getFullYear() + 3;
  const previewNext = currentAndNext(emptyPlan({ school: school ?? "CC", classYear, majors: [] })).next;
  const courseOptions = (q: string, exclude: string[], withTime: boolean): PickerOption[] => {
    const nick = parseClasses(q).matched.map((c) => COURSE_BY_CODE[c]);
    const seen = new Set<string>(exclude);
    return [...nick, ...searchCourses({ query: q, limit: 10 })]
      .filter((c) => !seen.has(c.code) && seen.add(c.code))
      .slice(0, 6)
      .map((c) => {
        const m = withTime && previewNext ? meetingFor(c.code, previewNext.id) : undefined;
        return { key: c.code, title: `${c.code}  ${c.title}`, subtitle: m ? `${formatDays(m.days)} ${formatTime(m.start)}` : `${c.points} points` };
      });
  };
  const coursePicker = (list: string[], setList: (f: (p: string[]) => string[]) => void, setUnknown: (f: (p: string[]) => string[]) => void, withTime: boolean, placeholder: string) => (
    <Picker
      id="answer"
      placeholder={placeholder}
      search={(q) => courseOptions(q, list, withTime)}
      onAdd={(code) => setList((p) => (p.includes(code) ? p : [...p, code]))}
      onBulk={(text) => {
        const r = parseClasses(text);
        setList((p) => [...p, ...r.matched.filter((c) => !p.includes(c))]);
        setUnknown((p) => [...p, ...r.unmatched.filter((u) => !p.includes(u))]);
      }}
      onNoMatch={(text) => {
        const r = parseClasses(text);
        if (r.matched.length) setList((p) => [...p, ...r.matched.filter((c) => !p.includes(c))]);
        else setUnknown((p) => (p.includes(text) ? p : [...p, text]));
      }}
      onDone={next}
    />
  );
  const courseRows = (list: string[], setList: (f: (p: string[]) => string[]) => void, unknown: string[], setUnknown: (f: (p: string[]) => string[]) => void, withTime: boolean) => (
    <ul className="mt-3 flex flex-col gap-2">
      {[...list].reverse().map((code) => {
        const c = COURSE_BY_CODE[code];
        const m = withTime && previewNext ? meetingFor(code, previewNext.id) : undefined;
        return (
          <PickedRow
            key={code}
            title={`${code}  ${c.title}`}
            subtitle={m ? `${formatDays(m.days)} ${formatTime(m.start)} to ${formatTime(m.end)} (sample time)` : `${c.points} points`}
            onRemove={() => setList((p) => p.filter((x) => x !== code))}
          />
        );
      })}
      {unknown.map((u) => (
        <PickedRow key={u} warn title={u} subtitle="Not in our catalog yet. The assistant will look it up." onRemove={() => setUnknown((p) => p.filter((x) => x !== u))} />
      ))}
    </ul>
  );

  // ---- finish ----
  const build = async () => {
    setBuilding(true);
    const studies: Study[] = [...majors, ...minors].map(({ name, kind, status, programId }) => ({ name, kind, status, programId }));
    const trackedIds = [...new Set(majors.map((m) => m.programId).filter((x): x is string => !!x))];
    let plan = emptyPlan({
      name: normalizeName(name),
      school: school ?? "CC",
      classYear,
      majors: trackedIds,
      studies,
      studying: majors.length ? joinAnd(majors.map((m) => m.name)) : "Undecided",
      goals: goals.trim() || undefined,
    });
    for (const code of taken) {
      const r = addCourse(plan, code, "PRE");
      if (r.ok) plan = r.plan;
    }
    const nextTerm = currentAndNext(plan).next;
    if (nextTerm) {
      for (const code of want) {
        const r = addCourse(plan, code, nextTerm.id);
        if (r.ok) plan = r.plan;
      }
    }
    const store = usePlanStore.getState();
    store.setPlan(plan);

    let ai = false;
    try {
      ai = (await (await fetch("/api/chat")).json()).ai;
    } catch {}
    if (ai) {
      const parts = ["I just set up my plan."];
      if (taken.length) parts.push(`My classes taken are in "Taken earlier". If you can tell from my class year which semester they belong in, ask me before moving them.`);
      if (takenUnknown.length) parts.push(`You couldn't match these classes I've taken: ${takenUnknown.join("; ")}. Find them in the catalog and add them, or ask me about them.`);
      if (wantUnknown.length) parts.push(`I also want to take these next semester but you couldn't match them: ${wantUnknown.join("; ")}.`);
      parts.push("Then suggest courses for next semester.");
      store.setPendingMessage(parts.join(" "));
      store.setChatMode("corner");
    }
    router.push("/next-semester");
  };

  const list = (xs: string[]) => (xs.length ? xs.join(", ") : "None");
  const summary: [string, string][] = [
    ["School", school ? SCHOOL_LABEL[school] : ""],
    ["Graduating", `Class of ${classYear}`],
    ["Majors", majors.length ? majors.map((m) => `${m.name} (${m.status})`).join(", ") : "Not sure yet"],
    ["Minors", list(minors.map((m) => `${m.name} (${m.status})`))],
    ["Classes taken", taken.length || takenUnknown.length ? `${taken.length + takenUnknown.length} classes` : "None yet"],
    ["Next semester", list([...want, ...wantUnknown])],
    ["Goals", goals.trim() || "Not set yet"],
  ];

  const QUESTION: Record<Step, { text: string; hint: string }> = {
    name: { text: "What should we call you?", hint: "Your first name is fine." },
    school: { text: `Which school are you in, ${displayName}?`, hint: "Click one, or press its number." },
    year: { text: "What year are you?", hint: "We'll lay out your semesters from here." },
    major: { text: "What are you majoring in?", hint: "Search and press Enter to add. Add as many as you like and mark each one declared or potential." },
    minor: { text: "Any minors?", hint: "Optional. Press Enter on an empty box to skip." },
    taken: { text: "What classes have you taken?", hint: "Add them one at a time, or paste a whole list or transcript. Check the list before you continue." },
    want: { text: "Any classes you already want next semester?", hint: "Optional. We'll put them on your next semester." },
    goals: { text: "What do you want to do after Columbia?", hint: "Quant, grad school, a startup, no idea yet. This shapes what we recommend." },
  };

  const progress = `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%`;
  const q = current ? QUESTION[current] : null;

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
              {step + 1} of {STEPS.length}
            </span>
          )}
          <ThemeToggle className="w-28" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-[10vh] pb-28 md:px-10">
        <div className="mx-auto w-full max-w-[760px]">
          {q && current && (
            <div key={current} className="anim-rise">
              <label htmlFor="answer" className="mb-3.5 block text-[32px] leading-[1.15] font-medium tracking-[-0.025em] md:text-[40px]">
                {q.text}
              </label>
              <p className="mb-8 text-lg leading-relaxed text-muted">{q.hint}</p>

              {current === "name" && (
                <input
                  id="answer"
                  autoFocus
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), next())}
                  placeholder="Type your name"
                  className="w-full border-0 bg-transparent p-0 text-[32px] tracking-[-0.025em] text-ink caret-accent outline-none md:text-[40px]"
                />
              )}

              {(current === "school" || current === "year") && (
                <div role="radiogroup" aria-label={q.text} className="grid gap-2.5 sm:grid-cols-2">
                  {(current === "school" ? SCHOOLS.map((s) => [s.id, s.label] as const) : YEARS.map((y) => [y, y] as const)).map(([id, label], i) => {
                    const on = current === "school" ? school === id : year === id;
                    return (
                      <button
                        key={id}
                        id={i === 0 ? "answer" : undefined}
                        autoFocus={i === 0}
                        role="radio"
                        aria-checked={on}
                        onClick={() => choose(() => (current === "school" ? setSchool(id as School) : setYear(id)))}
                        className={`flex min-h-14 items-center gap-3.5 rounded-xl border px-4 text-left text-[17px] transition-colors ${on ? "border-accent bg-accent-tint font-medium" : "border-line bg-raised hover:border-ink"}`}
                      >
                        <kbd className={`grid size-6 flex-none place-items-center rounded-md border text-xs font-medium ${on ? "border-accent text-accent-ink" : "border-line text-muted"}`}>{i + 1}</kbd>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {current === "major" && (
                <>
                  {studyPicker("major", majors)}
                  {studyRows(majors, setMajors)}
                </>
              )}
              {current === "minor" && (
                <>
                  {studyPicker("minor", minors)}
                  {studyRows(minors, setMinors)}
                </>
              )}
              {current === "taken" && (
                <>
                  {coursePicker(taken, setTaken, setTakenUnknown, false, "calc 3, lit hum, data structures…")}
                  {courseRows(taken, setTaken, takenUnknown, setTakenUnknown, false)}
                </>
              )}
              {current === "want" && (
                <>
                  {coursePicker(want, setWant, setWantUnknown, true, "Course code or name, like COMS 4771 or number theory")}
                  {courseRows(want, setWant, wantUnknown, setWantUnknown, true)}
                </>
              )}

              {current === "goals" && (
                <textarea
                  id="answer"
                  autoFocus
                  rows={3}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      next();
                    }
                  }}
                  placeholder="quant trading, maybe a PhD"
                  className="w-full resize-none border-0 bg-transparent p-0 text-[24px] leading-snug tracking-[-0.015em] text-ink caret-accent outline-none md:text-[30px]"
                />
              )}

              {current !== "school" && current !== "year" && (
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <button onClick={next} className="min-h-11 rounded-[10px] bg-button px-5.5 text-base font-medium text-on-button hover:opacity-90">
                    {OPTIONAL.includes(current) && !hasAnswer(current) ? "Skip" : "OK"}
                  </button>
                  <span className="text-sm text-muted">
                    {["major", "minor", "taken", "want"].includes(current) ? "press Enter on an empty box to continue" : current === "goals" ? "press Enter, or Shift + Enter for a new line" : "press Enter"}
                  </span>
                </div>
              )}
              {error && (
                <p role="alert" className="mt-4 text-sm text-warn-ink">
                  {error}
                </p>
              )}
            </div>
          )}

          {done && (
            <div className="anim-rise">
              <h1 className="mb-3.5 text-[40px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[48px]">You&apos;re set, {displayName}.</h1>
              <p className="mb-10 text-lg text-muted">Here&apos;s what we heard. You can change any of it later.</p>
              <dl className="grid grid-cols-[120px_1fr] gap-x-6 gap-y-4 text-[17px] md:grid-cols-[160px_1fr] md:text-lg">
                {summary.map(([label, value], i) => (
                  <div key={label} className="contents">
                    <dt className="anim-fade text-muted" style={{ animationDelay: `${120 + i * 90}ms` }}>
                      {label}
                    </dt>
                    <dd className="anim-rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <button onClick={build} disabled={building} className="min-h-12 rounded-xl bg-button px-6.5 text-[17px] font-medium text-on-button hover:opacity-90 disabled:opacity-60">
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
        <button onClick={next} aria-label="Next question" disabled={done} className="grid size-11 place-items-center rounded-r-[10px] bg-subtle text-ink hover:bg-hover disabled:opacity-40">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
