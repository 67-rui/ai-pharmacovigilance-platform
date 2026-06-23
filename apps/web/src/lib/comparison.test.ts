import { describe, expect, it } from "vitest";
import { buildComparisonSummary } from "./comparison";
import type { DrugComparison } from "./types";

function row(
  drug: string,
  eventSharePerThousand: number | null,
): DrugComparison["rows"][number] {
  return {
    drug,
    role: drug === "primary" ? "primary" : "comparator",
    totalDrugReports: 100,
    eventReports: 0,
    otherEventReports: 100,
    eventSharePerThousand,
    prr: null,
    ror: null,
    rorLower95: null,
    rorUpper95: null,
    interpretationLabel: "insufficient-data",
  };
}

describe("buildComparisonSummary", () => {
  it("does not divide by zero when the lower event share is zero", () => {
    const summary = buildComparisonSummary(row("primary", 2.5), row("comparator", 0));

    expect(summary.higherEventShareDrug).toBe("primary");
    expect(summary.eventShareRatio).toBeNull();
    expect(summary.summary).toContain("zero event reporting share");
  });
});
