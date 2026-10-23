import { COURSES } from "@/data/courses";
import { PROGRAM_BY_ID } from "@/data/programs";
import { matchesFilter } from "./engine";
import type { Course, Rule } from "./types";

/** Every catalog course that could count toward a rule. */
export function coursesForRule(rule: Rule): Course[] {
  switch (rule.kind) {
    case "course":
      return COURSES.filter((c) => c.code === rule.code);
    case "choose":
    case "points":
      return COURSES.filter((c) => matchesFilter(c.code, rule.from));
    case "allOf":
    case "anyOf": {
      const seen = new Set<string>();
      return rule.rules.flatMap(coursesForRule).filter((c) => !seen.has(c.code) && seen.add(c.code));
    }
    case "manual":
      return [];
  }
}

/** "cc-econ/electives" -> courses that count toward it */
export function coursesForRequirement(key: string): Course[] {
  const [programId, reqId] = key.split("/");
  const req = PROGRAM_BY_ID[programId]?.requirements.find((r) => r.id === reqId);
  return req ? coursesForRule(req.rule) : [];
}

export function searchCourses(opts: { query?: string; dept?: string; requirement?: string; limit?: number }): Course[] {
  let list = opts.requirement ? coursesForRequirement(opts.requirement) : COURSES;
  if (opts.dept) list = list.filter((c) => c.dept === opts.dept!.toUpperCase());
  const q = opts.query?.trim().toLowerCase();
  if (q) {
    const words = q.split(/\s+/);
    const compact = q.replace(/[\s-]/g, "");
    list = list.filter((c) => {
      const hay = `${c.code} ${c.title}`.toLowerCase();
      return hay.replace(/\s/g, "").includes(compact) || words.every((w) => hay.includes(w));
    });
  }
  return list.slice(0, opts.limit ?? 20);
}
