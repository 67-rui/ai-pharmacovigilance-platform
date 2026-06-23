import { analyzeSignal } from "./signal";
import type { DrugComparison, SignalAnalysis } from "./types";

function roundMetric(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function eventShare(signal: SignalAnalysis) {
  const totalDrugReports =
    signal.table.drugAndEvent + signal.table.drugAndOtherEvents;

  if (totalDrugReports <= 0) {
    return null;
  }

  return roundMetric((signal.table.drugAndEvent / totalDrugReports) * 1000);
}

function rowFromSignal(
  signal: SignalAnalysis,
  role: "primary" | "comparator",
): DrugComparison["rows"][number] {
  return {
    drug: signal.drug,
    role,
    totalDrugReports: signal.table.drugAndEvent + signal.table.drugAndOtherEvents,
    eventReports: signal.table.drugAndEvent,
    otherEventReports: signal.table.drugAndOtherEvents,
    eventSharePerThousand: eventShare(signal),
    prr: signal.metrics.prr,
    ror: signal.metrics.ror,
    rorLower95: signal.metrics.rorLower95,
    rorUpper95: signal.metrics.rorUpper95,
    interpretationLabel: signal.interpretation.label,
  };
}

function buildSummary(
  primary: DrugComparison["rows"][number],
  comparator: DrugComparison["rows"][number],
) {
  if (
    primary.eventSharePerThousand === null ||
    comparator.eventSharePerThousand === null
  ) {
    return {
      higherEventShareDrug: null,
      eventShareRatio: null,
      summary:
        "One or both drugs have insufficient FAERS report volume for event-share comparison.",
    };
  }

  if (primary.eventSharePerThousand === comparator.eventSharePerThousand) {
    return {
      higherEventShareDrug: null,
      eventShareRatio: 1,
      summary:
        "Both drugs have the same event reporting share per 1,000 matched FAERS reports in this query.",
    };
  }

  const higher =
    primary.eventSharePerThousand > comparator.eventSharePerThousand
      ? primary
      : comparator;
  const lower = higher === primary ? comparator : primary;
  const higherShare = higher.eventSharePerThousand;
  const lowerShare = lower.eventSharePerThousand;
  if (higherShare === null || lowerShare === null) {
    return {
      higherEventShareDrug: null,
      eventShareRatio: null,
      summary:
        "One or both drugs have insufficient FAERS report volume for event-share comparison.",
    };
  }

  const ratio = roundMetric(higherShare / lowerShare);

  return {
    higherEventShareDrug: higher.drug,
    eventShareRatio: ratio,
    summary: `${higher.drug} has the higher event reporting share for this MedDRA term in FAERS. This is a reporting-share comparison, not a clinical risk comparison.`,
  };
}

export async function compareDrugs(
  primaryDrug: string,
  comparatorDrug: string,
  event: string,
): Promise<DrugComparison> {
  const [primarySignal, comparatorSignal] = await Promise.all([
    analyzeSignal(primaryDrug, event),
    analyzeSignal(comparatorDrug, event),
  ]);

  const primary = rowFromSignal(primarySignal, "primary");
  const comparator = rowFromSignal(comparatorSignal, "comparator");

  return {
    primaryDrug: primarySignal.drug,
    comparatorDrug: comparatorSignal.drug,
    event: primarySignal.event,
    generatedAt: new Date().toISOString(),
    rows: [primary, comparator],
    comparison: buildSummary(primary, comparator),
    assumptions: [
      "Comparison uses FAERS report shares per 1,000 suspect-drug reports.",
      "Both drugs use the same MedDRA preferred-term event query.",
      "PRR and ROR are computed independently for each drug against the FAERS background.",
      "Higher event share does not mean higher real-world clinical risk or causality.",
    ],
  };
}
