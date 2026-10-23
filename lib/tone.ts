import { parseCode } from "@/data/courses";

const TONE: Record<string, string> = {
  HUMA: "tone-core", COCI: "tone-core", ENGL: "tone-core", SCNC: "tone-core",
  MATH: "tone-math",
  COMS: "tone-cs", CSEE: "tone-cs", CSOR: "tone-cs", CBMF: "tone-cs", ENGI: "tone-cs",
  ECON: "tone-econ",
  STAT: "tone-stat", IEOR: "tone-stat",
};

/** CSS class that sets --tone-* colors for a course's department. */
export function toneFor(code: string) {
  return TONE[parseCode(code).dept] ?? "tone-stat";
}
