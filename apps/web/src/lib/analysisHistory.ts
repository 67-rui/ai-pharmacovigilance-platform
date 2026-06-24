import type { FaersAnalysis } from "./types";

export const ANALYSIS_HISTORY_STORAGE_KEY = "ai-pv-analysis-history-v1";
export const MAX_ANALYSIS_HISTORY_ENTRIES = 8;

export type AnalysisHistoryEntry = {
  id: string;
  savedAt: string;
  drug: string;
  topReaction: string;
  totalReports: number;
  generatedAt: string;
  workflowUrl: string;
  dataLastUpdated?: string;
  cacheStatus: "live" | "cached" | "unknown";
  cacheStrategy: string;
};

function normalizeDrug(value: string) {
  return value.trim().toLowerCase();
}

function entryId(drug: string, savedAt: string) {
  return `${normalizeDrug(drug).replace(/[^a-z0-9]+/g, "-")}-${savedAt}`;
}

export function buildAnalysisHistoryEntry(
  analysis: FaersAnalysis,
  options: { savedAt: string; workflowUrl: string },
): AnalysisHistoryEntry {
  return {
    id: entryId(analysis.drug, options.savedAt),
    savedAt: options.savedAt,
    drug: analysis.drug,
    topReaction: analysis.topReactions[0]?.label ?? "Not available",
    totalReports: analysis.totalReports,
    generatedAt: analysis.generatedAt,
    workflowUrl: options.workflowUrl,
    dataLastUpdated: analysis.source.dataFreshness?.lastUpdated,
    cacheStatus: analysis.source.dataFreshness?.status ?? "unknown",
    cacheStrategy: analysis.source.dataFreshness?.cacheStrategy ?? "not reported",
  };
}

export function addAnalysisHistoryEntry(
  entries: AnalysisHistoryEntry[],
  entry: AnalysisHistoryEntry,
  maxEntries = MAX_ANALYSIS_HISTORY_ENTRIES,
) {
  const nextEntries = entries.filter(
    (item) => normalizeDrug(item.drug) !== normalizeDrug(entry.drug),
  );

  return [entry, ...nextEntries].slice(0, maxEntries);
}
