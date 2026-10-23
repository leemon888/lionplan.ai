import type { Course } from "@/lib/types";
import comsCatalog from "./catalog/coms.json";
import csCognates from "./catalog/cs-cognates.json";
import overrides from "./catalog/overrides.json";
import { DOC_COURSES } from "./directory.generated";

// The course catalog is built from four layers, later ones winning:
//   1. hand-entered rows below (Core, Econ, Math, Stats that haven't been scraped yet)
//   2. the Directory of Classes in data/directory.generated.ts (npm run import:doc): every course offered
//      this year, which semesters, and Barnard. Adds courses; never replaces titles or prereqs.
//   3. scraped bulletin files in data/catalog/*.json (run scripts/scrape_bulletin.py)
//   4. hand fixes in data/catalog/overrides.json (survive re-scraping)
//
// Hand-entered rows are STARTER DATA: check them against bulletin.columbia.edu.
//
// Row format: [code, title, points, prereqs?, tags?]
// prereqs are AND-of-ORs: [["A","B"],["C"]] means (A or B) and C.

type Row = [string, string, number, string[][]?, string[]?];

const DS = ["COMS W3134", "COMS W3137"]; // data structures
const CALC3 = ["MATH UN1201", "MATH UN1205", "MATH UN1208"];
const ECON_INT = [["ECON UN3211"], ["ECON UN3213"]];

