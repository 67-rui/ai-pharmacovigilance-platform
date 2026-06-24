import { describe, expect, it } from "vitest";
import { buildPdfReportSections } from "./pdfReport";
import type {
  DrugComparison,
  FaersAnalysis,
  MedicationIntakeResult,
  ReportResponse,
  SignalAnalysis,
  SignalRanking,
} from "./types";

const analysis: FaersAnalysis = {
  drug: "metformin",
  generatedAt: "2026-06-24T08:00:00.000Z",
  totalReports: 453370,
  sampleSize: 453370,
  search: "patient.drug.openfda.brand_name.exact:\"metformin\"",
  topReactions: [
    { label: "NAUSEA", value: 12000 },
    { label: "DIARRHOEA", value: 8000 },
  ],
  seriousness: [{ label: "Serious", value: 100000 }],
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
    search: "patient.drug.openfda.brand_name.exact:\"metformin\"",
    assumptions: ["Suspect drug search."],
    queries: [],
  },
};

const signal: SignalAnalysis = {
  drug: "metformin",
  event: "NAUSEA",
  generatedAt: "2026-06-24T08:01:00.000Z",
  table: {
    drugAndEvent: 12000,
    drugAndOtherEvents: 441370,
    otherDrugsAndEvent: 950000,
    otherDrugsAndOtherEvents: 15000000,
  },
  metrics: {
    prr: 2.1,
    ror: 2.2,
    rorLower95: 2.0,
    rorUpper95: 2.4,
  },
  interpretation: {
    label: "signal-elevated",
    summary: "The event is reported disproportionately often with this drug.",
  },
  assumptions: ["PRR and ROR are signal-triage metrics."],
  source: {
    endpoint: "https://api.fda.gov/drug/event.json",
    queries: [],
  },
};

const ranking: SignalRanking = {
  drug: "metformin",
  generatedAt: "2026-06-24T08:02:00.000Z",
  rows: [
    {
      event: "NAUSEA",
      eventReports: 12000,
      prr: 2.1,
      ror: 2.2,
      rorLower95: 2.0,
      rorUpper95: 2.4,
      interpretationLabel: "signal-elevated",
      interpretationSummary: "Elevated signal hypothesis.",
    },
  ],
  assumptions: ["Rows are ordered by interpretation and report count."],
};

const comparison: DrugComparison = {
  primaryDrug: "metformin",
  comparatorDrug: "warfarin",
  event: "NAUSEA",
  generatedAt: "2026-06-24T08:03:00.000Z",
  rows: [
    {
      drug: "metformin",
      role: "primary",
      totalDrugReports: 453370,
      eventReports: 12000,
      otherEventReports: 441370,
      eventSharePerThousand: 26.469,
      prr: 2.1,
      ror: 2.2,
      rorLower95: 2.0,
      rorUpper95: 2.4,
      interpretationLabel: "signal-elevated",
    },
  ],
  comparison: {
    higherEventShareDrug: "metformin",
    eventShareRatio: 1.7,
    summary:
      "metformin has the higher event reporting share for this MedDRA term in FAERS.",
  },
  assumptions: ["Comparison uses FAERS report shares."],
};

const report: ReportResponse = {
  mode: "template",
  report: "## metformin FAERS Pharmacist Review",
  promptVersion: "faers-safety-report-v2",
  tone: "pharmacist-review",
  qualityChecklist: ["No causal claims from FAERS report counts."],
  structuredReport: {
    title: "metformin FAERS Pharmacist Review",
    safetySignalOverview:
      "metformin matched FAERS reports. These aggregate counts support signal triage only.",
    keyPatterns: ["NAUSEA is the most frequently reported reaction."],
    reviewerFollowUp: ["Review chronology and co-medications."],
    limitations: [
      "FAERS reports cannot establish incidence, prevalence, or causality.",
    ],
    qualityChecks: ["No causal claims from FAERS report counts."],
  },
};

const intake: MedicationIntakeResult = {
  provider: "fallback",
  drugCandidates: ["Metformin"],
  activeIngredients: ["Metformin hydrochloride"],
  strengths: ["500 mg"],
  dosageForm: "tablet",
  riskKeywords: ["warning"],
  confidence: "medium",
  needsHumanConfirmation: true,
  extractedText: "Metformin hydrochloride tablets 500 mg warnings",
  promptVersion: "medication-label-intake-v1",
  evidence: {
    fileName: "metformin-label.png",
    sourceType: "ocr-text",
  },
  limitations: [
    "Medication extraction must be confirmed by a human before FAERS analysis.",
  ],
};

describe("PDF report sections", () => {
  it("builds reviewer-ready sections with analysis, signal, ranking, comparison, and AI report context", () => {
    const sections = buildPdfReportSections({
      analysis,
      signal,
      ranking,
      comparison,
      report,
      intake,
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Executive Summary",
      "Signal Metrics",
      "Ranked Signal Candidates",
      "Drug Comparison",
      "AI Structured Report",
      "Responsible AI And FAERS Limits",
    ]);
    expect(sections[0].lines.join(" ")).toContain("453,370");
    expect(sections[1].lines.join(" ")).toContain("PRR: 2.1");
    expect(sections[2].lines.join(" ")).toContain("NAUSEA");
    expect(sections[3].lines.join(" ")).toContain("metformin has the higher");
    expect(sections[4].lines.join(" ")).toContain("Schema validated");
    expect(sections[5].lines.join(" ")).toContain("cannot establish");
  });

  it("adds a responsible-AI checklist with schema, confirmation, provider, and FAERS boundaries", () => {
    const sections = buildPdfReportSections({
      analysis,
      signal,
      ranking,
      comparison,
      report,
      intake,
    });

    const responsibleAi = sections.find(
      (section) => section.title === "Responsible AI And FAERS Limits",
    );
    const text = responsibleAi?.lines.join(" ");

    expect(text).toContain("Report schema validation: passed");
    expect(text).toContain("Medication-intake schema validation: passed");
    expect(text).toContain("Human confirmation before FAERS launch: required");
    expect(text).toContain("Medication intake provider: fallback");
    expect(text).toContain("Medication intake prompt: medication-label-intake-v1");
    expect(text).toContain("Report provider: template");
    expect(text).toContain("Report prompt: faers-safety-report-v2");
    expect(text).toContain("FAERS limitation: cannot establish incidence or causality");
  });

  it("keeps optional advanced sections explicit when they are not available", () => {
    const sections = buildPdfReportSections({ analysis, report });

    expect(sections.find((section) => section.title === "Signal Metrics")?.lines).toEqual([
      "No PRR/ROR signal analysis has been run for this report.",
    ]);
    expect(
      sections.find((section) => section.title === "Drug Comparison")?.lines,
    ).toEqual(["No drug-vs-drug comparison has been run for this report."]);
  });

  it("does not attach stale medication-intake evidence to a different drug report", () => {
    const sections = buildPdfReportSections({
      analysis: {
        ...analysis,
        drug: "warfarin",
      },
      report,
      intake,
    });

    const responsibleAi = sections.find(
      (section) => section.title === "Responsible AI And FAERS Limits",
    );
    const text = responsibleAi?.lines.join(" ");

    expect(text).toContain("Medication-intake schema validation: not applicable");
    expect(text).toContain("Medication intake provider: not used");
    expect(text).not.toContain("Medication intake provider: fallback");
  });
});
