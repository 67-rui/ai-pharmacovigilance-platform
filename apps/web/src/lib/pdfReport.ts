import type {
  DrugComparison,
  FaersAnalysis,
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

export function buildPdfReportSections({
  analysis,
  signal,
  ranking,
  comparison,
  report,
}: PdfReportInput): PdfReportSection[] {
  const topReaction = analysis.topReactions[0];

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
        ...report.qualityChecklist.map((item) => `Quality check: ${item}`),
        ...analysis.limitations,
        ...report.structuredReport.limitations,
        "This report supports pharmacovigilance signal triage and is not medical advice.",
      ],
    },
  ];
}