const rows: Row[] = [
  // ---- Core Curriculum ----
  ["HUMA CC1001", "Literature Humanities I", 4, undefined, ["core"]],
  ["HUMA CC1002", "Literature Humanities II", 4, undefined, ["core"]],
  ["COCI CC1101", "Contemporary Civilization I", 4, undefined, ["core"]],
  ["COCI CC1102", "Contemporary Civilization II", 4, undefined, ["core"]],
  ["HUMA UN1121", "Art Humanities", 3, undefined, ["core"]],
  ["HUMA UN1123", "Music Humanities", 3, undefined, ["core"]],
  ["ENGL CC1010", "University Writing", 3, undefined, ["core"]],
  ["SCNC CC1000", "Frontiers of Science", 4, undefined, ["core"]],

  // ---- Mathematics ----
  ["MATH UN1101", "Calculus I", 3],
  ["MATH UN1102", "Calculus II", 3, [["MATH UN1101"]]],
  ["MATH UN1201", "Calculus III", 3, [["MATH UN1101", "MATH UN1102"]]],
  ["MATH UN1202", "Calculus IV", 3, [["MATH UN1201", "MATH UN1205"]]],
  ["MATH UN1205", "Accelerated Multivariable Calculus", 4],
  ["MATH UN1207", "Honors Mathematics A", 4],
  ["MATH UN1208", "Honors Mathematics B", 4, [["MATH UN1207"]]],
  ["MATH UN2010", "Linear Algebra", 3],
  ["MATH UN2015", "Linear Algebra and Probability", 3],
  ["MATH UN2030", "Ordinary Differential Equations", 3],
  ["MATH UN2500", "Analysis and Optimization", 3],
  ["MATH UN3007", "Complex Variables", 3],
  ["MATH UN3020", "Number Theory and Cryptography", 3],
  ["MATH UN3025", "Making, Breaking Codes", 3],
  ["MATH UN3028", "Partial Differential Equations", 3],
  ["MATH UN3951", "Undergraduate Seminars I", 3, undefined, ["math-seminar"]],
  ["MATH UN3952", "Undergraduate Seminars II", 3, undefined, ["math-seminar"]],
  ["MATH GU4032", "Fourier Analysis", 3],
  ["MATH GU4041", "Introduction to Modern Algebra I", 3, [["MATH UN2010", "MATH UN1208"]]],
  ["MATH GU4042", "Introduction to Modern Algebra II", 3, [["MATH GU4041"]]],
  ["MATH GU4051", "Topology", 3],
  ["MATH GU4061", "Introduction to Modern Analysis I", 3, [["MATH UN1202", "MATH UN1205", "MATH UN1208"]]],
  ["MATH GU4062", "Introduction to Modern Analysis II", 3, [["MATH GU4061"]]],
  ["MATH GU4065", "Honors Complex Variables", 3],
  ["MATH GU4155", "Probability Theory", 3],

  // ---- Statistics / probability ----
  ["STAT UN1201", "Calculus-Based Introduction to Statistics", 3, [["MATH UN1101", "MATH UN1207"]]],
  ["STAT GU4001", "Introduction to Probability and Statistics", 3],
  ["STAT GU4204", "Statistical Inference", 3],
  ["IEOR E3658", "Probability for Engineers", 3],

  // ---- Economics ----
  ["ECON UN1105", "Principles of Economics", 4],
  ["ECON UN3211", "Intermediate Microeconomics", 4, [["ECON UN1105"], CALC3]],
  ["ECON UN3213", "Intermediate Macroeconomics", 4, [["ECON UN1105"], ["MATH UN1101", "MATH UN1102", "MATH UN1207"]]],
  ["ECON UN3412", "Introduction to Econometrics", 4, [["ECON UN3211", "ECON UN3213"], CALC3, ["STAT UN1201", "STAT GU4001", "STAT GU4204"]]],
  ["ECON UN2257", "The Global Economy", 3, [["ECON UN1105"]]],
  ["ECON UN2261", "Introduction to Accounting and Finance", 3, undefined, ["accounting"]],
  ["ECON UN3025", "Financial Economics", 3, ECON_INT],
  ["ECON UN3265", "Economics of Money and Banking", 3, ECON_INT],
  ["ECON GU4280", "Corporate Finance", 3, ECON_INT],
  ["ECON GU4321", "Economic Development", 3, ECON_INT],
  ["ECON GU4370", "Political Economy", 3, ECON_INT],
  ["ECON GU4400", "Labor Economics", 3, ECON_INT],
  ["ECON GU4413", "Econometrics of Time Series and Forecasting", 3, [...ECON_INT, ["ECON UN3412"]]],
  ["ECON GU4465", "Public Economics", 3, ECON_INT],
  ["ECON GU4500", "International Trade", 3, ECON_INT],
  ["ECON GU4615", "Law and Economics", 3, ECON_INT],
  ["ECON GU4710", "Finance and the Real Economy", 3, ECON_INT],
  ["ECON GU4911", "Senior Seminar: Microeconomics", 4, [...ECON_INT, ["ECON UN3412"]], ["econ-seminar"]],
  ["ECON GU4913", "Senior Seminar: Macroeconomics", 4, [...ECON_INT, ["ECON UN3412"]], ["econ-seminar"]],
  ["ECON GU4918", "Senior Seminar: Econometrics", 4, [...ECON_INT, ["ECON UN3412"]], ["econ-seminar"]],
  ["ECON GU4921", "Senior Seminar: Political Economy", 4, [...ECON_INT, ["ECON UN3412"], ["ECON GU4370"]], ["econ-seminar"]],

  // ---- Computer Science ----
  ["ENGI E1006", "Introduction to Computing for Engineers and Applied Scientists", 3],
  ["COMS W1004", "Introduction to Computer Science and Programming in Java", 3],
  ["COMS W1007", "Honors Introduction to Computer Science", 3],
  ["COMS W3134", "Data Structures in Java", 3, [["COMS W1004", "COMS W1007"]]],
  ["COMS W3137", "Honors Data Structures and Algorithms", 4, [["COMS W1004", "COMS W1007"]]],
  ["COMS W3157", "Advanced Programming", 4, [DS]],
  ["COMS W3203", "Discrete Mathematics", 4],
  ["COMS W3251", "Computational Linear Algebra", 4],
  ["COMS W3261", "Computer Science Theory", 3, [["COMS W3203"], DS]],
  ["CSEE W3827", "Fundamentals of Computer Systems", 3],
  ["COMS W4111", "Introduction to Databases", 3, [DS]],
  ["COMS W4113", "Fundamentals of Large-Scale Distributed Systems", 3, [["COMS W3157"]]],
  ["COMS W4115", "Programming Languages and Translators", 3, [DS]],
  ["COMS W4118", "Operating Systems I", 3, [["COMS W3157"], ["CSEE W3827"]]],
  ["COMS W4119", "Computer Networks", 3, [DS]],
  ["COMS W4152", "Engineering Software-as-a-Service", 3, [["COMS W3157"]]],
  ["COMS W4156", "Advanced Software Engineering", 3, [["COMS W3157"]]],
  ["COMS W4160", "Computer Graphics", 3, [DS]],
  ["COMS W4167", "Computer Animation", 3, [DS]],
  ["COMS W4170", "User Interface Design", 3, [DS]],
  ["COMS W4181", "Security I", 3, [["COMS W3157"]]],
  ["CSOR E4231", "Analysis of Algorithms I", 3, [DS, ["COMS W3203"]]],
  ["COMS W4236", "Introduction to Computational Complexity", 3, [["COMS W3261"]]],
  ["COMS W4701", "Artificial Intelligence", 3, [DS]],
  ["COMS W4705", "Natural Language Processing", 3, [DS]],
  ["COMS W4731", "Computer Vision I: First Principles", 3, [DS]],
  ["COMS W4733", "Computational Aspects of Robotics", 3, [DS]],
  ["CBMF W4761", "Computational Genomics", 3, [DS]],
  ["COMS W4771", "Machine Learning", 3, [DS]],
  ["CSEE W4824", "Computer Architecture", 3, [["CSEE W3827"]]],
  ["CSEE W4868", "System-on-Chip Platforms", 3, [["CSEE W3827"]]],
];

