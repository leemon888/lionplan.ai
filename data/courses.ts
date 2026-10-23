import type { Course } from "@/lib/types";
import { DOC_COURSES } from "./directory.generated";

// Starter catalog for CC Core + Econ, Math, CS.
// STARTER DATA: titles, points and prereqs are hand-entered and must be checked
// against bulletin.columbia.edu before launch. Prereqs only list what we're sure of.
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

// Everything else offered this year, imported from the Directory of Classes (npm run import:doc).
// Hand-entered rows above win: they carry checked titles, prereqs and tags.
// A few hand-entered codes use a different letter prefix than the Directory (CSOR E4231 vs CSOR W4231).
// Match the exact code first, then subject + number when only one Directory course has it
// (BC3320 Microbiology and UN3320 are different courses, so a shared number isn't enough).
const DOC = new Map(DOC_COURSES.map((r) => [r[0], r]));
const numberKey = (code: string) => code.replace(/ [A-Z]*(?=\d)/, " ");
const byNumber = new Map<string, string[]>();
for (const [code] of DOC_COURSES) byNumber.set(numberKey(code), [...(byNumber.get(numberKey(code)) ?? []), code]);
const docMatch = (code: string) => DOC.get(code) ?? (byNumber.get(numberKey(code))?.length === 1 ? DOC.get(byNumber.get(numberKey(code))![0]) : undefined);
const HAND_MATCHES = new Set(rows.map((r) => docMatch(r[0])?.[0]).filter(Boolean));
const offeredInfo = (code: string) => {
  const d = docMatch(code);
  return d ? { offered: d[3], ...(d[4] ? { barnard: true } : {}) } : {};
};

export const COURSES: Course[] = [
  ...rows.map(([code, title, points, prereqs, tags]) => ({
    code,
    title,
    points,
    ...parseCode(code),
    ...(prereqs ? { prereqs } : {}),
    ...(tags ? { tags } : {}),
    ...offeredInfo(code),
  })),
  ...DOC_COURSES.filter(([code]) => !HAND_MATCHES.has(code)).map(([code, title, points]) => ({
    code,
    title,
    points,
    ...parseCode(code),
    ...offeredInfo(code),
  })),
];

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
