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
  });

  test("normalizes explicit base URL and encodes query URLs", () => {
    const urls = buildApiSmokeUrls(
      "http://localhost:3001///",
      "metformin hydrochloride",
      "blood glucose increased",
    );

    expect(urls).toEqual({
      homeUrl: "http://localhost:3001/",
      faersUrl:
        "http://localhost:3001/api/faers?drug=metformin+hydrochloride",
      signalUrl:
        "http://localhost:3001/api/signal?drug=metformin+hydrochloride&event=blood+glucose+increased",
    });
  });

  test("checks homepage, FAERS, and signal API responses", async () => {
    const seenUrls = [];
    const fetchImpl = async (url) => {
      seenUrls.push(String(url));

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
        });
      }

      return jsonResponse({
        drug: "metformin",
        event: "NAUSEA",
        interpretation: {
          label: "signal-watch",
          summary: "Reporting signal for review.",
        },
      });
    };

    const summary = await runApiSmoke({
      baseUrl: "http://localhost:3001",
      drug: "metformin",
      event: "NAUSEA",
      fetchImpl,
      log: () => {},
    });

    expect(seenUrls).toEqual([
      "http://localhost:3001/",
      "http://localhost:3001/api/faers?drug=metformin",
      "http://localhost:3001/api/signal?drug=metformin&event=NAUSEA",
    ]);
    expect(summary).toEqual({
      baseUrl: "http://localhost:3001",
      drug: "metformin",
      event: "NAUSEA",
      totalReports: 1234,
      signalLabel: "signal-watch",
    });
  });

  test("rejects invalid FAERS payloads", async () => {
    await expect(
      runApiSmoke({
        baseUrl: "http://localhost:3001",
        drug: "metformin",
        event: "NAUSEA",
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
