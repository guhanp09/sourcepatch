import { describe, it, expect, vi } from "vitest";
import { createDemo } from "../src/core/demo";
import {
  requestGemini,
  validateSuggestions,
  prepareReview,
} from "../src/core/gemini";
import { latest } from "../src/core/model";

describe("optional Gemini review boundary", () => {
  it("does not call a network service without explicitly configured credentials", async () => {
    const fetcher = vi.fn();
    await expect(
      requestGemini(await createDemo(), {
        apiKey: "",
        model: "gemini-test",
        fetcher,
      }),
    ).rejects.toThrow("No document data has been sent");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects unsafe model identifiers and out-of-range batch limits", async () => {
    const workspace = await createDemo();
    await expect(
      requestGemini(workspace, {
        apiKey: "test-key",
        model: "../another-host",
      }),
    ).rejects.toThrow("model identifier");
    expect(() => prepareReview(workspace, 11)).toThrow("1 to 10");
  });
  it("accepts a structured response with exact current evidence without changing the workspace", async () => {
    const workspace = await createDemo();
    const before = JSON.stringify(workspace);
    const suggestion = {
      passageId: "passage-sample",
      decision: "revise",
      proposedText: "Use 80 participants, 40 per group.",
      explanation: "The total changed.",
      evidence: [
        {
          sourceId: "source-experiment",
          quote: latest(workspace.sources[0]).body.split("\n\n")[1],
        },
      ],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    { text: JSON.stringify({ suggestions: [suggestion] }) },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const result = await requestGemini(workspace, {
      apiKey: "test-key",
      model: "gemini-test",
      limit: 1,
      fetcher,
    });
    expect(result.suggestions[0].proposedText).toContain("80");
    expect(JSON.stringify(workspace)).toBe(before);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
    );
    expect(
      JSON.parse(fetcher.mock.calls[0][1].body).systemInstruction.parts[0].text,
    ).toContain("untrusted data");
  });
  it("rejects invented evidence, duplicate results and missing decisions", async () => {
    const workspace = await createDemo();
    const s = {
      passageId: "passage-sample",
      decision: "revise",
      proposedText: "80 people.",
      explanation: "Changed.",
      evidence: [{ sourceId: "source-experiment", quote: "Made up quote." }],
    };
    expect(() =>
      validateSuggestions({ suggestions: [s] }, workspace, ["passage-sample"]),
    ).toThrow("exact excerpt");
    expect(() =>
      validateSuggestions({ suggestions: [s, s] }, workspace, [
        "passage-sample",
        "passage-threshold",
      ]),
    ).toThrow();
    expect(() =>
      validateSuggestions({ suggestions: [] }, workspace, ["passage-sample"]),
    ).toThrow("exactly one");
  });
  it("fails clearly on quota errors and truncated generations", async () => {
    const workspace = await createDemo();
    await expect(
      requestGemini(workspace, {
        apiKey: "test-key",
        model: "gemini-test",
        fetcher: vi.fn().mockResolvedValue(new Response("", { status: 429 })),
      }),
    ).rejects.toThrow("HTTP 429");
    await expect(
      requestGemini(workspace, {
        apiKey: "test-key",
        model: "gemini-test",
        fetcher: vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
              { status: 200 },
            ),
          ),
      }),
    ).rejects.toThrow("complete response");
  });
});
