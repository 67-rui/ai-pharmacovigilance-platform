import { z } from "zod";
import type { FaersAnalysis, ReportTone, StructuredReport } from "./types";

export const REPORT_PROMPT_VERSION = "faers-safety-report-v2";

export const reportToneSchema = z.enum([
  "pharmacist-review",
  "regulatory-briefing",
  "portfolio-summary",
]);

export const REPORT_TONE_OPTIONS: Record<
  ReportTone,
  { label: string; titleSuffix: string; instruction: string }
> = {
  "pharmacist-review": {
    label: "Pharmacist review",
    titleSuffix: "Pharmacist Review",
    instruction:
      "Write for a pharmacist reviewing patient-facing medication safety evidence and practical follow-up questions.",
  },
  "regulatory-briefing": {
    label: "Regulatory briefing",
    titleSuffix: "Regulatory Briefing",
    instruction:
      "Write for a drug safety reviewer preparing concise documentation, evidence traceability, and escalation considerations.",
  },
  "portfolio-summary": {
    label: "Portfolio summary",
    titleSuffix: "Portfolio Summary",
    instruction:
      "Write for a technical portfolio viewer, emphasizing AI workflow design, reproducibility, and responsible limitations.",
  },
};

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
  tone: ReportTone = "pharmacist-review",
): StructuredReport {
  const toneOption = REPORT_TONE_OPTIONS[tone];
  const reviewerFollowUp =
    tone === "regulatory-briefing"
      ? [
          "Document duplicate report handling, co-medication context, indication, chronology, and dechallenge/rechallenge evidence before escalation.",
          "Compare the drug-event pattern against class alternatives and background disease risk before forming a safety hypothesis.",
          "Use source query URLs to reproduce the aggregate counts and retain documentation for any follow-up search refinements.",
        ]
      : tone === "portfolio-summary"
        ? [
            "Explain how OCR or drug-name input routes into FAERS querying, signal metrics, comparison, and schema-validated report generation.",
            "Highlight that the workflow uses reproducible public data queries and explicit responsible-AI guardrails.",
            "Use source query URLs and exported artifacts to support portfolio review or technical interview discussion.",
          ]
        : [
            "Review duplicate reports, co-medications, indication, dose, chronology, and dechallenge/rechallenge evidence before escalating a signal.",
            "Compare the drug-event pattern against class alternatives and background disease risk before forming a safety hypothesis.",
            "Use source query URLs to reproduce the aggregate counts and document any follow-up search refinements.",
          ];

  return {
    title: `${analysis.drug} FAERS ${toneOption.titleSuffix}`,
    safetySignalOverview: `${analysis.drug} matched ${analysis.totalReports.toLocaleString()} suspect-drug FAERS reports. ${toneOption.instruction} These aggregate counts support signal triage and hypothesis generation, but they cannot establish incidence, prevalence, clinical risk, or causality.`,
    keyPatterns: [
      `Most frequently reported reactions: ${listTop(analysis.topReactions) || "not available"}.`,
      `Seriousness distribution: ${listTop(analysis.seriousness, 2) || "not available"}.`,
      `Serious outcome flags: ${listTop(analysis.seriousOutcomes) || "not available"}.`,
      `Sex distribution: ${listTop(analysis.sexDistribution, 3) || "not available"}.`,
      `Age distribution: ${listTop(analysis.ageDistribution, 7) || "not available"}.`,
    ],
    reviewerFollowUp,
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
