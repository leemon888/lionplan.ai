// Turns free-text onboarding answers ("cc", "soph", "math and cs", "calc 1, lit hum")
// into structured profile data. Deterministic, so onboarding works without the AI;
// the AI later cleans up anything this misses.

import { COURSE_BY_CODE, resolveCode } from "@/data/courses";
import type { School } from "./types";

export function normalizeName(v: string) {
  return v.trim().toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export const SCHOOL_LABEL: Record<School, string> = {
  CC: "Columbia College",
  SEAS: "Columbia Engineering (SEAS)",
  Barnard: "Barnard College",
  GS: "School of General Studies",
  Other: "Another school",
};

export function normalizeSchool(v: string): School | null {
  const t = v.toLowerCase();
  if (!t.trim()) return null;
  if (/barn/.test(t)) return "Barnard";
  if (/seas|eng/.test(t)) return "SEAS";
  if (/\bgs\b|general/.test(t)) return "GS";
  if (/\bcc\b|coll|colum/.test(t)) return "CC";
  return "Other";
}

/** Graduation year from "2029", "'29", "class of 29" or "sophomore". */
export function normalizeGrad(v: string, now = new Date()): number | null {
  const t = v.toLowerCase();
  const full = t.match(/20\d\d/);
  if (full) return Number(full[0]);
  const short = t.match(/'?(\d\d)\b/);
  if (short) return 2000 + Number(short[1]);
  // The academic year ends in spring: Oct 2026 is the 2026-27 year, seniors graduate 2027.
  const end = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  if (/senior|4th|fourth/.test(t)) return end;
  if (/junior|3rd|third/.test(t)) return end + 1;
  if (/soph|2nd|second/.test(t)) return end + 2;
  if (/fresh|first|1st/.test(t)) return end + 3;
  return null;
}

const MAJOR_WORDS: [RegExp, string, string | null][] = [
  [/\bcs\b|comp\s*sci|computer/, "Computer Science", "cc-cs"],
  [/math/, "Mathematics", "cc-math"],
  [/econ/, "Economics", "cc-econ"],
  [/stat/, "Statistics", null],
  [/poli|political/, "Political Science", null],
  [/physic/, "Physics", null],
  [/philos/, "Philosophy", null],
  [/bio/, "Biology", null],
  [/chem/, "Chemistry", null],
  [/history/, "History", null],
  [/english|lit\b/, "English", null],
  [/neuro/, "Neuroscience", null],
  [/psych/, "Psychology", null],
];

/** "math and cs" -> label "Mathematics and Computer Science", trackable ids ["cc-math","cc-cs"]. */
export function normalizeMajors(v: string): { label: string; ids: string[] } {
  const t = v.toLowerCase();
  if (/not sure|undecided|idk|no idea|undeclared/.test(t)) return { label: "Undecided", ids: [] };
  // keep the order the student typed them in
  const hits = MAJOR_WORDS.filter(([re]) => re.test(t)).sort((a, b) => t.search(a[0]) - t.search(b[0]));
  if (!hits.length) return { label: v.trim(), ids: [] };
  return {
    label: hits.map((h) => h[1]).join(" and "),
    ids: hits.map((h) => h[2]).filter((x): x is string => !!x),
  };
}

// Nicknames students actually use, mapped to catalog codes.
const NICKNAMES: [RegExp, string][] = [
  [/\bcalc(ulus)?\s*(1|i|one)\b/, "MATH UN1101"],
  [/\bcalc(ulus)?\s*(2|ii|two)\b/, "MATH UN1102"],
  [/\bcalc(ulus)?\s*(3|iii|three)\b/, "MATH UN1201"],
  [/\bcalc(ulus)?\s*(4|iv|four)\b/, "MATH UN1202"],
  [/accel.*multi/, "MATH UN1205"],
  [/honors\s*math\s*a\b/, "MATH UN1207"],
  [/honors\s*math\s*b\b/, "MATH UN1208"],
  [/lin(ear)?\s*alg/, "MATH UN2010"],
  [/\bode\b|ordinary\s*diff/, "MATH UN2030"],
  [/modern\s*alg(ebra)?\s*(2|ii)/, "MATH GU4042"],
  [/modern\s*alg(ebra)?/, "MATH GU4041"],
  [/(modern\s*)?analysis\s*(2|ii)/, "MATH GU4062"],
  [/modern\s*analysis|real\s*analysis/, "MATH GU4061"],
  [/number\s*theory/, "MATH UN3020"],
  [/lit\s*hum\s*(2|ii)/, "HUMA CC1002"],
  [/lit\s*hum/, "HUMA CC1001"],
  [/\bcc\s*(2|ii)\b|contemp\w*\s*civ\w*\s*(2|ii)/, "COCI CC1102"],
  [/\bcc\s*(1|i)?\b|contemp\w*\s*civ/, "COCI CC1101"],
  [/\buw\b|univ\w*\s*writ/, "ENGL CC1010"],
  [/fro(ntiers|sci)/, "SCNC CC1000"],
  [/art\s*hum/, "HUMA UN1121"],
  [/music\s*hum|mus\s*hum/, "HUMA UN1123"],
  [/honors\s*data\s*str/, "COMS W3137"],
  [/data\s*str/, "COMS W3134"],
  [/intro\w*\s*(to\s*)?(cs|comp\w*|java|programming)/, "COMS W1004"],
  [/discrete/, "COMS W3203"],
  [/adv\w*\s*prog/, "COMS W3157"],
  [/cs\s*theory|computer\s*science\s*theory/, "COMS W3261"],
  [/fund\w*\s*(of\s*)?comp\w*\s*sys|\bfcs\b/, "CSEE W3827"],
  [/comp\w*\s*lin\w*\s*alg/, "COMS W3251"],
  [/\bml\b|machine\s*learning/, "COMS W4771"],
  [/\bai\b|artificial\s*intel/, "COMS W4701"],
  [/\bos\b|operating\s*sys/, "COMS W4118"],
  [/databases?/, "COMS W4111"],
  [/\bnlp\b|natural\s*lang/, "COMS W4705"],
  [/(intro|principles)\s*(of\s*|to\s*)?econ|econ\s*principles/, "ECON UN1105"],
  [/inter\w*\s*micro/, "ECON UN3211"],
  [/inter\w*\s*macro/, "ECON UN3213"],
  [/econometrics/, "ECON UN3412"],
  [/(intro\w*\s*)?stat(s|istics)?$|intro\w*\s*stat/, "STAT UN1201"],
];

export interface ParsedClasses {
  matched: string[]; // catalog codes, in the order typed
  unmatched: string[]; // pieces we couldn't place; the AI gets these
}

/** Splits free text into pieces and matches each to a catalog course. */
export function parseClasses(text: string): ParsedClasses {
  const pieces = text
    .split(/[,;\n]+|\s+and\s+|\s*&\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const piece of pieces) {
    const low = piece.toLowerCase();
    let code: string | undefined;
    const codeLike = piece.match(/[a-z]{4}[\s-]*[a-z]{0,2}\s*\d{4}/i);
    if (codeLike) code = resolveCode(codeLike[0].replace(/\s+/g, " "));
    if (!code) code = NICKNAMES.find(([re]) => re.test(low))?.[1];
    if (code && COURSE_BY_CODE[code]) {
      if (!matched.includes(code)) matched.push(code);
    } else {
      unmatched.push(piece);
    }
  }
  return { matched, unmatched };
}
