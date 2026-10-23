// Meeting times for the semester calendars.
//
// SAMPLE DATA: every time here is a placeholder built from Columbia's standard
// class slots, so the calendar has something to show. Replace this file with
// real sections scraped from the Directory of Classes (doc.sis.columbia.edu),
// keyed by term, before launch. The UI always labels these as sample times.

export interface Meeting {
  days: string; // "MW", "TR", "MWF"; R = Thursday
  start: string; // "10:10" (24h)
  end: string; // "11:25"
}

export const SECTIONS_ARE_SAMPLE = true;

// A few hand-placed sample times so the demo plan has no clashes.
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

/** Sample meeting time for a course in a term. Undefined for AP / earlier credit. */
export function meetingFor(code: string, termId: string): Meeting | undefined {
  if (termId === "PRE") return undefined;
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
