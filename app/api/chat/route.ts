import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import details from "@/data/catalog/bulletin-details.json";
import { COURSE_BY_CODE, resolveCode } from "@/data/courses";
import { buildInstructions } from "@/lib/ai-context";
import { chatModel, friendlyError } from "@/lib/model";
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
    model: chatModel(),
    // One retry of the whole chain; chatModel already moves to the next model when one is overloaded.
    maxRetries: 1,
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
        execute: async ({ code }: { code: string }) => {
          const c = COURSE_BY_CODE[resolveCode(code) ?? code.toUpperCase()];
          if (!c) return { error: `${code} not found` };
          // Descriptions live in a server-only file so they don't weigh down the app.
          const extra = (details as Record<string, { description?: string }>)[c.code];
          return { ...c, description: extra?.description ?? c.description };
        },
      },
    },
  });

  // originalMessages: a continuation after a client tool call keeps the same assistant message.
  return createUIMessageStreamResponse({ stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onError: (error) => {
        console.error(error);
        return friendlyError(error);
      },
    }) });
}
