import { describe, expect, it } from "vitest";
import { COURSES, resolveCode } from "@/data/courses";
import { PROGRAMS } from "@/data/programs";
import { analyzePlan, termStatus } from "./engine";
import { addCourse, emptyPlan, moveCourse, removeCourse, setManual, updateProfile } from "./plan-ops";
import type { Plan, Rule } from "./types";

// Oct 22, 2026: Fall 2026 is in progress
const NOW = new Date(2026, 9, 22);

function build(classYear: number, majors: string[], courses: Record<string, string[]>): Plan {
  let plan = emptyPlan({ school: "CC", classYear, majors });
  for (const [term, codes] of Object.entries(courses)) {
    for (const c of codes) {
      const r = addCourse(plan, c, term);
      if (!r.ok) throw new Error(r.error);
      plan = r.plan;
    }
  }
  return plan;
}

const req = (plan: Plan, programId: string, reqId: string) =>
  analyzePlan(plan, NOW).programs.find((p) => p.id === programId)!.requirements.find((r) => r.id === reqId)!;

describe("data integrity", () => {
  it("has unique course codes", () => {
    const codes = COURSES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("prereqs reference catalog courses", () => {
    const codes = new Set(COURSES.map((c) => c.code));
    for (const c of COURSES) for (const g of c.prereqs ?? []) for (const p of g) expect(codes, `${c.code} -> ${p}`).toContain(p);
  });

  it("explicit codes in requirement rules look like course codes", () => {
    const walk = (r: Rule): string[] =>
      r.kind === "course" ? [r.code]
      : r.kind === "allOf" || r.kind === "anyOf" ? r.rules.flatMap(walk)
      : r.kind === "choose" || r.kind === "points" ? (r.from.codes ?? [])
      : [];
    for (const p of PROGRAMS) for (const rq of p.requirements) for (const code of walk(rq.rule)) expect(code).toMatch(/^[A-Z]{4} [A-Z]{1,2}\d{4}$/);
  });
});

describe("terms", () => {
  it("classifies terms relative to today", () => {
    const plan = emptyPlan({ school: "CC", classYear: 2029, majors: [] });
    const status = Object.fromEntries(plan.terms.map((t) => [t.id, termStatus(t, NOW)]));
    expect(status).toMatchObject({ PRE: "credit", F2025: "past", S2026: "past", F2026: "current", S2027: "future" });
  });
});

describe("requirements", () => {
  it("separates done from planned", () => {
    const plan = build(2029, [], { F2025: ["HUMA CC1001"], S2026: ["HUMA CC1002"], F2026: ["COCI CC1101"], S2027: ["COCI CC1102"] });
    expect(req(plan, "cc-core", "lit-hum").status).toBe("done");
    expect(req(plan, "cc-core", "coci").status).toBe("planned");
    expect(req(plan, "cc-core", "art-hum").status).toBe("missing");
  });

  it("counts AP credit as done", () => {
    const plan = build(2029, ["cc-econ"], { PRE: ["MATH UN1101"] });
    expect(req(plan, "cc-econ", "calc1").status).toBe("done");
  });

  it("does not double count a course inside one program", () => {
    // ECON UN1105 is core; it must not also fill an elective slot
    const plan = build(2028, ["cc-econ"], { F2024: ["ECON UN1105"], S2025: ["ECON UN2257"] });
    const el = req(plan, "cc-econ", "electives");
    expect(el.counted).toEqual(["ECON UN2257"]);
    expect(el.progress).toMatchObject({ have: 1, need: 5 });
  });

  it("excludes seminars and accounting from econ electives", () => {
    const plan = build(2028, ["cc-econ"], { F2027: ["ECON GU4911", "ECON UN2261", "ECON GU4280"] });
    expect(req(plan, "cc-econ", "electives").counted).toEqual(["ECON GU4280"]);
    expect(req(plan, "cc-econ", "seminar").status).toBe("planned");
  });

  it("picks the best calculus sequence for math", () => {
    const plan = build(2029, ["cc-math"], { F2025: ["MATH UN1101"], S2026: ["MATH UN1102"], F2026: ["MATH UN1205"], S2027: ["MATH UN2010"] });
    const r = req(plan, "cc-math", "calc-seq");
    expect(r.status).toBe("planned");
    expect(r.counted).toEqual(["MATH UN1101", "MATH UN1102", "MATH UN1205", "MATH UN2010"]);
  });

  it("counts elective points", () => {
    const plan = build(2029, ["cc-math"], { S2027: ["MATH UN3020", "MATH UN3025", "MATH GU4051", "MATH GU4155"] });
    expect(req(plan, "cc-math", "electives")).toMatchObject({ status: "planned", progress: { have: 12, need: 12 } });
  });

  it("lets a course count for Core and a major at once", () => {
    const plan = build(2029, ["cc-cs", "cc-math"], { F2025: ["MATH UN1201"] });
    expect(req(plan, "cc-cs", "calc").status).toBe("done");
    expect(req(plan, "cc-math", "calc-seq").counted).toContain("MATH UN1201");
  });

  it("handles manual requirements", () => {
    let plan = build(2029, [], {});
    expect(req(plan, "cc-core", "swim").status).toBe("missing");
    plan = setManual(plan, "core-swim", true).plan;
    expect(req(plan, "cc-core", "swim")).toMatchObject({ status: "done", manualId: "core-swim" });
  });
});

describe("warnings", () => {
  it("flags missing prereqs and accepts earlier ones", () => {
    const bad = build(2029, [], { F2026: ["COMS W1004", "COMS W3134"] });
    expect(analyzePlan(bad, NOW).warnings.map((w) => w.kind)).toContain("prereq");
    const good = build(2029, [], { F2026: ["COMS W1004"], S2027: ["COMS W3134"] });
    expect(analyzePlan(good, NOW).warnings).toEqual([]);
  });

  it("flags heavy semesters", () => {
    const plan = build(2029, [], { F2026: ["ECON UN1105", "COMS W3157", "COMS W3203", "HUMA CC1001", "COCI CC1101"] });
    expect(analyzePlan(plan, NOW).warnings.some((w) => w.kind === "overload")).toBe(true);
  });
});

describe("plan ops", () => {
  it("resolves loose course codes", () => {
    expect(resolveCode("econ 1105")).toBe("ECON UN1105");
    expect(resolveCode("COMS-W3134")).toBe("COMS W3134");
    expect(resolveCode("nope 1234")).toBeUndefined();
  });

  it("rejects bad input with a useful error", () => {
    const plan = build(2029, [], { F2025: ["ECON UN1105"] });
    expect(addCourse(plan, "ECON UN1105", "S2026")).toMatchObject({ ok: false });
    expect(addCourse(plan, "FAKE UN0000", "S2026")).toMatchObject({ ok: false });
    expect(addCourse(plan, "MATH UN1101", "F2040")).toMatchObject({ ok: false });
  });

  it("moves and removes", () => {
    let plan = build(2029, [], { F2025: ["ECON UN1105"] });
    plan = moveCourse(plan, "ECON UN1105", "S2026").plan;
    expect(plan.terms.find((t) => t.id === "S2026")!.courses).toEqual(["ECON UN1105"]);
    plan = removeCourse(plan, "econ 1105").plan;
    expect(plan.terms.flatMap((t) => t.courses)).toEqual([]);
  });

  it("keeps courses when class year changes", () => {
    let plan = build(2029, [], { F2026: ["ECON UN1105"] });
    plan = updateProfile(plan, { classYear: 2030 }).plan;
    expect(plan.terms.find((t) => t.id === "F2026")!.courses).toEqual(["ECON UN1105"]);
    expect(plan.terms[1].id).toBe("F2026");
  });
});
