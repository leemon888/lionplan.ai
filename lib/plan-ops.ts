// Every way the plan can change goes through these pure functions.
// The UI (drag & drop, buttons) and the AI's tool calls both use them,
// so there is exactly one set of rules for editing a plan.

import { COURSE_BY_CODE, resolveCode } from "@/data/courses";
import { PROGRAM_BY_ID } from "@/data/programs";
import { makeTerms } from "./engine";
import type { Plan, Profile } from "./types";

export type OpResult = { ok: true; plan: Plan; message: string } | { ok: false; plan: Plan; error: string };

export function emptyPlan(profile: Profile): Plan {
  return { profile, terms: makeTerms(profile.classYear), manualDone: [] };
}

function findTerm(plan: Plan, termId: string) {
  const id = termId.trim().toUpperCase();
  return plan.terms.find((t) => t.id === id || t.label.toUpperCase() === id);
}

function locate(plan: Plan, code: string) {
  return plan.terms.find((t) => t.courses.includes(code));
}

export function addCourse(plan: Plan, rawCode: string, termId: string): OpResult {
  const code = resolveCode(rawCode);
  if (!code) return { ok: false, plan, error: `"${rawCode}" isn't in the catalog. Search for it first.` };
  const term = findTerm(plan, termId);
  if (!term) return { ok: false, plan, error: `Unknown term "${termId}". Valid: ${plan.terms.map((t) => t.id).join(", ")}.` };
  const existing = locate(plan, code);
  if (existing) return { ok: false, plan, error: `${code} is already in ${existing.label}. Use move instead.` };
  return {
    ok: true,
    message: `Added ${code} (${COURSE_BY_CODE[code].title}) to ${term.label}.`,
    plan: { ...plan, terms: plan.terms.map((t) => (t.id === term.id ? { ...t, courses: [...t.courses, code] } : t)) },
  };
}

export function removeCourse(plan: Plan, rawCode: string): OpResult {
  const code = resolveCode(rawCode) ?? rawCode.trim().toUpperCase();
  const term = locate(plan, code);
  if (!term) return { ok: false, plan, error: `${code} isn't in the plan.` };
  return {
    ok: true,
    message: `Removed ${code} from ${term.label}.`,
    plan: { ...plan, terms: plan.terms.map((t) => (t.id === term.id ? { ...t, courses: t.courses.filter((c) => c !== code) } : t)) },
  };
}

export function moveCourse(plan: Plan, rawCode: string, toTermId: string, index?: number): OpResult {
  const code = resolveCode(rawCode) ?? rawCode.trim().toUpperCase();
  const from = locate(plan, code);
  if (!from) return { ok: false, plan, error: `${code} isn't in the plan.` };
  const to = findTerm(plan, toTermId);
  if (!to) return { ok: false, plan, error: `Unknown term "${toTermId}".` };
  const terms = plan.terms.map((t) => ({ ...t, courses: t.courses.filter((c) => c !== code) }));
  const target = terms.find((t) => t.id === to.id)!;
  const i = index === undefined ? target.courses.length : Math.max(0, Math.min(index, target.courses.length));
  target.courses.splice(i, 0, code);
  return { ok: true, message: `Moved ${code} to ${to.label}.`, plan: { ...plan, terms } };
}

export function setManual(plan: Plan, id: string, done: boolean): OpResult {
  const manualDone = done ? [...new Set([...plan.manualDone, id])] : plan.manualDone.filter((m) => m !== id);
  return { ok: true, message: `${done ? "Checked off" : "Unchecked"} ${id}.`, plan: { ...plan, manualDone } };
}

export function updateProfile(plan: Plan, patch: Partial<Profile>): OpResult {
  if (patch.majors) {
    const bad = patch.majors.filter((m) => !PROGRAM_BY_ID[m]);
    if (bad.length) return { ok: false, plan, error: `Unknown major id(s): ${bad.join(", ")}.` };
  }
  const profile = { ...plan.profile, ...patch };
  let terms = plan.terms;
  if (patch.classYear && patch.classYear !== plan.profile.classYear) {
    // Rebuild the 8 semesters, keeping courses in terms that still exist.
    const old = new Map(plan.terms.map((t) => [t.id, t.courses]));
    terms = makeTerms(patch.classYear).map((t) => ({ ...t, courses: old.get(t.id) ?? [] }));
  }
  return { ok: true, message: "Profile updated.", plan: { ...plan, profile, terms } };
}
