import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { MedicationIntakeResult } from "@/lib/types";
import { resetPublicDemoRateLimits } from "../../../../lib/publicDemoRateLimit";

const originalApiKey = process.env.DEEPSEEK_API_KEY;
const originalModel = process.env.DEEPSEEK_MODEL;
const originalFetch = global.fetch;

describe("POST /api/intake/medication", () => {
  afterEach(() => {
    process.env.DEEPSEEK_API_KEY = originalApiKey;
    process.env.DEEPSEEK_MODEL = originalModel;
    global.fetch = originalFetch;
    resetPublicDemoRateLimits();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns fallback extraction when no DeepSeek key is configured", async () => {
    delete process.env.DEEPSEEK_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/intake/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocrText: "Ibuprofen tablets 200 mg. Warnings include stomach bleeding.",
          fileName: "ibuprofen-label.jpg",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as MedicationIntakeResult & {
      warning?: string;
    };

    expect(payload.provider).toBe("fallback");
    expect(payload.drugCandidates).toContain("Ibuprofen");
    expect(payload.strengths).toContain("200 mg");
    expect(payload.warning).toContain("DEEPSEEK_API_KEY");
  });

  it("returns schema-validated DeepSeek extraction when the API responds with JSON", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_MODEL = "deepseek-chat";
    global.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  provider: "deepseek",
                  drugCandidates: ["Metformin"],
                  activeIngredients: ["metformin hydrochloride"],
                  strengths: ["500 mg"],
                  dosageForm: "tablet",
                  riskKeywords: ["adverse reactions"],
                  confidence: "medium",
                  needsHumanConfirmation: true,
                  extractedText: "Metformin hydrochloride tablets 500 mg",
                  evidence: {
                    fileName: "label.png",
                    sourceType: "ocr-text",
                  },
                  limitations: ["OCR text may be incomplete."],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    const response = await POST(
      new Request("http://localhost/api/intake/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocrText: "Metformin hydrochloride tablets 500 mg",
          fileName: "label.png",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as MedicationIntakeResult;

    expect(payload.provider).toBe("deepseek");
    expect(payload.drugCandidates).toEqual(["Metformin"]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("returns 429 when the public demo medication-intake limit is reached", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    vi.stubEnv("PUBLIC_DEMO_INTAKE_RATE_LIMIT", "1");
    vi.stubEnv("PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS", "60000");
    const requestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.70",
      },
      body: JSON.stringify({
        ocrText: "Ibuprofen tablets 200 mg. Warnings include stomach bleeding.",
        fileName: "ibuprofen-label.jpg",
      }),
    };

    const firstResponse = await POST(
      new Request("http://localhost/api/intake/medication", requestInit),
    );
    const limitedResponse = await POST(
      new Request("http://localhost/api/intake/medication", requestInit),
    );

    expect(firstResponse.status).toBe(200);
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "Public demo rate limit reached for medication intake.",
    });
  });
});
