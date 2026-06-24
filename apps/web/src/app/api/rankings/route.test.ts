import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import type { SignalAnalysis } from "@/lib/types";
import { analyzeSignal } from "../../../lib/signal";
import { resetPublicDemoRateLimits } from "../../../lib/publicDemoRateLimit";

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
  afterEach(() => {
    resetPublicDemoRateLimits();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

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

  it("returns 429 before computing rankings when the public demo limit is reached", async () => {
    vi.stubEnv("PUBLIC_DEMO_RANKINGS_RATE_LIMIT", "1");
    vi.stubEnv("PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS", "60000");
    analyzeSignalMock.mockResolvedValue(signal("NAUSEA", 180));
    const headers = { "x-forwarded-for": "203.0.113.80" };

    const firstResponse = await GET(
      new Request(
        "http://localhost/api/rankings?drug=metformin&event=NAUSEA",
        { headers },
      ),
    );
    const callsAfterFirstRequest = analyzeSignalMock.mock.calls.length;
    const limitedResponse = await GET(
      new Request(
        "http://localhost/api/rankings?drug=metformin&event=NAUSEA",
        { headers },
      ),
    );

    expect(firstResponse.status).toBe(200);
    expect(limitedResponse.status).toBe(429);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "Public demo rate limit reached for signal ranking.",
    });
    expect(analyzeSignalMock.mock.calls.length).toBe(callsAfterFirstRequest);
  });
});
