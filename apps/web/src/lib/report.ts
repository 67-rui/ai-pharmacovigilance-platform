import { z } from "zod";
import type { FaersAnalysis, StructuredReport } from "./types";

export const REPORT_PROMPT_VERSION = "faers-safety-report-v2";

export const REPORT_QUALITY_CHECKLIST = [
  "No causal claims from FAERS report counts.",
  "No incidence, prevalence, or true-risk estimates.",
  "FAERS limitations are stated explicitly.",
  "Reviewer follow-up questions are included.",
  "Signal language is framed as hypothesis generation.",
];

export const structuredReportSchema = z.object({
  title: z.string().min(5).max(160),
  safetySignalOverview: z.string().min(20).max(1200),
  keyPatterns: z.array(z.string().min(5).max(500)).min(1).max(8),
  reviewerFollowUp: z.array(z.string().min(5).max(500)).min(1).max(8),
  limitations: z.array(z.string().min(5).max(500)).min(1).max(8),
  qualityChecks: z.array(z.string().min(5).max(240)).min(1).max(8),
});

function listTop(items: { label: string; value: number }[], limit = 5) {
  return items
    .slice(0, limit)
    .map((item) => `${item.label} (${item.value.toLocaleString()})`)
    .join(", ");
}

export function buildTemplateStructuredReport(
  analysis: FaersAnalysis,
): StructuredReport {
  return {
    title: `${analysis.drug} FAERS Safety Summary`,
    safetySignalOverview: `${analysis.drug} matched ${analysis.totalReports.toLocaleString()} suspect-drug FAERS reports. These aggregate counts support signal triage and hypothesis generation, but they cannot establish incidence, prevalence, clinical risk, or causality.`,
    keyPatterns: [
      `Most frequently reported reactions: ${listTop(analysis.topReactions) || "not available"}.`,
      `Seriousness distribution: ${listTop(analysis.seriousness, 2) || "not available"}.`,
      `Serious outcome flags: ${listTop(analysis.seriousOutcomes) || "not available"}.`,
      `Sex distribution: ${listTop(analysis.sexDistribution, 3) || "not available"}.`,
      `Age distribution: ${listTop(analysis.ageDistribution, 7) || "not available"}.`,
    ],
    reviewerFollowUp: [
      "Review duplicate reports, co-medications, indication, dose, chronology, and dechallenge/rechallenge evidence before escalating a signal.",
      "Compare the drug-event pattern against class alternatives and background disease risk before forming a safety hypothesis.",
      "Use source query URLs to reproduce the aggregate counts and document any follow-up search refinements.",
    ],
    limitations: analysis.limitations.length
      ? analysis.limitations
      : [
          "FAERS reports cannot establish incidence, prevalence, or causality.",
          "Report counts may reflect under-reporting, duplicate reporting, stimulated reporting, missing values, and reporting bias.",
        ],
    qualityChecks: REPORT_QUALITY_CHECKLIST,
  };
}

export function structuredReportToMarkdown(report: StructuredReport) {
  return [
    `## ${report.title}`,
    "",
    "### Safety Signal Overview",
    report.safetySignalOverview,
    "",
    "### Key Patterns",
    ...report.keyPatterns.map((item) => `- ${item}`),
    "",
    "### Reviewer Follow-up",
    ...report.reviewerFollowUp.map((item) => `- ${item}`),
    "",
    "### Limitations",
    ...report.limitations.map((item) => `- ${item}`),
    "",
    "### Report Quality Checklist",
    ...report.qualityChecks.map((item) => `- ${item}`),
  ].join("\n");
}

export function parseStructuredReport(value: unknown): StructuredReport {
  return structuredReportSchema.parse(value);
}
