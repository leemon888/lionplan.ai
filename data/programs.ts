import type { Program, Rule } from "@/lib/types";

// Hand-encoded requirements. Order matters: within a program each course counts once,
// and requirements are filled top to bottom, so put specific requirements before
// catch-all electives.
//
// Every program must be re-checked against its sourceUrl before launch.

const course = (code: string): Rule => ({ kind: "course", code });
const allOf = (...codes: string[]): Rule => ({ kind: "allOf", rules: codes.map(course) });
const oneOf = (...codes: string[]): Rule => ({ kind: "choose", count: 1, from: { codes } });

export const CC_CORE: Program = {
  id: "cc-core",
  name: "Core Curriculum",
  school: "CC",
  type: "core",
  sourceUrl: "https://bulletin.columbia.edu/columbia-college/requirements-degree-bachelor-arts/",
  requirements: [
    { id: "lit-hum", name: "Literature Humanities", rule: allOf("HUMA CC1001", "HUMA CC1002"), note: "First year." },
    { id: "uwriting", name: "University Writing", rule: course("ENGL CC1010"), note: "First year." },
    { id: "frontiers", name: "Frontiers of Science", rule: course("SCNC CC1000"), note: "First year." },
    { id: "coci", name: "Contemporary Civilization", rule: allOf("COCI CC1101", "COCI CC1102"), note: "Sophomore year." },
    { id: "art-hum", name: "Art Humanities", rule: course("HUMA UN1121"), note: "Ideally by end of junior year." },
    { id: "music-hum", name: "Music Humanities", rule: course("HUMA UN1123"), note: "Ideally by end of junior year." },
    { id: "science", name: "Science Requirement", rule: { kind: "manual", id: "core-science" }, note: "Two courses from the approved Science list (in addition to Frontiers)." },
    { id: "global", name: "Global Core", rule: { kind: "manual", id: "core-global" }, note: "Two courses from the approved Global Core list." },
    { id: "language", name: "Foreign Language", rule: { kind: "manual", id: "core-language" }, note: "Through Intermediate II, or exempt by exam." },
    { id: "pe", name: "Physical Education", rule: { kind: "manual", id: "core-pe" }, note: "Two PE courses (pass/withdraw)." },
    { id: "swim", name: "Swim Test", rule: { kind: "manual", id: "core-swim" } },
  ],
};

export const CC_ECON: Program = {
  id: "cc-econ",
  name: "Economics",
  school: "CC",
  type: "major",
  sourceUrl: "https://econ.columbia.edu/wp-content/uploads/sites/18/2026/02/Econ-Major-2026.pdf",
  requirements: [
    { id: "calc1", name: "Calculus I or II", rule: oneOf("MATH UN1101", "MATH UN1102", "MATH UN1207"), note: "Honors Math A/B can replace Calc I and III." },
    { id: "calc3", name: "Calculus III", rule: oneOf("MATH UN1201", "MATH UN1205", "MATH UN1208") },
    { id: "stats", name: "Statistics", rule: oneOf("STAT UN1201", "STAT GU4204", "STAT GU4001") },
    { id: "core", name: "Economics Core", rule: allOf("ECON UN1105", "ECON UN3211", "ECON UN3213", "ECON UN3412"), note: "Finish at least one semester before graduating. C- or better." },
    { id: "seminar", name: "Senior Seminar", rule: { kind: "choose", count: 1, from: { tags: ["econ-seminar"] } }, note: "Requires UN3211, UN3213 and UN3412." },
    {
      id: "electives",
      name: "Economics Electives",
      rule: { kind: "choose", count: 5, from: { depts: ["ECON"], minLevel: 2000, excludeTags: ["econ-seminar", "accounting"] } },
      note: "Five ECON electives, at most one at the 2000 level. 3000+ electives need UN3211 and UN3213.",
    },
  ],
};

