import { describe, expect, it } from "vitest";
import { buildCatalog } from "@/data/courses";
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
