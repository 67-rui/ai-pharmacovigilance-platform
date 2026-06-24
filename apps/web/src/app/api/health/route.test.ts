import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
const originalOpenFdaKey = process.env.OPENFDA_API_KEY;

describe("GET /api/health", () => {
  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
    process.env.DEEPSEEK_API_KEY = originalDeepSeekKey;
    process.env.OPENFDA_API_KEY = originalOpenFdaKey;
  });

  it("returns deployment readiness without exposing provider secrets", async () => {
    process.env.OPENAI_API_KEY = "sk-test-openai-secret";
    process.env.DEEPSEEK_API_KEY = "sk-test-deepseek-secret";
    process.env.OPENFDA_API_KEY = "openfda-test-secret";

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const payload = await response.json();

    expect(payload).toMatchObject({
      status: "ok",
      app: "ai-pharmacovigilance-platform",
      providers: {
        openfda: "key-configured",
        report: "openai",
        medicationIntake: "deepseek",
      },
      apiRoutes: [
        "/api/faers",
        "/api/signal",
        "/api/rankings",
        "/api/compare",
        "/api/report",
        "/api/intake/medication",
      ],
      safetyBoundaries: [
        "schema validation",
        "human confirmation before label-derived FAERS launch",
        "FAERS cannot establish incidence or causality",
      ],
    });
    expect(new Date(payload.generatedAt).toString()).not.toBe("Invalid Date");
    expect(JSON.stringify(payload)).not.toContain("sk-test");
    expect(JSON.stringify(payload)).not.toContain("openfda-test-secret");
  });

  it("reports deterministic fallback provider modes when AI keys are absent", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENFDA_API_KEY;

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.providers).toEqual({
      openfda: "public",
      report: "template",
      medicationIntake: "fallback",
    });
  });
});
