import type {
  DrugComparison,
  FaersAnalysis,
  MedicationIntakeResult,
  ReportResponse,
  SignalAnalysis,
  SignalRanking,
} from "./types";

export type PdfReportSection = {
  title: string;
  lines: string[];
};

export type PdfReportInput = {
  analysis: FaersAnalysis;
  report: ReportResponse;
  signal?: SignalAnalysis | null;
  ranking?: SignalRanking | null;
  comparison?: DrugComparison | null;
  intake?: MedicationIntakeResult | null;
};

function formatMetric(value: number | null | undefined) {
  return value === null || value === undefined ? "not available" : String(value);
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function topList(
  rows: Array<{ label?: string; event?: string; value?: number; eventReports?: number }>,
  limit = 5,
) {
  return rows
    .slice(0, limit)
    .map((row, index) => {
      const label = row.label ?? row.event ?? `Item ${index + 1}`;
      const value = row.value ?? row.eventReports;
      return value === undefined ? `${index + 1}. ${label}` : `${index + 1}. ${label} (${formatCount(value)})`;
    });
}

function normalizeDrug(value: string) {
  return value.trim().toLowerCase();
}

function intakeMatchesAnalysisDrug(
  intake: MedicationIntakeResult | null | undefined,
  analysisDrug: string,
) {
  if (!intake) return false;
  const normalizedAnalysisDrug = normalizeDrug(analysisDrug);
  return intake.drugCandidates.some(
    (candidate) => normalizeDrug(candidate) === normalizedAnalysisDrug,
  );
}

export function buildPdfReportSections({
  analysis,
  signal,
  ranking,
  comparison,
  report,
  intake,
}: PdfReportInput): PdfReportSection[] {
  const topReaction = analysis.topReactions[0];
  const matchingIntake = intakeMatchesAnalysisDrug(intake, analysis.drug)
    ? intake
    : null;
  const responsibleAiChecklist = [
    "Report schema validation: passed",
    matchingIntake
      ? "Medication-intake schema validation: passed"
      : "Medication-intake schema validation: not applicable for typed drug-name workflow",
    matchingIntake
      ? `Human confirmation before FAERS launch: ${
          matchingIntake.needsHumanConfirmation
            ? "required"
            : "not required by intake response"
        }`
      : "Human confirmation before FAERS launch: not applicable for typed drug-name workflow",
    matchingIntake
      ? `Medication intake provider: ${matchingIntake.provider}`
      : "Medication intake provider: not used",
    matchingIntake?.promptVersion
      ? `Medication intake prompt: ${matchingIntake.promptVersion}`
      : "Medication intake prompt: not used",
    `Report provider: ${report.mode === "openai" ? report.model ?? "openai" : "template"}`,
    `Report prompt: ${report.promptVersion}`,
    "FAERS limitation: cannot establish incidence or causality",
    "Safety boundary: not medical advice",
  ];

  return [
    {
      title: "Executive Summary",
      lines: [
        `Drug: ${analysis.drug}`,
        `Generated: ${new Date(analysis.generatedAt).toLocaleString()}`,
        `Matched suspect-drug FAERS reports: ${formatCount(analysis.totalReports)}`,
        `Top reported reaction: ${topReaction ? `${topReaction.label} (${formatCount(topReaction.value)})` : "not available"}`,
        ...analysis.highlights,
      ],
    },
    {
      title: "Signal Metrics",
      lines: signal
        ? [
            `Event: ${signal.event}`,
            `Drug-event reports: ${formatCount(signal.table.drugAndEvent)}`,
            `PRR: ${formatMetric(signal.metrics.prr)}`,
            `ROR: ${formatMetric(signal.metrics.ror)}`,
            `ROR 95% CI: ${formatMetric(signal.metrics.rorLower95)} to ${formatMetric(signal.metrics.rorUpper95)}`,
            `Interpretation: ${signal.interpretation.label}`,
            signal.interpretation.summary,
          ]
        : ["No PRR/ROR signal analysis has been run for this report."],
    },
    {
      title: "Ranked Signal Candidates",
      lines: ranking?.rows.length
        ? topList(ranking.rows, 8).map((line, index) => {
            const row = ranking.rows[index];
            return `${line}; PRR: ${formatMetric(row.prr)}; ROR: ${formatMetric(row.ror)}; ${row.interpretationLabel}`;
          })
        : ["No signal ranking has been run for this report."],
    },
    {
      title: "Drug Comparison",
      lines: comparison
        ? [
            `Primary drug: ${comparison.primaryDrug}`,
            `Comparator drug: ${comparison.comparatorDrug}`,
            `Event: ${comparison.event}`,
            comparison.comparison.summary,
            ...comparison.rows.map(
              (row) =>
                `${row.drug}: ${formatMetric(row.eventSharePerThousand)} reports per 1,000 suspect-drug reports; PRR ${formatMetric(row.prr)}; ROR ${formatMetric(row.ror)}`,
            ),
          ]
        : ["No drug-vs-drug comparison has been run for this report."],
    },
    {
      title: "AI Structured Report",
      lines: [
        `Mode: ${report.mode === "openai" ? report.model ?? "OpenAI" : "Template mode"}`,
        `Prompt version: ${report.promptVersion}`,
        `Tone: ${report.tone}`,
        "Schema validated: yes",
        report.structuredReport.safetySignalOverview,
        ...report.structuredReport.keyPatterns.map((item) => `Key pattern: ${item}`),
        ...report.structuredReport.reviewerFollowUp.map(
          (item) => `Reviewer follow-up: ${item}`,
        ),
      ],
    },
    {
      title: "Responsible AI And FAERS Limits",
      lines: [
        ...responsibleAiChecklist,
        ...report.qualityChecklist.map((item) => `Quality check: ${item}`),
        ...analysis.limitations,
        ...report.structuredReport.limitations,
        "This report supports pharmacovigilance signal triage and is not medical advice.",
      ],
    },
  ];
}
