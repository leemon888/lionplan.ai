// Imports courses and class times from Columbia's public Directory of Classes
// (doc.sis.columbia.edu) into data/directory.generated.ts.
//
//   npm run import:doc            download what's missing, then rebuild the data file
//   npm run import:doc -- --fresh re-download everything
//
// Which courses: everything offered in OFFERED_TERMS (the current and next semester).
// Which times: the Directory stopped publishing meeting times after Spring 2025 (they're
// only in Vergil now, behind a UNI login), so each course gets the time it last had in
// TIME_TERMS: Fall 2024 for fall semesters, Spring 2025 for spring. Label them as such.
//
// Downloads are cached in scripts/.doc-cache (gitignored), a few at a time with a pause.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://doc.sis.columbia.edu";
const OFFERED_TERMS = ["Fall2026", "Spring2027"];
const TIME_TERMS: Record<"F" | "S", string> = { F: "Fall2024", S: "Spring2025" };
// Course number prefixes for undergraduate-facing courses: arts and sciences (UN, GU, CC, V, C, W, F, X),
// Engineering (E), Barnard (BC). Professional schools (business, law, SPS, public health...) are left out.
const KEEP_PREFIX = /^(UN|GU|CC|BC|[VCWEFX])\d/;
const CONCURRENCY = 3;
const PAUSE_MS = 150;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts", ".doc-cache");
const outFile = join(root, "data", "directory.generated.ts");
const fresh = process.argv.includes("--fresh");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET a Directory page through the disk cache. Returns null for pages that don't exist. */
async function get(path: string): Promise<string | null> {
  const file = join(cacheDir, path.replace(/[^\w.-]+/g, "_"));
  if (!fresh && existsSync(file)) {
    const cached = readFileSync(file, "utf8");
    return cached === "404" ? null : cached;
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: { "User-Agent": "lionplan-course-import (student project)" } });
      const body = res.status === 404 ? "404" : res.ok ? await res.text() : null;
      if (body === null) throw new Error(`HTTP ${res.status}`);
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(file, body);
      await sleep(PAUSE_MS);
      return body === "404" ? null : body;
    } catch (e) {
      if (attempt >= 3) throw new Error(`${path}: ${(e as Error).message}`);
      await sleep(2000 * 2 ** attempt);
    }
  }
}

async function eachLimited<T>(items: T[], fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

interface Section {
  subject: string;
  number: string; // "W4111", "UN1101", "BC1014"
  section: string; // "001", "R01"
  points: number;
  title: string;
  days: string; // "MW", "" when not published
  start: string; // "14:40" (24h)
  end: string;
  activity: string; // "LECTURE", "SEMINAR", "LABORATO"...
  department: string; // "Computer Science @Barnard"
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** "2:40pm" -> 14:40 in minutes. The column cuts off long times ("12:40p", "12:55"), so with no am/pm
 *  we take the first reading after `after` (an end time comes after its start). */
function toMinutes(t: string, after = 0): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})([ap])?m?$/i);
  if (!m) return null;
  const base = (Number(m[1]) % 12) * 60 + Number(m[2]);
  if (m[3]) return base + (m[3].toLowerCase() === "p" ? 720 : 0);
  return base > after ? base : base + 720;
}
const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

// The text listing is a fixed-width table. Each section is a row, then a line with activity and department:
// W4111  001  11968        3  INTRODUCTION TO DATABASES       MW 2:40pm-3:55pm  301 Uris Hall        Ross, Kenneth A
//             L      LECTURE  Computer Science
function parseListing(subject: string, html: string): Section[] {
  const pre = html.match(/<pre>([\s\S]*?)<\/pre>/i)?.[1];
  if (!pre) return [];
  const lines = decode(pre).split("\n");
  const out: Section[] = [];
  lines.forEach((line, i) => {
    const row = line.match(/^([A-Z]{1,2}\d{4}[A-Z]?)\s+([A-Z0-9]{3})\s/);
    if (!row) return;
    const when = line.slice(60, 78).trim().match(/^([MTWRFSU]+)\s+(\S+)-(\S+)$/);
    const startMin = when ? toMinutes(when[2]) : null;
    const endMin = when && startMin !== null ? toMinutes(when[3], startMin) : null;
    const start = startMin !== null && endMin !== null && endMin > startMin ? hhmm(startMin) : null;
    const end = start && endMin !== null ? hhmm(endMin) : null;
    const next = lines[i + 1] ?? "";
    out.push({
      subject,
      number: row[1],
      section: row[2],
      points: parseFloat(line.slice(23, 28)) || 0,
      title: line.slice(28, 60).trim(),
      days: start && end && when ? when[1].replace(/[SU]/g, "") : "",
      start: start ?? "",
      end: end ?? "",
      activity: next.slice(18, 28).trim(),
      department: next.slice(28).trim(),
    });
  });
  return out;
}

