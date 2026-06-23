import type { SignalAnalysis, SignalRanking } from "./types";

const interpretationRank: Record<SignalAnalysis["interpretation"]["label"], number> = {
  "signal-elevated": 3,
  "signal-watch": 2,
  "insufficient-data": 1,
};

function metricValue(value: number | null) {
  return value ?? Number.NEGATIVE_INFINITY;
}

export function buildSignalRanking(
  drug: string,
  signals: SignalAnalysis[],
): SignalRanking {
  const rows = signals
    .map((signal) => ({
      event: signal.event,
      eventReports: signal.table.drugAndEvent,
      prr: signal.metrics.prr,
      ror: signal.metrics.ror,
      rorLower95: signal.metrics.rorLower95,
      rorUpper95: signal.metrics.rorUpper95,
      interpretationLabel: signal.interpretation.label,
      interpretationSummary: signal.interpretation.summary,
    }))
    .sort((left, right) => {
      const interpretationDelta =
        interpretationRank[right.interpretationLabel] -
        interpretationRank[left.interpretationLabel];

      if (interpretationDelta !== 0) return interpretationDelta;
      if (right.eventReports !== left.eventReports) {
        return right.eventReports - left.eventReports;
      }

      const prrDelta = metricValue(right.prr) - metricValue(left.prr);
      if (prrDelta !== 0) return prrDelta;

      return metricValue(right.ror) - metricValue(left.ror);
    });

  return {
    drug,
    generatedAt: new Date().toISOString(),
    rows,
    assumptions: [
      "Ranking is computed from the selected drug's top reported MedDRA preferred terms.",
      "Rows are ordered by interpretation class, drug-event report count, PRR, and ROR.",
      "PRR and ROR are disproportionality metrics for signal triage; they do not estimate incidence or prove causality.",
      "The ranking is a reviewer prioritization aid, not a regulatory decision rule.",
    ],
  };
}
