import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { COURSE_BY_CODE } from "@/data/courses";
import { buildInstructions } from "@/lib/ai-context";
import { searchCourses } from "@/lib/search";
import { clientTools } from "@/lib/tools";
import type { Plan } from "@/lib/types";

export const maxDuration = 30;

/** Lets the client know whether the assistant is configured, without exposing the key. */
export function GET() {
  return Response.json({ ai: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY });
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      "The AI isn't set up yet. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local (free key at aistudio.google.com) and restart the dev server.",
      { status: 503 },
    );
  }

  const { messages, plan }: { messages: UIMessage[]; plan: Plan | null } = await req.json();

  const result = streamText({
    model: google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
    instructions: buildInstructions(plan),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(8),
    tools: {
      ...clientTools,
      search_courses: {
        description:
          "Search the course catalog. Filter by text, department code (ECON, MATH, COMS...), or a requirement key like 'cc-econ/electives' to list courses that count toward it.",
        inputSchema: z.object({
          query: z.string().optional(),
          dept: z.string().optional(),
          requirement: z.string().optional().describe("programId/requirementId, e.g. cc-cs/afc"),
        }),
        execute: async (input: { query?: string; dept?: string; requirement?: string }) =>
          searchCourses({ ...input, limit: 25 }).map((c) => ({
            code: c.code,
            title: c.title,
            points: c.points,
            prereqs: c.prereqs?.map((g) => g.join(" or ")).join("; ") || "none listed",
          })),
      },
      get_course: {
        description: "Get full details for one course code.",
        inputSchema: z.object({ code: z.string() }),
        execute: async ({ code }: { code: string }) => COURSE_BY_CODE[code.toUpperCase()] ?? { error: `${code} not found` },
      },
    },
  });

  // originalMessages: a continuation after a client tool call keeps the same assistant message.
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, originalMessages: messages }) });
}
