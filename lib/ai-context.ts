import { COURSE_BY_CODE } from "@/data/courses";
import { MAJORS } from "@/data/programs";
import { analyzePlan, currentAndNext, currentTerm, termStatus } from "./engine";
import { SCHOOL_LABEL } from "./onboarding";
import type { Plan } from "./types";

/** Builds the system instructions: who the student is, their plan, and what's still missing. */
export function buildInstructions(plan: Plan | null, now = new Date()): string {
  const cur = currentTerm(now);
  const lines: string[] = [
    "You are Lionplan, an academic planning assistant for Columbia students. Requirement tracking covers Columbia College only for now.",
    `Today is ${now.toDateString()}. ${cur ? `The current term is ${cur.season} ${cur.year}.` : "It is summer break."}`,
    "",
    "How to work:",
    "- You can change the student's plan directly with tools. When they ask for a change, make it with tools instead of describing it. Then confirm in one short sentence.",
    "- Only use course codes from search_courses results or the plan. Never invent courses, codes, prerequisites or requirements.",
    "- Requirement status below comes from a verified rules engine. Trust it over your own assumptions.",
    "- Courses in past terms are completed, the current term is in progress, later terms are planned. AP/transfer credit goes in term PRE.",
    "- When a student pastes a transcript or lists courses they've taken, add each one to the semester they took it. If you can't tell the semester, ask once, briefly.",
    "- Recommend courses that fill missing requirements first, respect prerequisites, and keep semesters at or under 18 points, unless the student says otherwise.",
    "- To recommend courses, call show_courses (2 to 4 courses, one short reason each) and write at most one sentence around it. The student adds them from the cards.",
    "- Meeting times in this app are the last ones Columbia published (Fall 2024 / Spring 2025), or placeholders. Say times may have changed and to check Vergil. Don't promise sections.",
    "- Prefer a short answer. Use bullet points only for lists of 3 or more courses.",
    "- Remind students to confirm major decisions with their advisor when it matters, but don't repeat it every message.",
    `- Supported majors (ids): ${MAJORS.map((m) => `${m.name} (${m.id})`).join(", ")}. Data for other majors isn't available yet; say so if asked.`,
  ];

  if (!plan) {
    lines.push("", "The student hasn't set up a plan yet.");
    return lines.join("\n");
  }

  const report = analyzePlan(plan, now);
  const p = plan.profile;
  const { current, next } = currentAndNext(plan, now);
  lines.push(
    "",
    "## Student",
    `${p.name ? p.name + ", " : ""}${SCHOOL_LABEL[p.school] ?? p.school}, class of ${p.classYear}.`,
    `Studying: ${p.studies?.length ? p.studies.map((s) => `${s.name} (${s.status} ${s.kind})`).join(", ") : p.studying || "not given"}. Requirement-tracked programs: ${p.majors.length ? p.majors.join(", ") : "none"}.`,
    `This semester is ${current?.id ?? "unknown"}; next semester is ${next?.id ?? "unknown"}.`,
    p.goals ? `Goals: ${p.goals}` : "Goals: not given yet.",
    p.constraints ? `Constraints: ${p.constraints}` : "",
    "",
    "## Plan (term id: courses)",
  );
  for (const t of plan.terms) {
    const status = termStatus(t, now);
    const pts = t.courses.reduce((s, c) => s + (COURSE_BY_CODE[c]?.points ?? 3), 0);
    lines.push(`${t.id} ${t.label} [${status}, ${pts} pts]: ${t.courses.join(", ") || "empty"}`);
  }
  lines.push("", `Points: ${report.points.done} completed, ${report.points.planned} including planned, ${report.points.required} needed to graduate.`, "", "## Requirements");
  for (const prog of report.programs) {
    lines.push(`${prog.name} (${prog.id}):`);
    for (const r of prog.requirements) {
      const unit = r.progress.unit === "items" ? "" : ` ${r.progress.have}/${r.progress.need} ${r.progress.unit}`;
      lines.push(`  - ${r.name} [${prog.id}/${r.id}]: ${r.status}${unit}${r.counted.length ? ` (${r.counted.join(", ")})` : ""}${r.note ? ` Note: ${r.note}` : ""}`);
    }
  }
  if (report.warnings.length) {
    lines.push("", "## Warnings");
    report.warnings.forEach((w) => lines.push(`- ${w.message}`));
  }
  return lines.filter((l) => l !== undefined).join("\n");
}