export function parseCode(code: string): { dept: string; level: number } {
  const [dept, num = ""] = code.split(" ");
  const digit = num.match(/\d/)?.[0];
  return { dept, level: digit ? Number(digit) * 1000 : 0 };
}

const HAND: Course[] = rows.map(([code, title, points, prereqs, tags]) => ({
  code,
  title,
  points,
  ...parseCode(code),
  ...(prereqs ? { prereqs } : {}),
  ...(tags ? { tags } : {}),
  origin: "hand",
}));

type Scraped = Omit<Course, "origin"> & { reviewReason?: string; source?: string };
const SCRAPED = [...(comsCatalog as Scraped[]), ...(csCognates as Scraped[])];
const OVERRIDES = (overrides as { courses: Record<string, Partial<Course>> }).courses;

// Sources sometimes write the same course with a different letter prefix (CSOR E4231 in the hand rows,
// CSOR W4231 in the Directory). numberKey drops the prefix so those can be matched, but only when exactly
// one course on each side has that subject + number: Barnard's BIOL BC3320 (Microbiology) and Columbia's
// BIOL UN3320 are different courses.
export const numberKey = (code: string) => code.replace(/ [A-Z]*(?=\d)/, " ");

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/** The existing entry for an incoming course: the exact code, else the only one with the same subject + number. */
function findSame(byCode: Map<string, Course>, code: string, incoming: Map<string, number>, from: (c: Course) => boolean) {
  const exact = byCode.get(code);
  if (exact) return exact;
  if (incoming.get(numberKey(code)) !== 1) return undefined;
  const same = [...byCode.values()].filter((c) => from(c) && numberKey(c.code) === numberKey(code));
  return same.length === 1 ? same[0] : undefined;
}

/** [code, title, points, seasons offered, barnard?] from scripts/import-doc.ts */
type DirectoryRow = [string, string, number, string, 1?];

