// Meeting times for the semester calendars.
//
// Real times come from the Directory of Classes via scripts/import-doc.ts, but the
// Directory stopped publishing them after Spring 2025 (they're only in Vergil now),
// so each course gets its last published time for that season, marked with lastKnown.
// Courses with no published time get a placeholder built from Columbia's standard
// class slots so the calendar has something to show; the UI labels those as sample.

import { numberKey } from "./courses";
import { DOC_TIME_TERMS, DOC_TIMES } from "./directory.generated";

export interface Meeting {
  days: string; // "MW", "TR", "MWF"; R = Thursday
  start: string; // "10:10" (24h)
  end: string; // "11:25"
  /** The term this real time is from, e.g. "Spring 2025". Missing for placeholder times. */
  lastKnown?: string;
}

const KNOWN: Record<string, Meeting> = Object.fromEntries(
  DOC_TIMES.map(([code, season, days, start, end]) => [
    `${season}:${code}`,
    { days, start, end, lastKnown: DOC_TIME_TERMS[season as "F" | "S"] },
  ]),
);
// Hand-entered codes sometimes use another letter prefix (CSOR E4231 vs the Directory's CSOR W4231).
// Fall back to subject + number only when exactly one Directory course has it.
const byNumber = new Map<string, Set<string>>();
for (const [code] of DOC_TIMES) byNumber.set(numberKey(code), (byNumber.get(numberKey(code)) ?? new Set()).add(code));

/** "F2026" -> "F", "S2027" -> "S". */
export const seasonOf = (termId: string) => termId.charAt(0);

/** The last published time for a course in this term's season, or undefined if there isn't one. */
export function knownMeetingFor(code: string, termId: string): Meeting | undefined {
  const season = seasonOf(termId);
  const same = byNumber.get(numberKey(code));
  return KNOWN[`${season}:${code}`] ?? (same?.size === 1 ? KNOWN[`${season}:${[...same][0]}`] : undefined);
}

// Placeholders: a few hand-placed times so the demo plan has no clashes.
const FIXED: Record<string, Meeting> = {
  "HUMA CC1001": { days: "MW", start: "10:10", end: "12:00" },
  "HUMA CC1002": { days: "MW", start: "10:10", end: "12:00" },
  "COCI CC1101": { days: "MW", start: "10:10", end: "12:00" },
  "COCI CC1102": { days: "MW", start: "10:10", end: "12:00" },
  "ENGL CC1010": { days: "TR", start: "10:10", end: "11:25" },
  "SCNC CC1000": { days: "MW", start: "14:40", end: "15:55" },
  "MATH UN1101": { days: "TR", start: "8:40", end: "9:55" },
  "MATH UN2010": { days: "TR", start: "11:40", end: "12:55" },
  "COMS W3203": { days: "MW", start: "13:10", end: "14:25" },
  "COMS W3157": { days: "TR", start: "16:10", end: "17:25" },
  "COMS W3261": { days: "TR", start: "13:10", end: "14:25" },
  "CSEE W3827": { days: "MW", start: "14:40", end: "15:55" },
  "MATH GU4041": { days: "TR", start: "10:10", end: "11:25" },
  "MATH UN3020": { days: "TR", start: "14:40", end: "15:55" },
  "COMS W4771": { days: "TR", start: "16:10", end: "17:25" },
  "ECON UN1105": { days: "MW", start: "11:40", end: "12:55" },
  "ECON UN3211": { days: "TR", start: "11:40", end: "12:55" },
  "ECON UN3213": { days: "MW", start: "13:10", end: "14:25" },
};

const SLOTS: [string, string][] = [
  ["8:40", "9:55"], ["10:10", "11:25"], ["11:40", "12:55"], ["13:10", "14:25"], ["14:40", "15:55"], ["16:10", "17:25"], ["17:40", "18:55"],
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Meeting time for a course in a term: the last published one, else a placeholder. Undefined for AP / earlier credit. */
export function meetingFor(code: string, termId: string): Meeting | undefined {
  if (termId === "PRE") return undefined;
  const known = knownMeetingFor(code, termId);
  if (known) return known;
  if (FIXED[code]) return FIXED[code];
  const h = hash(code);
  const [start, end] = SLOTS[h % SLOTS.length];
  return { days: h % 2 ? "MW" : "TR", start, end };
}

export function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatDays(days: string) {
  const names: Record<string, string> = { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" };
  return days.split("").map((d) => names[d]).join("/");
}

/** Pairs of courses in a term whose meetings overlap. */
export function conflicts(codes: string[], termId: string): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = meetingFor(codes[i], termId);
      const b = meetingFor(codes[j], termId);
      if (!a || !b) continue;
      const sameDay = a.days.split("").some((d) => b.days.includes(d));
      const overlap = toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
      if (sameDay && overlap) out.push([codes[i], codes[j]]);
    }
  }
  return out;
}
