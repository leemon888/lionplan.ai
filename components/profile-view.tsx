"use client";

import Link from "next/link";
import { useState } from "react";
import { COURSE_BY_CODE } from "@/data/courses";
import { searchStudies } from "@/data/majors";
import { analyzePlan, pointsOf, termStatus } from "@/lib/engine";
import { normalizeName, SCHOOL_LABEL } from "@/lib/onboarding";
import { addCourse, removeCourse, updateProfile } from "@/lib/plan-ops";
import { studiesPatch, studyOptions, trackedProgram } from "@/lib/profile";
import { usePlanStore } from "@/lib/store";
import { toneFor } from "@/lib/tone";
import type { Plan, School, Study, Term } from "@/lib/types";
import { CoursePicker } from "./course-picker";
import { Picker, Segmented } from "./picker";

const SCHOOLS = Object.keys(SCHOOL_LABEL) as School[];

export function ProfileView() {
  const plan = usePlanStore((s) => s.plan)!;
  const apply = usePlanStore((s) => s.apply);
  const p = plan.profile;
  const report = analyzePlan(plan);
  const initials = (p.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Completed and in-progress semesters, newest last; planned ones live on the four-year plan.
  const record = plan.terms.filter(
    (t) =>
      t.id === "PRE" || termStatus(t) === "past" || termStatus(t) === "current",
  );
  const taken = record
    .filter((t) => termStatus(t) !== "current")
    .flatMap((t) => t.courses);
  const planned = plan.terms
    .filter((t) => t.id !== "PRE" && termStatus(t) === "future")
    .flatMap((t) => t.courses);
  const setStudies = (studies: Study[]) =>
    apply((pl) => updateProfile(pl, studiesPatch(studies, pl.profile.school)));

  return (
    <div className="mx-auto max-w-[880px] px-6 py-9 md:px-10">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 flex-none place-items-center rounded-full bg-accent-tint text-xl font-semibold text-accent-ink"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[30px] leading-tight font-semibold tracking-[-0.025em]">
            {p.name || "Your profile"}
          </h1>
          <p className="text-[15px] text-muted">
            {SCHOOL_LABEL[p.school]}, class of {p.classYear}
          </p>
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-3">
        <Stat label="Classes taken" value={taken.length} />
        <Stat
          label="Points done"
          value={report.points.done}
          of={report.points.required}
        />
        <Stat label="Classes planned" value={planned.length} href="/plan" />
      </dl>

      <Section title="Basics">
        <Row label="Name">
          <NameInput
            value={p.name ?? ""}
            onSave={(name) =>
              apply((pl) =>
                updateProfile(pl, { name: normalizeName(name) || undefined }),
              )
            }
          />
        </Row>
        <Row label="School">
          <Select
            label="School"
            value={p.school}
            options={SCHOOLS.map((s) => ({ value: s, label: SCHOOL_LABEL[s] }))}
            onChange={(school) =>
              apply((pl) =>
                updateProfile(pl, {
                  school: school as School,
                  ...studiesPatch(pl.profile.studies ?? [], school as School),
                }),
              )
            }
          />
        </Row>
        <Row label="Graduating">
          <Select
            label="Graduation year"
            value={String(p.classYear)}
            options={yearOptions(p.classYear).map((y) => ({
              value: String(y),
              label: `Class of ${y}`,
            }))}
            onChange={(y) =>
              apply((pl) => updateProfile(pl, { classYear: Number(y) }))
            }
          />
        </Row>
        <Row label="Saved">
          <span className="text-[14px] text-muted">In this browser</span>
        </Row>
      </Section>
      {p.school !== "CC" && (
        <p className="mt-2 px-1 text-xs text-muted">
          Requirement tracking covers Columbia College only for now. Planning
          and the assistant still work.
        </p>
      )}

      <Studies plan={plan} onChange={setStudies} />

      <section className="mt-9">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">
            Classes
          </h2>
          <Link href="/plan" className="hidden text-[13px] text-muted hover:text-ink sm:inline">
            Planned classes are on your four-year plan →
          </Link>
        </div>
        <div className="flex flex-col gap-6">
          {record.map((t) => (
            <TermRecord key={t.id} term={t} />
          ))}
        </div>
      </section>

      <Section title="Goals">
        <TextField
          label="What you're aiming for"
          placeholder="Grad school in math, a quant internship, a light senior spring…"
          value={p.goals ?? ""}
          onSave={(goals) =>
            apply((pl) =>
              updateProfile(pl, { goals: goals.trim() || undefined }),
            )
          }
        />
        <TextField
          label="Things to work around"
          placeholder="No classes before 10, working Fridays…"
          value={p.constraints ?? ""}
          onSave={(constraints) =>
            apply((pl) =>
              updateProfile(pl, {
                constraints: constraints.trim() || undefined,
              }),
            )
          }
        />
      </Section>
      <p className="mt-2 px-1 text-xs text-muted">
        The assistant reads these when it suggests classes.
      </p>

      <div className="mt-9 overflow-hidden rounded-xl border border-line">
        <button
          onClick={() => {
            if (confirm("Start over? This clears your plan on this device."))
              usePlanStore.getState().setPlan(null);
          }}
          className="flex min-h-12 w-full items-center px-4 text-left text-[15px] text-red-600 hover:bg-hover dark:text-red-400"
        >
          Start over
        </button>
      </div>
      <p className="mt-2 px-1 text-xs text-muted">
        Clears your profile and plan from this browser.
      </p>
    </div>
  );
}

function yearOptions(current: number) {
  const now = new Date();
  const first = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => first + i);
  return years.includes(current) ? years : [current, ...years].sort();
}

