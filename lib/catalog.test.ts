import { describe, expect, it } from "vitest";
import { addDirectory, buildCatalog } from "@/data/courses";
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
