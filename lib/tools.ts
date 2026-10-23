import { z } from "zod";

// Tool definitions shared by the API route (schemas) and the browser (execution).
// Client tools have no `execute` on the server: the browser runs them against the
// plan store, so the AI edits exactly the same plan the student sees.

export const clientTools = {
  add_course: {
    description: "Add a catalog course to a term in the student's plan. Use term ids like F2026, S2027, or PRE for AP/transfer credit.",
    inputSchema: z.object({ code: z.string().describe("Catalog code, e.g. ECON UN3211"), termId: z.string() }),
  },
  remove_course: {
    description: "Remove a course from the plan.",
    inputSchema: z.object({ code: z.string() }),
  },
  move_course: {
    description: "Move a course already in the plan to another term.",
    inputSchema: z.object({ code: z.string(), termId: z.string() }),
  },
  update_profile: {
    description: "Update the student's profile: name, graduation year, majors (program ids), what they study, goals, or constraints like 'no 9am classes'.",
    inputSchema: z.object({
      name: z.string().optional(),
      classYear: z.number().int().optional(),
      studying: z.string().optional(),
      majors: z.array(z.string()).optional(),
      goals: z.string().optional(),
      constraints: z.string().optional(),
    }),
  },
  show_courses: {
    description:
      "Show course recommendations as cards the student can add, mark as already taken, or drag onto a semester. Use this whenever you suggest specific courses instead of describing them in text. Only codes from search_courses.",
    inputSchema: z.object({
      courses: z
        .array(z.object({ code: z.string(), reason: z.string().describe("One short sentence: why this course, for this student") }))
        .min(1)
        .max(4),
      termId: z.string().optional().describe("Term the Add button targets. Defaults to next semester."),
    }),
  },
  set_requirement_done: {
    description: "Check or uncheck a requirement the catalog can't track (language, swim test, PE, Science list, Global Core). Use the manual id, e.g. core-swim.",
    inputSchema: z.object({
      id: z.enum(["core-science", "core-global", "core-language", "core-pe", "core-swim"]),
      done: z.boolean(),
    }),
  },
} as const;

export type ClientToolName = keyof typeof clientTools;
