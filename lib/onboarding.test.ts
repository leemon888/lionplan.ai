import { describe, expect, it } from "vitest";
import { normalizeGrad, normalizeMajors, normalizeName, normalizeSchool, parseClasses } from "./onboarding";

const OCT_2026 = new Date(2026, 9, 22);

describe("onboarding normalization", () => {
  it("cleans names", () => {
    expect(normalizeName("  christ le ")).toBe("Christ Le");
  });

  it("reads schools loosely", () => {
    expect(normalizeSchool("cc")).toBe("CC");
    expect(normalizeSchool("columbia college")).toBe("CC");
    expect(normalizeSchool("SEAS")).toBe("SEAS");
    expect(normalizeSchool("barnard")).toBe("Barnard");
    expect(normalizeSchool("gs")).toBe("GS");
    expect(normalizeSchool("")).toBeNull();
  });

  it("reads graduation years and standings", () => {
    expect(normalizeGrad("2029", OCT_2026)).toBe(2029);
    expect(normalizeGrad("class of '28", OCT_2026)).toBe(2028);
    expect(normalizeGrad("sophomore", OCT_2026)).toBe(2029);
    expect(normalizeGrad("im a senior", OCT_2026)).toBe(2027);
    expect(normalizeGrad("first year", OCT_2026)).toBe(2030);
    expect(normalizeGrad("dunno", OCT_2026)).toBeNull();
  });

  it("maps majors to trackable programs", () => {
    expect(normalizeMajors("math and cs")).toEqual({ label: "Mathematics and Computer Science", ids: ["cc-math", "cc-cs"] });
    expect(normalizeMajors("econ, maybe poli sci")).toEqual({ label: "Economics and Political Science", ids: ["cc-econ"] });
    expect(normalizeMajors("not sure yet").ids).toEqual([]);
  });

  it("recognizes classes from messy text", () => {
    const r = parseClasses("calc 1, Lit Hum, data structures w/ blaise\nCOMS 3157 and intro econ, ap calc bc, underwater basket weaving");
    expect(r.matched).toEqual(["MATH UN1101", "HUMA CC1001", "COMS W3134", "COMS W3157", "ECON UN1105"]);
    expect(r.unmatched).toEqual(["ap calc bc", "underwater basket weaving"]);
  });

  it("tells calc 1 from calc 2", () => {
    expect(parseClasses("calc ii").matched).toEqual(["MATH UN1102"]);
  });
});