// Titles come abbreviated and in capitals ("INTRO-COMPUT SCI/PROG IN"); make them easier to read.
const SMALL = new Set(["a", "an", "and", "as", "at", "for", "in", "of", "on", "or", "the", "to", "with"]);
const KEEP_CAPS = /^(I|II|III|IV|V|VI|AI|ML|US|UK|NYC|EU|CS|CC|BC|HIV|DNA|RNA|LGBTQ|STEM|MRI)$/;
function titleCase(title: string) {
  return title
    .toLowerCase()
    .split(/(\s+|-|\/|:)/)
    .map((w, i) => {
      if (KEEP_CAPS.test(w.toUpperCase())) return w.toUpperCase();
      if (i > 0 && SMALL.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join("");
}

// For a course's time, use a lecture or seminar section, the main section before video-network copies.
const TEACHING = /^(LECTURE|SEMINAR|STUDIO|COLLOQ|WORKSHOP)/;
const rank = (s: Section) =>
  (TEACHING.test(s.activity) ? 0 : 2) + (/video/i.test(s.department) ? 1 : 0) + (/^\d+$/.test(s.section) ? 0 : 1);

async function main() {
  console.log("Reading the subject list…");
  const index = await get("/sel/subjects.html");
  if (!index) throw new Error("Could not load the subject list");
  const subjects = [...new Set([...index.matchAll(/subj\/([A-Z]{4})\//g)].map((m) => m[1]))].sort();
  console.log(`${subjects.length} subjects`);

  const terms = [...OFFERED_TERMS, ...Object.values(TIME_TERMS)];
  const jobs = subjects.flatMap((subject) => terms.map((term) => ({ subject, term })));
  const sections: Record<string, Section[]> = Object.fromEntries(terms.map((t) => [t, []]));
  let done = 0;
  await eachLimited(jobs, async ({ subject, term }) => {
    const html = await get(`/subj/${subject}/_${term}_text.html`);
    if (html) sections[term].push(...parseListing(subject, html));
    if (++done % 100 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length} listings`);
  });

  // Courses: one per subject + number offered in the current or next semester.
  // Barnard means a BC number or only Barnard sections: Calculus I with one Barnard section is still a Columbia course.
  const courses = new Map<string, { title: string; points: number; seasons: Set<string>; barnard: boolean; best: Section }>();
  for (const term of OFFERED_TERMS) {
    for (const s of sections[term]) {
      if (!KEEP_PREFIX.test(s.number)) continue;
      const code = `${s.subject} ${s.number}`;
      const c = courses.get(code) ?? { title: "", points: 0, seasons: new Set<string>(), barnard: true, best: s };
      c.seasons.add(term[0]);
      c.barnard &&= s.number.startsWith("BC") || /@Barnard/i.test(s.department);
      if (rank(s) <= rank(c.best)) c.best = s;
      c.points = Math.max(c.points, s.points);
      courses.set(code, c);
    }
  }
  for (const c of courses.values()) c.title = titleCase(c.best.title);

  // Times: the last published one for each season.
  const times: [string, string, string, string, string][] = [];
  for (const [season, term] of Object.entries(TIME_TERMS)) {
    const best = new Map<string, Section>();
    for (const s of sections[term]) {
      const code = `${s.subject} ${s.number}`;
      if (!courses.has(code) || !s.days) continue;
      const cur = best.get(code);
      if (!cur || rank(s) < rank(cur) || (rank(s) === rank(cur) && s.section < cur.section)) best.set(code, s);
    }
    for (const [code, s] of best) times.push([code, season, s.days, s.start, s.end]);
  }

  const rows = [...courses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, c]) => JSON.stringify([code, c.title, c.points, [...c.seasons].sort().join(""), ...(c.barnard ? [1] : [])]));
  times.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const today = new Date().toISOString().slice(0, 10);

  writeFileSync(
    outFile,
    `// GENERATED by scripts/import-doc.ts (npm run import:doc) on ${today}. Do not edit by hand.
// Source: Columbia Directory of Classes, doc.sis.columbia.edu.
// Courses offered ${OFFERED_TERMS.join(" or ")}. Times are the last ones the Directory published:
// ${TIME_TERMS.F} for fall, ${TIME_TERMS.S} for spring. Current times are only in Vergil.

/** [code, title, points, seasons offered ("F", "S" or "FS"), barnard?] */
export const DOC_COURSES: [string, string, number, string, 1?][] = [
${rows.join(",\n")},
];

/** [code, season, days, start, end] */
export const DOC_TIMES: [string, string, string, string, string][] = [
${times.map((t) => JSON.stringify(t)).join(",\n")},
];

export const DOC_TIME_TERMS = ${JSON.stringify({ F: TIME_TERMS.F.replace(/(\d+)/, " $1"), S: TIME_TERMS.S.replace(/(\d+)/, " $1") })};
`,
  );

  const all = OFFERED_TERMS.map((t) => `${t}: ${sections[t].length} sections`).join(", ");
  console.log(`\n${all}`);
  console.log(`Wrote ${courses.size} courses and ${times.length} last-known times to data/directory.generated.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
