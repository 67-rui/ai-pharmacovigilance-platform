import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { SignalAnalysis } from "@/lib/types";
import { analyzeSignal } from "../../../lib/signal";

vi.mock("../../../lib/signal", () => ({
  analyzeSignal: vi.fn(),
}));

const analyzeSignalMock = vi.mocked(analyzeSignal);

function signal(event: string, eventReports: number): SignalAnalysis {
  return {
    drug: "metformin",
    event,
    generatedAt: "2026-06-23T00:00:00.000Z",
    table: {
      drugAndEvent: eventReports,
      drugAndOtherEvents: 1000,
      otherDrugsAndEvent: 2000,
      otherDrugsAndOtherEvents: 100000,
    },
    metrics: {
      prr: eventReports > 100 ? 3.1 : 1.4,
      ror: eventReports > 100 ? 3.4 : 1.5,
      rorLower95: null,
      rorUpper95: null,
    },
    interpretation: {
      label: eventReports > 100 ? "signal-elevated" : "signal-watch",
      summary: event,
    },
    assumptions: [],
    source: {
      endpoint: "https://api.fda.gov/drug/event.json",
      queries: [],
    },
  };
}

describe("GET /api/rankings", () => {
  it("returns ranked signal rows for repeated event parameters", async () => {
    analyzeSignalMock
      .mockResolvedValueOnce(signal("HEADACHE", 40))
      .mockResolvedValueOnce(signal("NAUSEA", 180));

    const response = await GET(
      new Request(
        "http://localhost/api/rankings?drug=metformin&event=HEADACHE&event=NAUSEA",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      drug: "metformin",
      rows: [
        {
          event: "NAUSEA",
          eventReports: 180,
          interpretationLabel: "signal-elevated",
        },
        {
          event: "HEADACHE",
          eventReports: 40,
          interpretationLabel: "signal-watch",
        },
      ],
    });
    expect(analyzeSignalMock).toHaveBeenCalledWith("metformin", "HEADACHE");
    expect(analyzeSignalMock).toHaveBeenCalledWith("metformin", "NAUSEA");
  });
});
