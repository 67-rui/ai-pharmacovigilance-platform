import { describe, expect, test } from "vitest";

import {
  buildApiSmokeUrls,
  resolveApiSmokeOptions,
  runApiSmoke,
} from "./smoke-test-local-api.mjs";

function jsonResponse(body, init = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    async json() {
      return body;
    },
  };
}

describe("local API smoke-test helpers", () => {
  test("defaults to localhost:3001", () => {
    const options = resolveApiSmokeOptions([], {});

    expect(options.baseUrl).toBe("http://localhost:3001");
    expect(options.drug).toBe("metformin");
    expect(options.event).toBe("NAUSEA");
    expect(options.comparator).toBe("warfarin");
  });

  test("normalizes explicit base URL and encodes query URLs", () => {
    const urls = buildApiSmokeUrls(
      "http://localhost:3001///",
      "metformin hydrochloride",
      "blood glucose increased",
      "warfarin sodium",
    );

    expect(urls).toEqual({
      homeUrl: "http://localhost:3001/",
      faersUrl:
        "http://localhost:3001/api/faers?drug=metformin+hydrochloride",
      signalUrl:
        "http://localhost:3001/api/signal?drug=metformin+hydrochloride&event=blood+glucose+increased",
      compareUrl:
        "http://localhost:3001/api/compare?primary=metformin+hydrochloride&comparator=warfarin+sodium&event=blood+glucose+increased",
      reportUrl: "http://localhost:3001/api/report",
      intakeUrl: "http://localhost:3001/api/intake/medication",
    });
  });

  test("checks the local reviewer API workflow", async () => {
    const seenUrls = [];
    const fetchImpl = async (url, init = {}) => {
      seenUrls.push(`${init.method ?? "GET"} ${String(url)}`);

      if (String(url).endsWith("/")) {
        return { ok: true, status: 200 };
      }

      if (String(url).includes("/api/faers")) {
        return jsonResponse({
          drug: "metformin",
          totalReports: 1234,
          source: {
            endpoint: "https://api.fda.gov/drug/event.json",
            search: "patient.drug.medicinalproduct:metformin",
          },
          topReactions: [{ label: "NAUSEA", value: 120 }],
          limitations: [
            "FAERS reports cannot establish incidence, prevalence, or causality.",
          ],
        });
      }

      if (String(url).includes("/api/signal")) {
        return jsonResponse({
          drug: "metformin",
          event: "NAUSEA",
          interpretation: {
            label: "signal-watch",
            summary: "Reporting signal for review.",
          },
        });
      }

      if (String(url).includes("/api/compare")) {
        return jsonResponse({
          primaryDrug: "metformin",
          comparatorDrug: "warfarin",
          event: "NAUSEA",
          rows: [
            {
              drug: "metformin",
              role: "primary",
              totalDrugReports: 1234,
              eventReports: 120,
            },
            {
              drug: "warfarin",
              role: "comparator",
              totalDrugReports: 2345,
              eventReports: 90,
            },
          ],
          comparison: {
            summary: "Reporting-share comparison.",
          },
        });
      }

      if (String(url).includes("/api/report")) {
        expect(init.method).toBe("POST");
        expect(JSON.parse(String(init.body)).tone).toBe("portfolio-summary");
        return jsonResponse({
          mode: "template",
          structuredReport: {
            title: "metformin FAERS Portfolio Summary",
            safetySignalOverview: "Schema-valid report.",
            keyPatterns: ["NAUSEA was frequently reported."],
            reviewerFollowUp: ["Review chronology."],
            limitations: ["FAERS cannot establish causality."],
            qualityChecks: ["No causal claims from FAERS report counts."],
          },
          qualityChecklist: ["No causal claims from FAERS report counts."],
        });
      }

      return jsonResponse({
        drug: "metformin",
        provider: "fallback",
        drugCandidates: ["Metformin"],
        needsHumanConfirmation: true,
        confidence: "medium",
      });
    };

    const summary = await runApiSmoke({
      baseUrl: "http://localhost:3001",
      drug: "metformin",
      event: "NAUSEA",
      comparator: "warfarin",
      fetchImpl,
      log: () => {},
    });

    expect(seenUrls).toEqual([
      "HEAD http://localhost:3001/",
      "GET http://localhost:3001/api/faers?drug=metformin",
      "GET http://localhost:3001/api/signal?drug=metformin&event=NAUSEA",
      "GET http://localhost:3001/api/compare?primary=metformin&comparator=warfarin&event=NAUSEA",
      "POST http://localhost:3001/api/report",
      "POST http://localhost:3001/api/intake/medication",
    ]);
    expect(summary).toEqual({
      baseUrl: "http://localhost:3001",
      drug: "metformin",
      event: "NAUSEA",
      comparator: "warfarin",
      totalReports: 1234,
      signalLabel: "signal-watch",
      comparisonRows: 2,
      reportMode: "template",
      intakeProvider: "fallback",
      needsHumanConfirmation: true,
    });
  });

  test("rejects invalid FAERS payloads", async () => {
    await expect(
      runApiSmoke({
        baseUrl: "http://localhost:3001",
        drug: "metformin",
        event: "NAUSEA",
        comparator: "warfarin",
        fetchImpl: async (url) => {
          if (String(url).endsWith("/")) {
            return { ok: true, status: 200 };
          }

          return jsonResponse({ drug: "metformin", totalReports: 0 });
        },
        log: () => {},
      }),
    ).rejects.toThrow("FAERS payload must include a positive totalReports");
  });
});
