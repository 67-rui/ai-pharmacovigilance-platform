import { describe, expect, it } from "vitest";
import { addAnalysisHistoryEntry, buildAnalysisHistoryEntry } from "./analysisHistory";
import type { FaersAnalysis } from "./types";

const analysis: FaersAnalysis = {
  drug: "metformin",
  generatedAt: "2026-06-24T00:00:00.000Z",
  totalReports: 453370,
  sampleSize: 453370,
  search: "metformin",
  topReactions: [{ label: "NAUSEA", value: 31182 }],
  seriousness: [],
  seriousOutcomes: [],
  sexDistribution: [],
  ageDistribution: [],
  yearTrend: [],
  roleDistribution: [],
  highlights: [],
  limitations: [],
  source: {
    name: "openFDA FAERS",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: "https://api.fda.gov/drug/event.json",
    search: "metformin",
    assumptions: [],
    queries: [],
    dataFreshness: {
      status: "live",
      lastUpdated: "2026-06-01",
      cacheStrategy: "no-store",
    },
  },
};

describe("analysis history", () => {
  it("builds a saved analysis entry that can reopen without a generated report", () => {
    const entry = buildAnalysisHistoryEntry(analysis, {
      savedAt: "2026-06-24T01:00:00.000Z",
      workflowUrl: "?drug=metformin",
    });

    expect(entry).toEqual({
      id: "metformin-2026-06-24T01:00:00.000Z",
      savedAt: "2026-06-24T01:00:00.000Z",
      drug: "metformin",
      topReaction: "NAUSEA",
      totalReports: 453370,
      generatedAt: "2026-06-24T00:00:00.000Z",
      workflowUrl: "?drug=metformin",
      dataLastUpdated: "2026-06-01",
      cacheStatus: "live",
      cacheStrategy: "no-store",
    });
  });

  it("keeps the newest analysis first and deduplicates by drug", () => {
    const first = buildAnalysisHistoryEntry(analysis, {
      savedAt: "2026-06-24T01:00:00.000Z",
      workflowUrl: "?drug=metformin",
    });
    const second = buildAnalysisHistoryEntry(
      { ...analysis, totalReports: 500000 },
      {
        savedAt: "2026-06-24T02:00:00.000Z",
        workflowUrl: "?drug=Metformin&workflow=full",
      },
    );

    expect(addAnalysisHistoryEntry([first], second)).toEqual([second]);
  });

  it("limits saved analyses to the requested maximum", () => {
    const entries = Array.from({ length: 4 }, (_, index) =>
      buildAnalysisHistoryEntry(
        { ...analysis, drug: `drug-${index}` },
        {
          savedAt: `2026-06-24T0${index}:00:00.000Z`,
          workflowUrl: `?drug=drug-${index}`,
        },
      ),
    );
    const newest = buildAnalysisHistoryEntry({ ...analysis, drug: "newest" }, {
      savedAt: "2026-06-24T05:00:00.000Z",
      workflowUrl: "?drug=newest",
    });

    expect(addAnalysisHistoryEntry(entries, newest, 3).map((entry) => entry.drug)).toEqual([
      "newest",
      "drug-0",
      "drug-1",
    ]);
  });
});
