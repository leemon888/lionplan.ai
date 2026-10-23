import { MAJORS, MINORS } from "@/data/majors";
import type { Profile, School, Study } from "./types";

const joinAnd = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The program id we can track for a major, if any (Columbia College only for now). */
export function trackedProgram(name: string, kind: Study["kind"], school: School): string | undefined {
  if (kind !== "major" || school !== "CC") return undefined;
  return MAJORS.find((m) => m.name === name)?.programId;
}

/**
 * Profile fields that follow from the list of majors and minors: which programs the engine
 * tracks and the short "studying" label. Call it whenever studies or the school change.
 */
export function studiesPatch(studies: Study[], school: School): Pick<Profile, "studies" | "majors" | "studying"> {
  const fixed = studies.map((s) => ({ ...s, programId: trackedProgram(s.name, s.kind, school) }));
  const majors = fixed.filter((s) => s.kind === "major");
  return {
    studies: fixed,
    majors: [...new Set(majors.map((s) => s.programId).filter((x): x is string => !!x))],
    studying: majors.length ? joinAnd(majors.map((m) => m.name)) : "Undecided",
  };
}

/** Majors or minors offered at a school, for the profile's search box. */
export function studyOptions(kind: Study["kind"], school: School) {
  const list = kind === "major" ? MAJORS : MINORS;
  const group = school === "SEAS" ? "Engineering" : school === "Other" ? null : "College";
  const scoped = group ? list.filter((o) => o.schools.includes(group)) : list;
  return scoped.length ? scoped : list;
}
