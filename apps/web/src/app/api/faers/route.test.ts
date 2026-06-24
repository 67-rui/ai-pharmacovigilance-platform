import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { FaersAnalysis } from "@/lib/types";
import {
  createOpenFdaFixtureFetch,
  createOpenFdaNoResultFetch,
  createOpenFdaRateLimitFetch,
  faersDrugFixtures,
} from "../../../test-utils/openFdaFixtures";

const originalFetch = global.fetch;

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
    global.fetch = vi.fn(createOpenFdaFixtureFetch(faersDrugFixtures.metformin)) as typeof fetch;

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

  it.each([
    ["metformin", faersDrugFixtures.metformin],
    ["atorvastatin", faersDrugFixtures.atorvastatin],
    ["ibuprofen", faersDrugFixtures.ibuprofen],
    ["warfarin", faersDrugFixtures.warfarin],
  ])("returns fixture-backed FAERS analysis for %s", async (drug, fixture) => {
    global.fetch = vi.fn(createOpenFdaFixtureFetch(fixture)) as typeof fetch;

    const response = await GET(
      new Request(`http://localhost/api/faers?drug=${drug}`),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as FaersAnalysis;

    expect(payload.drug.toLowerCase()).toBe(drug);
    expect(payload.totalReports).toBe(fixture.totalReports);
    expect(payload.topReactions[0]).toEqual(fixture.topReactions[0]);
    expect(payload.seriousness.length).toBeGreaterThan(0);
    expect(payload.yearTrend.length).toBeGreaterThan(0);
    expect(payload.source.search).toContain("patient.drug.drugcharacterization:1");
  });

  it("returns 404 when openFDA has no reports for the drug", async () => {
    global.fetch = vi.fn(createOpenFdaNoResultFetch()) as typeof fetch;

    const response = await GET(
      new Request("http://localhost/api/faers?drug=notarealdrug"),
    );

    expect(response.status).toBe(404);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("No FAERS reports found");
  });

  it("returns 502 when openFDA returns an upstream error", async () => {
    global.fetch = vi.fn(createOpenFdaRateLimitFetch()) as typeof fetch;

    const response = await GET(
      new Request("http://localhost/api/faers?drug=metformin"),
    );

    expect(response.status).toBe(502);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toContain("openFDA request failed (429)");
  });
});
