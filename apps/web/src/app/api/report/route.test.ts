import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import type { FaersAnalysis, ReportResponse } from "@/lib/types";
import { resetPublicDemoRateLimits } from "../../../lib/publicDemoRateLimit";

const originalApiKey = process.env.OPENAI_API_KEY;

const analysis: FaersAnalysis = {
  drug: "metformin",
  generatedAt: "2026-06-23T00:00:00.000Z",
  totalReports: 1234,
  sampleSize: 1234,
  search: 'patient.drug.medicinalproduct:"METFORMIN"',
  topReactions: [{ label: "NAUSEA", value: 120 }],
  seriousness: [
    { label: "Serious", value: 300 },
    { label: "Non-serious", value: 934 },
  ],
  seriousOutcomes: [{ label: "Hospitalization", value: 80 }],
  sexDistribution: [{ label: "Female", value: 700 }],
  ageDistribution: [{ label: "65-74", value: 250 }],
  yearTrend: [{ label: "2025", value: 100 }],
  roleDistribution: [{ label: "Suspect", value: 1234 }],
  highlights: ["Metformin has 1,234 suspect-drug FAERS matches."],
  limitations: [
    "FAERS reports cannot establish incidence, prevalence, or causality.",
  ],
  source: {
    name: "openFDA FAERS",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: "https://api.fda.gov/drug/event.json",
    search: 'patient.drug.medicinalproduct:"METFORMIN"',
    assumptions: ["Uses suspect-drug role coding when available."],
    queries: [
      {
        label: "Top reactions",
        purpose: "Count MedDRA preferred terms.",
        url: "https://api.fda.gov/drug/event.json?search=test",
      },
    ],
  },
};

describe("POST /api/report", () => {
  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    resetPublicDemoRateLimits();
    vi.unstubAllEnvs();
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON request body.",
    });
  });

  it("returns a schema-shaped template report when no OpenAI key is configured", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      new Request("http://localhost/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis, tone: "portfolio-summary" }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as ReportResponse;

    expect(payload.mode).toBe("template");
    expect(payload.tone).toBe("portfolio-summary");
    expect(payload.structuredReport.title).toBe("metformin FAERS Portfolio Summary");
    expect(payload.structuredReport.safetySignalOverview).toContain("technical portfolio viewer");
    expect(payload.structuredReport.safetySignalOverview).toContain("cannot establish");
    expect(payload.structuredReport.keyPatterns).toContain(
      "Most frequently reported reactions: NAUSEA (120).",
    );
    expect(payload.report).toContain("### Reviewer Follow-up");
    expect(payload.qualityChecklist).toContain(
      "No causal claims from FAERS report counts.",
    );
  });

  it("returns 429 when the public demo report limit is reached", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.stubEnv("PUBLIC_DEMO_REPORT_RATE_LIMIT", "1");
    vi.stubEnv("PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS", "60000");
    const requestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.60",
      },
      body: JSON.stringify({ analysis, tone: "portfolio-summary" }),
    };

    const firstResponse = await POST(
      new Request("http://localhost/api/report", requestInit),
    );
    const limitedResponse = await POST(
      new Request("http://localhost/api/report", requestInit),
    );

    expect(firstResponse.status).toBe(200);
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "Public demo rate limit reached for AI report generation.",
    });
  });
});
