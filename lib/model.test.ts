import { APICallError, simulateReadableStream, streamText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { friendlyError, modelIds, shouldFallBack, withFallback } from "./model";

const apiError = (statusCode: number) =>
  new APICallError({ message: `HTTP ${statusCode}`, url: "https://example", requestBodyValues: {}, statusCode, isRetryable: statusCode >= 500 || statusCode === 429 });

function working(id: string, text: string) {
  return new MockLanguageModelV4({
    modelId: id,
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } } },
        ],
      }),
    }),
  });
}
function failing(id: string, status: number) {
  return new MockLanguageModelV4({ modelId: id, doStream: async () => { throw apiError(status); } });
}

describe("model fallback", () => {
  it("reads GEMINI_MODEL as a comma-separated list", () => {
    expect(modelIds("a, b")).toEqual(["a", "b"]);
    expect(modelIds(undefined)[0]).toBe("gemini-3.8-flash");
  });

  it("falls back on overload, rate limits and retired models, not bad requests", () => {
    expect(shouldFallBack(apiError(503))).toBe(true);
    expect(shouldFallBack(apiError(429))).toBe(true);
    expect(shouldFallBack(apiError(404))).toBe(true);
    expect(shouldFallBack(apiError(400))).toBe(false);
  });

  it("answers from the next model when the first is overloaded or retired", async () => {
    const model = withFallback([failing("a", 503), failing("b", 404), working("c", "hi from c")]);
    const result = streamText({ model, prompt: "hello", maxRetries: 0 });
    expect(await result.text).toBe("hi from c");
  });

  it("gives the student a plain message", () => {
    expect(friendlyError(apiError(503))).toMatch(/overloaded/);
    expect(friendlyError({ lastError: apiError(429) })).toMatch(/limit/);
  });
});
