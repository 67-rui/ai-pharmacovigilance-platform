import { describe, expect, it } from "vitest";
import { buildWorkflowRequestPlan } from "./workflow";
import type { FaersAnalysis } from "./types";

const analysis: FaersAnalysis = {
  drug: "metformin",
  generatedAt: "2026-06-24T00:00:00.000Z",
  totalReports: 100,
  sampleSize: 100,
  search: "metformin",
  topReactions: [
    { label: "NAUSEA", value: 20 },
    { label: "DIARRHOEA", value: 18 },
    { label: "VOMITING", value: 12 },
    { label: "HEADACHE", value: 9 },
    { label: "DIZZINESS", value: 8 },
    { label: "FATIGUE", value: 7 },
    { label: "RASH", value: 4 },
  ],
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

describe("workflow request planning", () => {
  it("selects default event, ranking events, and comparator for a full review workflow", () => {
    const plan = buildWorkflowRequestPlan(analysis, "warfarin");

    expect(plan.defaultEvent).toBe("NAUSEA");
    expect(plan.rankingEvents).toEqual([
      "NAUSEA",
      "DIARRHOEA",
      "VOMITING",
      "HEADACHE",
      "DIZZINESS",
      "FATIGUE",
    ]);
    expect(plan.comparatorDrug).toBe("warfarin");
    expect(plan.canRunSignal).toBe(true);
    expect(plan.canRunComparison).toBe(true);
    expect(plan.canRunRanking).toBe(true);
  });

  it("falls back away from the selected drug when comparator matches the primary", () => {
    const plan = buildWorkflowRequestPlan(analysis, "metformin");

    expect(plan.comparatorDrug).toBe("warfarin");
  });
});
