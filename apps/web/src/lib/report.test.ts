import { describe, expect, it } from "vitest";
import {
  buildTemplateStructuredReport,
  structuredReportSchema,
  structuredReportToMarkdown,
} from "./report";
import type { FaersAnalysis } from "./types";

const analysis: FaersAnalysis = {
  drug: "metformin",
  generatedAt: "2026-06-23T00:00:00.000Z",
  totalReports: 453370,
  sampleSize: 453370,
  search: "patient.drug.drugcharacterization:1",
  topReactions: [
    { label: "NAUSEA", value: 12000 },
    { label: "DIARRHOEA", value: 8000 },
  ],
  seriousness: [
    { label: "Serious", value: 100000 },
    { label: "Non-serious", value: 300000 },
  ],
  seriousOutcomes: [{ label: "Death", value: 12000 }],
  sexDistribution: [{ label: "Female", value: 200000 }],
  ageDistribution: [{ label: "65-74", value: 20000 }],
  yearTrend: [{ label: "2026", value: 1000 }],
  roleDistribution: [{ label: "Primary suspect", value: 400000 }],
  highlights: ["NAUSEA is the most frequently reported MedDRA preferred term."],
  limitations: [
    "FAERS reports cannot establish incidence, prevalence, or causality.",
  ],
  source: {
    name: "openFDA FAERS",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: "https://api.fda.gov/drug/event.json",
    search: "patient.drug.drugcharacterization:1",
    assumptions: ["Suspect drug search."],
    queries: [],
  },
};

describe("structured pharmacovigilance reports", () => {
  it("builds a schema-valid template report with required safety guardrails", () => {
    const report = buildTemplateStructuredReport(analysis);

    expect(structuredReportSchema.safeParse(report).success).toBe(true);
    expect(report.safetySignalOverview).toContain("metformin");
    expect(report.limitations.join(" ")).toContain("cannot establish");
    expect(report.qualityChecks).toContain("No causal claims from FAERS report counts.");
  });

  it("renders structured reports to reviewer-ready Markdown", () => {
    const markdown = structuredReportToMarkdown(
      buildTemplateStructuredReport(analysis),
    );

    expect(markdown).toContain("## metformin FAERS Safety Summary");
    expect(markdown).toContain("### Safety Signal Overview");
    expect(markdown).toContain("### Key Patterns");
    expect(markdown).toContain("### Reviewer Follow-up");
    expect(markdown).toContain("### Limitations");
  });
});
