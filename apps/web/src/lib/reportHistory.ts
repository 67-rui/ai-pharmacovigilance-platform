import type { FaersAnalysis, ReportResponse } from "./types";

export const REPORT_HISTORY_STORAGE_KEY = "ai-pv-report-history-v1";
export const MAX_REPORT_HISTORY_ENTRIES = 8;

export type ReportHistoryEntry = {
  id: string;
  savedAt: string;
  drug: string;
  topReaction: string;
  totalReports: number;
  reportTitle: string;
  promptVersion: string;
  mode: ReportResponse["mode"];
  workflowUrl: string;
};

function normalizeDrug(value: string) {
  return value.trim().toLowerCase();
}

function entryId(drug: string, savedAt: string) {
  return `${normalizeDrug(drug).replace(/[^a-z0-9]+/g, "-")}-${savedAt}`;
}

export function buildReportHistoryEntry(
  analysis: FaersAnalysis,
  report: ReportResponse,
  options: { savedAt: string; workflowUrl: string },
): ReportHistoryEntry {
  return {
    id: entryId(analysis.drug, options.savedAt),
    savedAt: options.savedAt,
    drug: analysis.drug,
    topReaction: analysis.topReactions[0]?.label ?? "Not available",
    totalReports: analysis.totalReports,
    reportTitle: report.structuredReport.title,
    promptVersion: report.promptVersion,
    mode: report.mode,
    workflowUrl: options.workflowUrl,
  };
}

export function addReportHistoryEntry(
  entries: ReportHistoryEntry[],
  entry: ReportHistoryEntry,
  maxEntries = MAX_REPORT_HISTORY_ENTRIES,
) {
  const nextEntries = entries.filter(
    (item) => normalizeDrug(item.drug) !== normalizeDrug(entry.drug),
  );

  return [entry, ...nextEntries].slice(0, maxEntries);
}