function Stat({
  label,
  value,
  of,
  href,
}: {
  label: string;
  value: number;
  of?: number;
  href?: string;
}) {
  const body = (
    <>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
        {value}
        {of !== undefined && (
          <span className="text-[15px] font-normal text-muted"> / {of}</span>
        )}
      </dd>
    </>
  );
  const cls = "rounded-xl border border-line px-4 py-3";
  return href ? (
    <Link href={href} className={`${cls} hover:bg-subtle`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 px-1 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        {title}
      </h2>
      <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-raised">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-1.5">
      <span className="text-[15px]">{label}</span>
      <div className="flex min-w-0 justify-end">{children}</div>
    </div>
  );
}

const fieldCls =
  "rounded-lg bg-transparent px-2 py-1.5 text-right text-[14px] text-ink-2 outline-none hover:bg-hover focus:bg-subtle focus:text-ink";

function NameInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const save = () => {
    if (draft !== null && draft.trim() !== value) onSave(draft);
    setDraft(null);
  };
  return (
    <input
      aria-label="Name"
      value={draft ?? value}
      placeholder="Add your name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      className={`w-56 max-w-full ${fieldCls}`}
    />
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer ${fieldCls}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block px-4 py-3">
      <span className="text-[15px]">{label}</span>
      <textarea
        value={draft ?? value}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== value) onSave(draft);
          setDraft(null);
        }}
        className="mt-1.5 block w-full resize-none rounded-lg bg-subtle px-3 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}

