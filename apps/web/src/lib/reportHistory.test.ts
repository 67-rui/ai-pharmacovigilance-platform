import { describe, expect, it } from "vitest";
import { addReportHistoryEntry, buildReportHistoryEntry } from "./reportHistory";
import type { FaersAnalysis, ReportResponse } from "./types";

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
  },
};

const report: ReportResponse = {
  mode: "template",
  report: "## metformin FAERS Safety Summary",
  structuredReport: {
    title: "metformin FAERS Safety Summary",
    safetySignalOverview: "Reviewer summary",
    keyPatterns: [],
    reviewerFollowUp: [],
    limitations: [],
    qualityChecks: [],
  },
  promptVersion: "faers-safety-report-v2",
  qualityChecklist: ["Mentions FAERS limitations"],
  tone: "pharmacist-review",
};

describe("report history", () => {
  it("builds a concise saved history entry from analysis and report output", () => {
    const entry = buildReportHistoryEntry(analysis, report, {
      savedAt: "2026-06-24T01:00:00.000Z",
      workflowUrl: "?drug=metformin&workflow=full",
    });

    expect(entry).toEqual({
      id: "metformin-2026-06-24T01:00:00.000Z",
      savedAt: "2026-06-24T01:00:00.000Z",
      drug: "metformin",
      topReaction: "NAUSEA",
      totalReports: 453370,
      reportTitle: "metformin FAERS Safety Summary",
      promptVersion: "faers-safety-report-v2",
      mode: "template",
      workflowUrl: "?drug=metformin&workflow=full",
    });
  });

  it("keeps the newest entry first and deduplicates by drug", () => {
    const first = buildReportHistoryEntry(analysis, report, {
      savedAt: "2026-06-24T01:00:00.000Z",
      workflowUrl: "?drug=metformin&workflow=full",
    });
    const second = buildReportHistoryEntry(
      { ...analysis, totalReports: 500000 },
      report,
      {
        savedAt: "2026-06-24T02:00:00.000Z",
        workflowUrl: "?drug=Metformin&workflow=full",
      },
    );

    expect(addReportHistoryEntry([first], second)).toEqual([second]);
  });

  it("limits saved entries to the requested maximum", () => {
    const entries = Array.from({ length: 4 }, (_, index) =>
      buildReportHistoryEntry(
        { ...analysis, drug: `drug-${index}` },
        report,
        {
          savedAt: `2026-06-24T0${index}:00:00.000Z`,
          workflowUrl: `?drug=drug-${index}&workflow=full`,
        },
      ),
    );
    const newest = buildReportHistoryEntry({ ...analysis, drug: "newest" }, report, {
      savedAt: "2026-06-24T05:00:00.000Z",
      workflowUrl: "?drug=newest&workflow=full",
    });

    expect(addReportHistoryEntry(entries, newest, 3).map((entry) => entry.drug)).toEqual([
      "newest",
      "drug-0",
      "drug-1",
    ]);
  });
});
