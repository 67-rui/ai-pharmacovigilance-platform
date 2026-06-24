import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { FaersAnalysis } from "@/lib/types";

const originalFetch = global.fetch;

function responseJson(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockOpenFdaFetch() {
  global.fetch = vi.fn(async (input) => {
    const url = new URL(String(input));
    const count = url.searchParams.get("count");

    if (!count) {
      return responseJson({ meta: { results: { total: 3210 } }, results: [{}] });
    }

    if (count === "patient.reaction.reactionmeddrapt.exact") {
      return responseJson({
        results: [
          { term: "NAUSEA", count: 120 },
          { term: "DIARRHOEA", count: 80 },
        ],
      });
    }

    if (count === "serious") {
      return responseJson({
        results: [
          { term: "1", count: 700 },
          { term: "2", count: 2510 },
        ],
      });
    }

    if (count === "seriousnesshospitalization") {
      return responseJson({ results: [{ term: "1", count: 44 }] });
    }

    if (count === "patient.patientsex") {
      return responseJson({
        results: [
          { term: "2", count: 1800 },
          { term: "1", count: 1000 },
        ],
      });
    }

    if (count === "patient.patientonsetage") {
      return responseJson({
        results: [
          { term: "66", count: 90 },
          { term: "42", count: 30 },
        ],
      });
    }

    if (count === "patient.drug.drugcharacterization") {
      return responseJson({ results: [{ term: "1", count: 3210 }] });
    }

    return responseJson({ results: [] });
  }) as typeof fetch;
}

describe("GET /api/faers", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 400 when the drug query is missing", async () => {
    const response = await GET(new Request("http://localhost/api/faers"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Provide a drug name between 2 and 80 characters.",
    });
  });

  it("returns a FAERS analysis from mocked openFDA aggregate responses", async () => {
    mockOpenFdaFetch();

    const response = await GET(
      new Request("http://localhost/api/faers?drug=Metformin"),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as FaersAnalysis;

    expect(payload.drug).toBe("Metformin");
    expect(payload.totalReports).toBe(3210);
    expect(payload.topReactions[0]).toEqual({ label: "NAUSEA", value: 120 });
    expect(payload.seriousness).toEqual([
      { label: "Serious", value: 700 },
      { label: "Non-serious", value: 2510 },
    ]);
    expect(payload.seriousOutcomes).toEqual([
      { label: "Hospitalization", value: 44 },
    ]);
    expect(payload.sexDistribution[0]).toEqual({ label: "Female", value: 1800 });
    expect(payload.ageDistribution).toEqual([
      { label: "18-44", value: 30 },
      { label: "65-74", value: 90 },
    ]);
    expect(payload.source.queries.length).toBeGreaterThan(10);
    expect(payload.limitations.join(" ")).toContain("cannot establish incidence");
  });

  it("returns 502 when openFDA returns an upstream error", async () => {
    global.fetch = vi.fn(async () => responseJson({ error: "rate limit" }, 429)) as typeof fetch;

    const response = await GET(
      new Request("http://localhost/api/faers?drug=metformin"),
    );

    expect(response.status).toBe(502);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("openFDA request failed (429)");
  });
});
