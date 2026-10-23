// The requirements engine: plain, deterministic code. The AI never decides
// whether a requirement is met — it reads the output of this file.

import { COURSE_BY_CODE, parseCode } from "@/data/courses";
import { PROGRAM_BY_ID } from "@/data/programs";
import type {
  CourseFilter,
  Plan,
  PlanReport,
  Program,
  ProgramResult,
  RequirementResult,
  Rule,
  Term,
  TermStatus,
  Warning,
} from "./types";

export const DEGREE_POINTS = 124;
export const HEAVY_TERM_POINTS = 18;
const DEFAULT_POINTS = 3;

// ---------- terms & time ----------

/** The academic term in progress on `now`, or null in summer. */
export function currentTerm(now = new Date()): { season: "Fall" | "Spring"; year: number } | null {
  const m = now.getMonth();
  if (m <= 4) return { season: "Spring", year: now.getFullYear() };
  if (m >= 8) return { season: "Fall", year: now.getFullYear() };
  return null;
}

function termKey(season: "Fall" | "Spring", year: number) {
  // Spring 2026 comes before Fall 2026
  return year * 2 + (season === "Fall" ? 1 : 0);
}

export function termStatus(term: Term, now = new Date()): TermStatus {
  if (term.id === "PRE" || !term.season || !term.year) return "credit";
  const k = termKey(term.season, term.year);
  const cur = currentTerm(now);
  if (cur) {
    const ck = termKey(cur.season, cur.year);
    return k < ck ? "past" : k === ck ? "current" : "future";
  }
  // summer: the upcoming fall is the next term
  const nextFall = termKey("Fall", now.getFullYear());
  return k < nextFall ? "past" : "future";
}

export function makeTerms(classYear: number): Term[] {
  const terms: Term[] = [{ id: "PRE", label: "AP / Transfer credit", courses: [] }];
  for (let i = 0; i < 4; i++) {
    const fall = classYear - 4 + i;
    terms.push({ id: `F${fall}`, season: "Fall", year: fall, label: `Fall ${fall}`, courses: [] });
    terms.push({ id: `S${fall + 1}`, season: "Spring", year: fall + 1, label: `Spring ${fall + 1}`, courses: [] });
  }
  return terms;
}

// ---------- course helpers ----------

export function pointsOf(code: string) {
  return COURSE_BY_CODE[code]?.points ?? DEFAULT_POINTS;
}

export function matchesFilter(code: string, f: CourseFilter): boolean {
  const course = COURSE_BY_CODE[code];
  const { dept, level } = course ?? parseCode(code);
  const tags = course?.tags ?? [];
  if (f.codes && !f.codes.includes(code)) return false;
  if (f.depts && !f.depts.includes(dept)) return false;
  if (f.minLevel !== undefined && level < f.minLevel) return false;
  if (f.maxLevel !== undefined && level > f.maxLevel) return false;
  if (f.tags && !f.tags.some((t) => tags.includes(t))) return false;
  if (f.exclude?.includes(code)) return false;
  if (f.excludeTags?.some((t) => tags.includes(t))) return false;
  return true;
}

// ---------- rule evaluation ----------

interface EvalResult {
  ok: boolean;
  have: number;
  need: number;
  unit: "courses" | "points" | "items";
  counted: string[];
}

interface Ctx {
  pool: string[]; // courses available to count, in plan order
  used: Set<string>; // already counted toward another requirement in this program
  manualDone: string[];
}

function evalRule(rule: Rule, ctx: Ctx): EvalResult {
  switch (rule.kind) {
    case "course": {
      const ok = ctx.pool.includes(rule.code) && !ctx.used.has(rule.code);
      if (ok) ctx.used.add(rule.code);
      return { ok, have: ok ? 1 : 0, need: 1, unit: "courses", counted: ok ? [rule.code] : [] };
    }
    case "manual": {
      const ok = ctx.manualDone.includes(rule.id);
      return { ok, have: ok ? 1 : 0, need: 1, unit: "items", counted: [] };
    }
    case "choose": {
      const picks = ctx.pool.filter((c) => !ctx.used.has(c) && matchesFilter(c, rule.from)).slice(0, rule.count);
      picks.forEach((c) => ctx.used.add(c));
      return { ok: picks.length >= rule.count, have: picks.length, need: rule.count, unit: "courses", counted: picks };
    }
    case "points": {
      const picks: string[] = [];
      let pts = 0;
      for (const c of ctx.pool) {
        if (pts >= rule.points) break;
        if (ctx.used.has(c) || !matchesFilter(c, rule.from)) continue;
        picks.push(c);
        pts += pointsOf(c);
      }
      picks.forEach((c) => ctx.used.add(c));
      return { ok: pts >= rule.points, have: Math.min(pts, rule.points), need: rule.points, unit: "points", counted: picks };
    }
    case "allOf": {
      const parts = rule.rules.map((r) => evalRule(r, ctx));
      return {
        ok: parts.every((p) => p.ok),
        have: parts.reduce((s, p) => s + p.have, 0),
        need: parts.reduce((s, p) => s + p.need, 0),
        unit: parts[0]?.unit ?? "courses",
        counted: parts.flatMap((p) => p.counted),
      };
    }
    case "anyOf": {
      // Try each option on a scratch copy, keep the best, then commit it.
      let best: { res: EvalResult; used: Set<string> } | null = null;
      for (const r of rule.rules) {
        const used = new Set(ctx.used);
        const res = evalRule(r, { ...ctx, used });
        const score = (x: EvalResult) => (x.ok ? 2 : 0) + x.have / x.need;
        if (!best || score(res) > score(best.res)) best = { res, used };
      }
      if (!best) return { ok: true, have: 0, need: 0, unit: "courses", counted: [] };
      best.used.forEach((c) => ctx.used.add(c));
      return best.res;
    }
  }
}

