import { describe, expect, it } from "vitest";
import { studiesPatch } from "./profile";

describe("studiesPatch", () => {
  const studies = [
    { name: "Mathematics", kind: "major" as const, status: "declared" as const },
    { name: "Computer Science", kind: "major" as const, status: "potential" as const },
    { name: "Statistics", kind: "minor" as const, status: "potential" as const },
  ];

  it("tracks Columbia College majors and labels what they study", () => {
    const p = studiesPatch(studies, "CC");
    expect(p.majors).toEqual(["cc-math", "cc-cs"]);
    expect(p.studying).toBe("Mathematics and Computer Science");
    expect(p.studies?.[0].programId).toBe("cc-math");
  });

  it("stops tracking when the school isn't Columbia College", () => {
    const p = studiesPatch(studies, "SEAS");
    expect(p.majors).toEqual([]);
    expect(p.studies?.every((s) => !s.programId)).toBe(true);
  });

  it("is undecided with no majors", () => {
    expect(studiesPatch([], "CC").studying).toBe("Undecided");
  });
});