function Studies({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange: (s: Study[]) => void;
}) {
  const [adding, setAdding] = useState<Study["kind"] | null>(null);
  const studies = plan.profile.studies ?? [];
  const school = plan.profile.school;
  const add = (name: string, kind: Study["kind"]) => {
    if (!studies.some((s) => s.name === name && s.kind === kind))
      onChange([...studies, { name, kind, status: "potential" }]);
    setAdding(null);
  };

  return (
    <section className="mt-9">
      <h2 className="mb-3 px-1 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
        Majors and minors
      </h2>
      <div className="divide-y divide-line-soft rounded-xl border border-line bg-raised">
        {studies.length === 0 && (
          <p className="px-4 py-3.5 text-[14px] text-muted">
            Not sure yet. Add one whenever you like.
          </p>
        )}
        {studies.map((s, i) => {
          const tracked = !!trackedProgram(s.name, s.kind, school);
          return (
            <div
              key={`${s.kind}:${s.name}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">{s.name}</p>
                <p className="text-[13px] text-muted">
                  {s.kind === "major" ? "Major" : "Minor"}
                  {s.kind === "major" &&
                    (tracked
                      ? ", requirements tracked"
                      : ", requirement tracking coming later")}
                </p>
              </div>
              <Segmented
                label={`${s.name} status`}
                value={s.status}
                options={["declared", "potential"]}
                onChange={(status) =>
                  onChange(
                    studies.map((x, j) => (j === i ? { ...x, status } : x)),
                  )
                }
              />
              <button
                onClick={() => onChange(studies.filter((_, j) => j !== i))}
                aria-label={`Remove ${s.name}`}
                className="grid size-8 flex-none place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          );
        })}
        <div className="px-4 py-2.5">
          {adding ? (
            <StudyPicker
              kind={adding}
              school={school}
              exclude={studies
                .filter((s) => s.kind === adding)
                .map((s) => s.name)}
              onAdd={(name) => add(name, adding)}
              onDone={() => setAdding(null)}
            />
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setAdding("major")}
                className="min-h-8 rounded-lg px-2 text-[13px] text-muted hover:bg-hover hover:text-ink"
              >
                + Add major
              </button>
              <button
                onClick={() => setAdding("minor")}
                className="min-h-8 rounded-lg px-2 text-[13px] text-muted hover:bg-hover hover:text-ink"
              >
                + Add minor
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StudyPicker({
  kind,
  school,
  exclude,
  onAdd,
  onDone,
}: {
  kind: Study["kind"];
  school: School;
  exclude: string[];
  onAdd: (name: string) => void;
  onDone: () => void;
}) {
  const list = studyOptions(kind, school);
  return (
    <div onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <Picker
        id={`add-${kind}`}
        placeholder={
          kind === "major"
            ? "Type a major, like “cs” or “econ”"
            : "Type a minor, like “stats”"
        }
        search={(q) =>
          searchStudies(list, q)
            .filter((o) => !exclude.includes(o.name))
            .map((o) => ({
              key: o.name,
              title: o.name,
              subtitle: o.schools.join(", "),
            }))
        }
        onAdd={onAdd}
        onBulk={(text) => {
          text
            .split(/[,;\n]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((t) =>
              onAdd(searchStudies(list, t, 1)[0]?.name ?? normalizeName(t)),
            );
        }}
        onNoMatch={(text) => onAdd(normalizeName(text))}
        onDone={onDone}
      />
      <button
        onClick={onDone}
        className="mt-2 text-[13px] text-muted hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}

function TermRecord({ term }: { term: Term }) {
  const apply = usePlanStore((s) => s.apply);
  const flash = usePlanStore((s) => s.flash);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = termStatus(term);
  const isPre = term.id === "PRE";
  const pts = term.courses.reduce((s, c) => s + pointsOf(c), 0);
  if (!isPre && !term.courses.length && status !== "current") return null;

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2 px-1">
        <h3 className="text-[15px] font-medium">
          {isPre ? "Taken earlier / AP" : term.label}
        </h3>
        {status === "current" && (
          <span className="rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] font-medium text-accent-ink">
            In progress
          </span>
        )}
        <span className="ml-auto text-xs whitespace-nowrap text-muted tabular-nums">
          {term.courses.length}{" "}
          {term.courses.length === 1 ? "class" : "classes"}, {pts} pts
        </span>
        <button
          onClick={() => setAdding(true)}
          className="rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap text-muted hover:bg-hover hover:text-ink"
        >
          + Add
        </button>
      </div>
      {adding && (
        <div className="mb-2 max-w-sm">
          <CoursePicker
            onPick={(code) => {
              const res = apply((p) => addCourse(p, code, term.id));
              setError(res && !res.ok ? res.error : null);
              if (res?.ok) usePlanStore.getState().flashCourse(code);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
          />
        </div>
      )}
      {!term.courses.length && (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-line px-4 py-4 text-left text-[13px] text-muted hover:border-accent hover:text-ink"
        >
          {isPre
            ? "AP credit or classes from before Columbia. Click to add one."
            : "Nothing here yet. Click to add a class."}
        </button>
      )}
      {term.courses.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {term.courses.map((code) => {
            const c = COURSE_BY_CODE[code];
            return (
              <li
                key={code}
                className={`group relative overflow-hidden rounded-xl border bg-raised p-3 ${flash === code ? "anim-pop border-accent" : "border-line"}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1 ${toneFor(code)} bg-tone-ink opacity-70`}
                />
                <div className="flex items-baseline justify-between gap-2 pl-1">
                  <span className="text-[13px] font-semibold whitespace-nowrap">
                    {code}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {pointsOf(code)} pts
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 pl-1 text-[13px] leading-snug text-ink-2">
                  {c?.title ?? "Not in catalog"}
                </p>
                <button
                  onClick={() => apply((p) => removeCourse(p, code))}
                  aria-label={`Remove ${code}`}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-raised text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-2 px-1 text-[13px] text-warn-ink">{error}</p>}
    </div>
  );
}