export const CC_MATH: Program = {
  id: "cc-math",
  name: "Mathematics",
  school: "CC",
  type: "major",
  sourceUrl: "https://www.math.columbia.edu/department/website/wp-content/uploads/2025/10/Mathreq-1.pdf",
  requirements: [
    {
      id: "calc-seq",
      name: "Calculus & Linear Algebra",
      rule: {
        kind: "anyOf",
        rules: [
          allOf("MATH UN1101", "MATH UN1102", "MATH UN1201", "MATH UN1202", "MATH UN2010"),
          allOf("MATH UN1101", "MATH UN1102", "MATH UN1205", "MATH UN2010"),
          allOf("MATH UN1101", "MATH UN1102", "MATH UN1207", "MATH UN1208"),
        ],
      },
      note: "One of three sequences. AP credit counts.",
    },
    { id: "algebra", name: "Modern Algebra I & II", rule: allOf("MATH GU4041", "MATH GU4042") },
    {
      id: "analysis",
      name: "Modern Analysis (or substitutes)",
      rule: { kind: "choose", count: 2, from: { codes: ["MATH GU4061", "MATH GU4062", "MATH UN2500", "MATH UN3007", "MATH UN3028", "MATH GU4032"] } },
      note: "GU4061/4062. Students not heading to math grad school may substitute UN2500, UN3007, UN3028 or 4032.",
    },
    { id: "seminar", name: "Undergraduate Seminar", rule: { kind: "choose", count: 1, from: { tags: ["math-seminar"] } } },
    {
      id: "electives",
      name: "Electives",
      rule: { kind: "points", points: 12, from: { depts: ["MATH"], minLevel: 2000 } },
      note: "12 points of MATH 2000+. Up to 6 points of approved cognates with DUS approval.",
    },
  ],
};

export const CC_CS: Program = {
  id: "cc-cs",
  name: "Computer Science",
  school: "CC",
  type: "major",
  sourceUrl: "https://bulletin.columbia.edu/columbia-college/departments-instruction/computer-science/",
  requirements: [
    { id: "intro", name: "Intro to CS", rule: oneOf("COMS W1004", "COMS W1007") },
    { id: "ds", name: "Data Structures", rule: oneOf("COMS W3134", "COMS W3137"), note: "COMS W3136 does not count." },
    { id: "core", name: "CS Core", rule: allOf("COMS W3157", "COMS W3203", "COMS W3261", "CSEE W3827") },
    { id: "calc", name: "Calculus", rule: oneOf("MATH UN1201", "MATH UN1205", "APMA E2000") },
    { id: "linalg", name: "Linear Algebra", rule: oneOf("COMS W3251", "MATH UN2010", "MATH UN2015", "MATH UN2020", "APMA E2101", "APMA E3101"), note: "COMS W3251 recommended." },
    { id: "prob", name: "Probability / Statistics", rule: oneOf("STAT UN1201", "IEOR E3658", "STAT GU4001", "MATH UN2015"), note: "MATH UN2015 can cover both linear algebra and probability." },
    {
      id: "afc",
      name: "Area Foundation Courses",
      rule: {
        kind: "choose",
        count: 3,
        from: {
          codes: [
            "COMS W4111", "COMS W4113", "COMS W4115", "COMS W4118", "COMS W4119", "COMS W4152", "COMS W4156",
            "COMS W4160", "COMS W4167", "COMS W4170", "COMS W4181", "CSOR E4231", "COMS W4236", "COMS W4701",
            "COMS W4705", "COMS W4731", "COMS W4733", "CBMF W4761", "COMS W4771", "CSEE W4824", "CSEE W4868",
          ],
        },
      },
    },
    {
      id: "electives",
      name: "CS Electives",
      rule: { kind: "choose", count: 3, from: { depts: ["COMS", "CSEE", "CSOR", "CBMF"], minLevel: 3000 } },
      note: "Three 3000+ CS courses, 3+ points each. Max 6 points of project courses.",
    },
  ],
};

export const PROGRAMS: Program[] = [CC_CORE, CC_ECON, CC_MATH, CC_CS];
export const PROGRAM_BY_ID: Record<string, Program> = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
export const MAJORS = PROGRAMS.filter((p) => p.type === "major");
