import { describe, expect, it } from "vitest";
import { addDirectory, buildCatalog, withAiPrereqs } from "@/data/courses";
import { checkWarnings } from "./engine";
import { emptyPlan } from "./plan-ops";
import type { Course } from "./types";

const hand: Course[] = [
  { code: "COMS W3134", title: "Data Structures", points: 3, dept: "COMS", level: 3000, prereqs: [["COMS W1004"]], tags: ["x"], origin: "hand" },
  { code: "COMS W1004", title: "Intro", points: 3, dept: "COMS", level: 1000, origin: "hand" },
  { code: "MATH UN1101", title: "Calculus I", points: 3, dept: "MATH", level: 1000, origin: "hand" },
];

const scraped = [
  {
    code: "COMS W3134",
    title: "Data Structures in Java",
    points: 3,
    dept: "COMS",
    level: 3000,
    description: "Arrays and trees.",
    prereqText: "(COMS W1004) or (COMS W1007)",
    prereqs: [["COMS W1004", "COMS W1007"]],
    tags: ["science_req"],
    needsReview: false,
  },
  { code: "COMS W4771", title: "Machine Learning", points: 3, dept: "COMS", level: 4000, prereqs: [["COMS W3134"], ["NOPE X9999"]], needsReview: true },
];

describe("catalog layers", () => {
  const cat = Object.fromEntries(buildCatalog(hand, scraped, { "COMS W4771": { reviewed: true, needsReview: false } }).map((c) => [c.code, c]));

  it("lets bulletin data replace hand data", () => {
    expect(cat["COMS W3134"]).toMatchObject({ title: "Data Structures in Java", description: "Arrays and trees.", origin: "bulletin" });
  });

  it("keeps hand tags and adds scraped ones", () => {
    expect(cat["COMS W3134"].tags).toEqual(["x", "science_req"]);
  });

  it("keeps hand-only courses", () => {
    expect(cat["MATH UN1101"]).toMatchObject({ origin: "hand" });
  });

  it("drops prereq codes that aren't in the catalog", () => {
    // COMS W1007 isn't in this tiny catalog, NOPE X9999 doesn't exist
    expect(cat["COMS W3134"].prereqs).toEqual([["COMS W1004"]]);
    expect(cat["COMS W4771"].prereqs).toEqual([["COMS W3134"]]);
  });

  it("applies overrides last", () => {
    expect(cat["COMS W4771"]).toMatchObject({ reviewed: true, needsReview: false });
  });
});

describe("directory layer", () => {
  const directory: [string, string, number, string, 1?][] = [
    ["COMS W3134", "Data Structures in Java", 3, "FS"],
    ["CSOR W4231", "Analysis of Algorithms I", 3, "F"],
    ["COMS W4111", "Introduction to Databa", 3, "S"],
    ["BIOL BC3320", "Microbiology", 3, "S", 1],
    ["BIOL UN3320", "Reg of Survival Behaviors", 3, "F"],
  ];
  const withHand: Course[] = [...hand, { code: "CSOR E4231", title: "Analysis of Algorithms I", points: 3, dept: "CSOR", level: 4000, origin: "hand" }];
  const base = addDirectory(withHand, directory);
  const byCode = Object.fromEntries(base.map((c) => [c.code, c]));

  it("marks when hand courses run without replacing them", () => {
    expect(byCode["COMS W3134"]).toMatchObject({ title: "Data Structures", prereqs: [["COMS W1004"]], offered: "FS", origin: "hand" });
  });

  it("adds courses only the directory has", () => {
    expect(byCode["COMS W4111"]).toMatchObject({ title: "Introduction to Databa", offered: "S", origin: "directory", level: 4000 });
  });

  it("matches a hand code written with another prefix instead of duplicating it", () => {
    expect(byCode["CSOR E4231"]).toMatchObject({ offered: "F", origin: "hand" });
    expect(byCode["CSOR W4231"]).toBeUndefined();
  });

  it("keeps Barnard and Columbia courses that share a number apart", () => {
    expect(byCode["BIOL BC3320"]).toMatchObject({ title: "Microbiology", barnard: true });
    expect(byCode["BIOL UN3320"]).toMatchObject({ title: "Reg of Survival Behaviors" });
    expect(byCode["BIOL UN3320"].barnard).toBeUndefined();
  });

  it("lets the bulletin replace a directory course but keeps when it runs", () => {
    const cat = buildCatalog(base, [{ code: "COMS W4111", title: "Introduction to Databases", points: 3, dept: "COMS", level: 4000, description: "SQL." }], {});
    const c = cat.find((x) => x.code === "COMS W4111");
    expect(c).toMatchObject({ title: "Introduction to Databases", description: "SQL.", offered: "S", origin: "bulletin" });
  });

  it("uses the bulletin's code when it writes a directory course with another prefix", () => {
    const cat = buildCatalog(addDirectory([], [["COMS E4999", "Topics", 3, "S"]]), [{ code: "COMS W4999", title: "Special Topics", points: 3, dept: "COMS", level: 4000 }], {});
    expect(cat.map((c) => c.code)).toEqual(["COMS W4999"]);
    expect(cat[0]).toMatchObject({ title: "Special Topics", offered: "S" });
  });
});