/** Layer 2: courses offered this year. Marks when known courses run; adds the rest with the Directory's short titles. */
export function addDirectory(base: Course[], rows: DirectoryRow[]): Course[] {
  const byCode = new Map<string, Course>(base.map((c) => [c.code, c]));
  const incoming = countBy(rows, ([code]) => numberKey(code));
  for (const [code, title, points, offered, barnard] of rows) {
    const info = { offered, ...(barnard ? { barnard: true } : {}) };
    const prev = findSame(byCode, code, incoming, (c) => c.origin === "hand");
    if (prev) byCode.set(prev.code, { ...prev, ...info });
    else byCode.set(code, { code, title, points, ...parseCode(code), ...info, origin: "directory" });
  }
  return [...byCode.values()];
}

/** Layers 3 and 4 on top of `base` (hand rows, plus the Directory when it's been added). */
export function buildCatalog(base: Course[], scraped: Scraped[], fixes: Record<string, Partial<Course>>): Course[] {
  const byCode = new Map<string, Course>(base.map((c) => [c.code, c]));
  const incoming = countBy(scraped, (s) => numberKey(s.code));
  for (const s of scraped) {
    // A Directory-only course written with another prefix becomes the bulletin's code.
    const prev = findSame(byCode, s.code, incoming, (c) => c.origin === "directory");
    if (prev && prev.code !== s.code) byCode.delete(prev.code);
    byCode.set(s.code, {
      code: s.code,
      title: s.title || prev?.title || s.code,
      points: s.points || prev?.points || 3,
      dept: s.dept,
      level: s.level,
      description: s.description || prev?.description,
      prereqText: s.prereqText || undefined,
      coreqText: s.coreqText || undefined,
      // Bulletin prereqs win; fall back to hand ones if the scraper found none.
      prereqs: s.prereqs?.length ? s.prereqs : prev?.prereqs,
      tags: [...new Set([...(prev?.tags ?? []), ...(s.tags ?? [])])],
      needsReview: s.needsReview || undefined,
      // When it runs comes from the Directory; the bulletin doesn't say.
      ...(prev?.offered ? { offered: prev.offered } : {}),
      ...(prev?.barnard ? { barnard: true } : {}),
      origin: "bulletin",
    });
  }
  for (const [code, fix] of Object.entries(fixes)) {
    const prev = byCode.get(code);
    byCode.set(code, { ...(prev ?? { code, title: code, points: 3, ...parseCode(code) }), ...fix, code });
  }
  // Keep only prereq codes we actually know, so checks never point at a missing course.
  const known = new Set(byCode.keys());
  return [...byCode.values()].map((c) => {
    if (!c.prereqs) return c;
    const prereqs = c.prereqs.map((g) => g.filter((p) => known.has(p))).filter((g) => g.length);
    return { ...c, prereqs: prereqs.length ? prereqs : undefined };
  });
}

export const COURSES: Course[] = buildCatalog(addDirectory(HAND, DOC_COURSES), SCRAPED, OVERRIDES);

export const COURSE_BY_CODE: Record<string, Course> = Object.fromEntries(
  COURSES.map((c) => [c.code, c]),
);

/** Normalize user/AI input like "econ 1105", "ECON-UN1105", "econ un 1105" to a catalog code if possible. */
export function resolveCode(input: string): string | undefined {
  const raw = input.trim().toUpperCase();
  if (COURSE_BY_CODE[raw]) return raw;
  const m = raw.match(/^([A-Z]{4})[\s-]*([A-Z]{1,2})?\s*(\d{4})$/);
  if (!m) return undefined;
  const [, dept, prefix, num] = m;
  if (prefix) {
    const code = `${dept} ${prefix}${num}`;
    if (COURSE_BY_CODE[code]) return code;
  }
  const matches = COURSES.filter((c) => c.dept === dept && c.code.endsWith(num));
  return matches.length === 1 ? matches[0].code : undefined;
}
