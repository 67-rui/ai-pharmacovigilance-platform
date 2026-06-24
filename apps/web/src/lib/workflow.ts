import type { FaersAnalysis } from "./types";

const MAX_WORKFLOW_RANKING_EVENTS = 6;

function normalizeDrug(value: string) {
  return value.trim().toLowerCase();
}

function fallbackComparator(drug: string) {
  return normalizeDrug(drug) === "warfarin" ? "metformin" : "warfarin";
}

export function buildWorkflowRequestPlan(
  analysis: FaersAnalysis,
  requestedComparator: string,
) {
  const defaultEvent = analysis.topReactions[0]?.label ?? "";
  const comparatorDrug =
    normalizeDrug(requestedComparator) &&
    normalizeDrug(requestedComparator) !== normalizeDrug(analysis.drug)
      ? requestedComparator.trim()
      : fallbackComparator(analysis.drug);
  const rankingEvents = analysis.topReactions
    .slice(0, MAX_WORKFLOW_RANKING_EVENTS)
    .map((event) => event.label)
    .filter(Boolean);

  return {
    defaultEvent,
    rankingEvents,
    comparatorDrug,
    canRunSignal: defaultEvent.length >= 2,
    canRunComparison: defaultEvent.length >= 2 && comparatorDrug.length >= 2,
    canRunRanking: rankingEvents.length > 0,
  };
}