function firstManualId(rule: Rule): string | undefined {
  if (rule.kind === "manual") return rule.id;
  if (rule.kind === "allOf" || rule.kind === "anyOf") {
    for (const r of rule.rules) {
      const id = firstManualId(r);
      if (id) return id;
    }
  }
  return undefined;
}

export function evaluateProgram(program: Program, plan: Plan, now = new Date()): ProgramResult {
  const done: string[] = [];
  const all: string[] = [];
  for (const t of plan.terms) {
    const s = termStatus(t, now);
    for (const c of t.courses) {
      all.push(c);
      if (s === "credit" || s === "past") done.push(c);
    }
  }
  const doneCtx: Ctx = { pool: done, used: new Set(), manualDone: plan.manualDone };
  const allCtx: Ctx = { pool: all, used: new Set(), manualDone: plan.manualDone };

  const requirements: RequirementResult[] = program.requirements.map((req) => {
    const d = evalRule(req.rule, doneCtx);
    const a = evalRule(req.rule, allCtx);
    return {
      id: req.id,
      name: req.name,
      note: req.note,
      status: d.ok ? "done" : a.ok ? "planned" : "missing",
      manualId: firstManualId(req.rule),
      progress: { have: a.have, doneHave: d.have, need: a.need, unit: a.unit },
      counted: a.counted,
    };
  });

  return {
    id: program.id,
    name: program.name,
    type: program.type,
    sourceUrl: program.sourceUrl,
    requirements,
    total: requirements.length,
    done: requirements.filter((r) => r.status === "done").length,
    planned: requirements.filter((r) => r.status !== "missing").length,
  };
}

// ---------- plan-level checks ----------

export function checkWarnings(plan: Plan): Warning[] {
  const warnings: Warning[] = [];
  const seenAt = new Map<string, string>();
  const takenBefore = new Set<string>();

  // PRE (credit) is always first in plan.terms
  for (const term of plan.terms) {
    let pts = 0;
    for (const code of term.courses) {
      pts += pointsOf(code);
      const course = COURSE_BY_CODE[code];
      if (seenAt.has(code)) {
        warnings.push({ kind: "duplicate", termId: term.id, code, message: `${code} is also in ${seenAt.get(code)}.` });
      } else {
        seenAt.set(code, term.label);
      }
      if (!course) {
        warnings.push({ kind: "unknown", termId: term.id, code, message: `${code} isn't in our catalog yet, so prereqs can't be checked.` });
        continue;
      }
      if (term.id === "PRE") continue;
      for (const group of course.prereqs ?? []) {
        if (!group.some((p) => takenBefore.has(p))) {
          warnings.push({
            kind: "prereq",
            termId: term.id,
            code,
            message: `${code} needs ${group.join(" or ")} in an earlier semester.`,
          });
        }
      }
    }
    if (pts > HEAVY_TERM_POINTS) {
      warnings.push({ kind: "overload", termId: term.id, message: `${term.label} has ${pts} points (over ${HEAVY_TERM_POINTS}).` });
    }
    term.courses.forEach((c) => takenBefore.add(c));
  }
  return warnings;
}

export function analyzePlan(plan: Plan, now = new Date()): PlanReport {
  const programIds = ["cc-core", ...plan.profile.majors];
  const programs = programIds
    .map((id) => PROGRAM_BY_ID[id])
    .filter(Boolean)
    .map((p) => evaluateProgram(p, plan, now));

  let done = 0;
  let planned = 0;
  for (const t of plan.terms) {
    const s = termStatus(t, now);
    for (const c of t.courses) {
      const p = pointsOf(c);
      planned += p;
      if (s === "credit" || s === "past") done += p;
    }
  }

  return { programs, warnings: checkWarnings(plan), points: { done, planned, required: DEGREE_POINTS } };
}