describe("AI prerequisites", () => {
  const scrapedRows = [
    { code: "COMS W4118", title: "Operating Systems I", points: 3, dept: "COMS", level: 4000, prereqText: "(CSEE W3827) and knowledge of C, or the instructor's permission", prereqs: [["CSEE W3827"]], needsReview: true },
    { code: "COMS W3157", title: "Advanced Programming", points: 4, dept: "COMS", level: 3000, prereqs: [["COMS W3134"]], needsReview: false },
  ];
  const ai = {
    "COMS W4118": { prereqs: [["CSEE W3827"], ["COMS W3157"]], coreqs: [], conditions: ["instructor's permission"], confidence: "medium" as const },
    "COMS W3157": { prereqs: [["NOPE"]], coreqs: [], conditions: [], confidence: "low" as const },
  };
  const merged = Object.fromEntries(withAiPrereqs(scrapedRows, ai).map((c) => [c.code, c]));

  it("fills in flagged courses and marks them as AI-read", () => {
    expect(merged["COMS W4118"]).toMatchObject({ prereqs: [["CSEE W3827"], ["COMS W3157"]], conditions: ["instructor's permission"], prereqSource: "ai" });
  });

  it("leaves cleanly parsed courses alone", () => {
    expect(merged["COMS W3157"]).toMatchObject({ prereqs: [["COMS W3134"]], prereqSource: "bulletin" });
  });

  it("lets a checked override replace AI rules", () => {
    const base: Course[] = ["CSEE W3827", "COMS W3157", "COMS W3134", "COMS W4118"].map((code) => ({ code, title: code, points: 3, dept: "COMS", level: 3000 }));
    const cat = Object.fromEntries(
      buildCatalog(base, withAiPrereqs(scrapedRows, ai), { "COMS W4118": { prereqs: [["CSEE W3827"]], reviewed: true } }).map((c) => [c.code, c]),
    );
    expect(cat["COMS W4118"]).toMatchObject({ prereqs: [["CSEE W3827"]], prereqSource: "checked" });
    expect(cat["COMS W4118"].needsReview).toBeFalsy();
  });
});

describe("corequisites and AI labels in warnings", () => {
  const catalog: Record<string, Course> = {
    "COMS W3203": { code: "COMS W3203", title: "Discrete", points: 4, dept: "COMS", level: 3000 },
    "COMS W3134": { code: "COMS W3134", title: "DS", points: 3, dept: "COMS", level: 3000 },
    "COMS W3261": { code: "COMS W3261", title: "Theory", points: 3, dept: "COMS", level: 3000, prereqs: [["COMS W3203"]], coreqs: [["COMS W3134"]], prereqSource: "ai" },
  };
  const plan = (terms: Record<string, string[]>) => {
    const p = emptyPlan({ school: "CC", classYear: 2029, majors: [] });
    return { ...p, terms: p.terms.map((t) => ({ ...t, courses: terms[t.id] ?? [] })) };
  };

  it("accepts a corequisite in the same semester", () => {
    const w = checkWarnings(plan({ F2025: ["COMS W3203"], S2026: ["COMS W3261", "COMS W3134"] }), catalog);
    expect(w).toEqual([]);
  });

  it("flags a missing corequisite and says when rules are AI-read", () => {
    const w = checkWarnings(plan({ S2026: ["COMS W3261"] }), catalog);
    expect(w.map((x) => x.kind).sort()).toEqual(["coreq", "prereq"]);
    expect(w.every((x) => x.message.includes("not checked yet"))).toBe(true);
  });
});
