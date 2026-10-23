import { google } from "@ai-sdk/google";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { APICallError, wrapLanguageModel } from "ai";

/**
 * Models to try, in order. GEMINI_MODEL can be one id or a comma-separated list.
 * Free-tier models are often "experiencing high demand" (503) or get retired for new keys (404),
 * so if one fails before answering we move to the next instead of making the student wait.
 */
export const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

export function modelIds(env = process.env.GEMINI_MODEL): string[] {
  const ids = env?.split(",").map((s) => s.trim()).filter(Boolean);
  return ids?.length ? ids : DEFAULT_MODELS;
}

/** Errors worth trying the next model for: overloaded, rate-limited, or model not available. */
export function shouldFallBack(error: unknown): boolean {
  if (!APICallError.isInstance(error)) return false;
  return error.isRetryable || error.statusCode === 404 || error.statusCode === 429;
}

export function chatModel(ids = modelIds()) {
  return withFallback(ids.map((id) => google(id)));
}

type Model = LanguageModelV4;

export function withFallback(models: Model[]) {
  const ids = models.map((m) => m.modelId);
  const [first, ...rest] = models;
  if (!rest.length) return first;
  return wrapLanguageModel({
    model: first,
    middleware: {
      specificationVersion: "v4",
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (error) {
          let last = error;
          if (!shouldFallBack(error)) throw error;
          for (const [i, model] of rest.entries()) {
            console.warn(`[chat] ${ids[i]} failed (${(last as APICallError).statusCode}), trying ${ids[i + 1]}`);
            try {
              return await model.doStream(params);
            } catch (next) {
              last = next;
              if (!shouldFallBack(next)) throw next;
            }
          }
          throw last;
        }
      },
    },
  });
}

/** What the student sees in the chat when every model failed. */
export function friendlyError(error: unknown): string {
  const err = APICallError.isInstance(error) ? error : (error as { lastError?: unknown })?.lastError;
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 429) return "The assistant hit its free usage limit. Wait a minute and try again.";
    if (err.statusCode === 503 || err.statusCode === 500) return "Google's AI is overloaded right now. Try again in a minute.";
    if (err.statusCode === 404) return "None of the configured Gemini models are available to this API key. Set GEMINI_MODEL in .env.local.";
    if (err.statusCode === 400 || err.statusCode === 403) return "The Gemini API key was rejected. Check GOOGLE_GENERATIVE_AI_API_KEY in .env.local.";
  }
  return "Something went wrong reaching the assistant. Try again.";
}
