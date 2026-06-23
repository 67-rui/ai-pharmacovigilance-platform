import { describe, expect, it } from "vitest";
import { buildSignalRanking } from "./ranking";
import type { SignalAnalysis } from "./types";

function signal(
  event: string,
  drugAndEvent: number,
  prr: number | null,
  ror: number | null,
  label: SignalAnalysis["interpretation"]["label"],
): SignalAnalysis {
  return {
    drug: "metformin",
    event,
    generatedAt: "2026-06-23T00:00:00.000Z",
    table: {
      drugAndEvent,
      drugAndOtherEvents: 1000,
      otherDrugsAndEvent: 2000,
      otherDrugsAndOtherEvents: 100000,
    },
    metrics: {
      prr,
      ror,
      rorLower95: null,
      rorUpper95: null,
    },
    interpretation: {
      label,
      summary: label,
    },
    assumptions: [],
    source: {
      endpoint: "https://api.fda.gov/drug/event.json",
      queries: [],
    },
  };
}

describe("buildSignalRanking", () => {
  it("sorts elevated and higher-volume drug-event signals first", () => {
    const ranking = buildSignalRanking("metformin", [
      signal("HEADACHE", 80, 1.2, 1.4, "signal-watch"),
      signal("LACTIC ACIDOSIS", 12, 4.5, 5.1, "signal-elevated"),
      signal("NAUSEA", 200, 2.8, 3.2, "signal-elevated"),
    ]);

    expect(ranking.rows.map((row) => row.event)).toEqual([
      "NAUSEA",
      "LACTIC ACIDOSIS",
      "HEADACHE",
    ]);
    expect(ranking.rows[0]).toMatchObject({
      event: "NAUSEA",
      eventReports: 200,
      prr: 2.8,
      ror: 3.2,
      interpretationLabel: "signal-elevated",
    });
  });
});
