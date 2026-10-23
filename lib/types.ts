// Core data model for Lionplan.
// Everything the UI and the AI touch goes through these types.

export type Season = "Fall" | "Spring";

/** A course in the catalog. `code` is the key everywhere, e.g. "ECON UN1105". */
export interface Course {
  code: string;
  title: string;
  points: number;
  dept: string; // subject code, e.g. "ECON"
  level: number; // 1000, 2000, 3000, 4000...
  description?: string;
  /** Prerequisites in AND-of-ORs form: every group must have one course done earlier. */
  prereqs?: string[][];
  /** Free-form tags, e.g. "core", "seminar". */
  tags?: string[];
  /** Seasons it's offered this year per the Directory of Classes: "F", "S" or "FS". Unknown if missing. */
  offered?: string;
  /** A Barnard course or section. Counts as undergraduate. */
  barnard?: boolean;
}

/** Which courses a counting rule matches. All given fields must match. */
export interface CourseFilter {
  codes?: string[];
  depts?: string[];
  minLevel?: number;
  maxLevel?: number;
  tags?: string[];
  exclude?: string[];
  excludeTags?: string[];
}

/** Requirement rules. Kept small on purpose so they're easy to hand-encode and verify. */
export type Rule =
  | { kind: "course"; code: string }
  | { kind: "allOf"; rules: Rule[] }
  | { kind: "anyOf"; rules: Rule[] }
  | { kind: "choose"; count: number; from: CourseFilter }
  | { kind: "points"; points: number; from: CourseFilter }
  /** Not trackable from the catalog yet (language, swim test, approved lists). User checks it off. */
  | { kind: "manual"; id: string };

export interface Requirement {
  id: string;
  name: string;
  rule: Rule;
  note?: string;
}

export interface Program {
  id: string; // e.g. "cc-core", "cc-econ"
  name: string;
  school: School;
  type: "core" | "major";
  sourceUrl: string;
  /** Date someone last checked this against the bulletin. */
  verified?: string;
  requirements: Requirement[];
}

export interface Term {
  id: string; // "F2025", "S2026", or "PRE" for AP/transfer credit
  season?: Season;
  year?: number;
  label: string;
  courses: string[];
}

export type School = "CC" | "SEAS" | "Barnard" | "GS" | "Other";

export interface Study {
  name: string;
  kind: "major" | "minor";
  status: "declared" | "potential";
  /** Set when we can track this program's requirements (data/programs.ts). */
  programId?: string;
}

export interface Profile {
  name?: string;
  school: School;
  classYear: number; // graduation year, e.g. 2029
  majors: string[]; // program ids we can track (CC only for now)
  /** Short label for what they study ("Mathematics and Computer Science"). */
  studying?: string;
  /** Majors and minors as picked in onboarding, declared or potential. */
  studies?: Study[];
  goals?: string;
  constraints?: string;
}

export interface Plan {
  profile: Profile;
  terms: Term[];
  /** ids of manual requirements the student has checked off */
  manualDone: string[];
}

export type TermStatus = "credit" | "past" | "current" | "future";

export interface RequirementResult {
  id: string;
  name: string;
  note?: string;
  /** "done" = satisfied by completed courses, "planned" = satisfied once planned courses are taken */
  status: "done" | "planned" | "missing";
  manualId?: string;
  /** have = done + planned, doneHave = completed only */
  progress: { have: number; doneHave: number; need: number; unit: "courses" | "points" | "items" };
  counted: string[];
}

export interface ProgramResult {
  id: string;
  name: string;
  type: Program["type"];
  sourceUrl: string;
  requirements: RequirementResult[];
  done: number;
  planned: number;
  total: number;
}

export interface Warning {
  kind: "prereq" | "overload" | "duplicate" | "unknown";
  termId: string;
  code?: string;
  message: string;
}

export interface PlanReport {
  programs: ProgramResult[];
  warnings: Warning[];
  points: { done: number; planned: number; required: number };
}
