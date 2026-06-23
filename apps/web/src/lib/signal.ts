import { buildDrugSearch } from "./openfda";
import type { SignalAnalysis } from "./types";

const EVENT_ENDPOINT = "https://api.fda.gov/drug/event.json";

type OpenFdaResponse = {
  meta?: {
    results?: {
      total?: number;
    };
  };
};

function cleanValue(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function escapePhrase(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildEventSearch(event: string) {
  return `patient.reaction.reactionmeddrapt.exact:"${escapePhrase(cleanValue(event).toUpperCase())}"`;
}

function endpointUrl(params: Record<string, string | number>, includeKey = true) {
  const url = new URL(EVENT_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  if (includeKey && process.env.OPENFDA_API_KEY) {
    url.searchParams.set("api_key", process.env.OPENFDA_API_KEY);
  }

  return url;
}

function publicEndpointUrl(params: Record<string, string | number>) {
  return endpointUrl(params, false).toString();
}

async function fetchTotal(search?: string) {
  const params: Record<string, string | number> = {
    limit: 1,
  };

  if (search) {
    params.search = search;
  }

  const response = await fetch(endpointUrl(params), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return 0;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`openFDA signal request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OpenFdaResponse;
  return payload.meta?.results?.total ?? 0;
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator <= 0 || !Number.isFinite(denominator)) {
    return null;
  }

  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function roundMetric(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

export function calculateSignalMetrics(
  a: number,
  b: number,
  c: number,
  d: number,
) {
  const drugEventProportion = safeRatio(a, a + b);
  const backgroundEventProportion = safeRatio(c, c + d);
  const prr =
    drugEventProportion === null || backgroundEventProportion === null
      ? null
      : safeRatio(drugEventProportion, backgroundEventProportion);
  const ror = safeRatio(a * d, b * c);

  if (a <= 0 || b <= 0 || c <= 0 || d <= 0 || ror === null) {
    return {
      prr: roundMetric(prr),
      ror: roundMetric(ror),
      rorLower95: null,
      rorUpper95: null,
    };
  }

  const standardError = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const logRor = Math.log(ror);

  return {
    prr: roundMetric(prr),
    ror: roundMetric(ror),
    rorLower95: roundMetric(Math.exp(logRor - 1.96 * standardError)),
    rorUpper95: roundMetric(Math.exp(logRor + 1.96 * standardError)),
  };
}

export function classifySignal(
  a: number,
  prr: number | null,
  ror: number | null,
): SignalAnalysis["interpretation"] {
  if (a < 3 || prr === null || ror === null) {
    return {
      label: "insufficient-data",
      summary:
        "The drug-event cell count is too small for a stable disproportionality interpretation.",
    };
  }

  if (prr >= 2 && ror >= 2) {
    return {
      label: "signal-elevated",
      summary:
        "The event is reported disproportionately often with this drug in FAERS and should be reviewed as a signal hypothesis.",
    };
  }

  return {
    label: "signal-watch",
    summary:
      "The event has report volume, but disproportionality is below the elevated-signal threshold used in this demo.",
  };
}

function sourceQuery(
  label: string,
  purpose: string,
  params: Record<string, string | number>,
) {
  return {
    label,
    purpose,
    url: publicEndpointUrl(params),
  };
}

export async function analyzeSignal(
  drug: string,
  event: string,
): Promise<SignalAnalysis> {
  const normalizedDrug = cleanValue(drug);
  const normalizedEvent = cleanValue(event).toUpperCase();

  if (!normalizedDrug || !normalizedEvent) {
    throw new Error("Drug and event are required.");
  }

  const drugQuery = buildDrugSearch(normalizedDrug);
  const eventQuery = buildEventSearch(normalizedEvent);
  const drugEventQuery = `${drugQuery} AND ${eventQuery}`;

  const [allReports, drugReports, eventReports, drugEventReports] =
    await Promise.all([
      fetchTotal(),
      fetchTotal(drugQuery),
      fetchTotal(eventQuery),
      fetchTotal(drugEventQuery),
    ]);

  const a = drugEventReports;
  const b = Math.max(drugReports - drugEventReports, 0);
  const c = Math.max(eventReports - drugEventReports, 0);
  const d = Math.max(allReports - drugReports - eventReports + drugEventReports, 0);
  const metrics = calculateSignalMetrics(a, b, c, d);

  return {
    drug: normalizedDrug,
    event: normalizedEvent,
    generatedAt: new Date().toISOString(),
    table: {
      drugAndEvent: a,
      drugAndOtherEvents: b,
      otherDrugsAndEvent: c,
      otherDrugsAndOtherEvents: d,
    },
    metrics,
    interpretation: classifySignal(a, metrics.prr, metrics.ror),
    assumptions: [
      "The 2x2 table uses FAERS report counts, not patient-level incidence.",
      "The selected drug is treated as suspect by requiring patient.drug.drugcharacterization:1.",
      "The event is matched as a MedDRA preferred term through patient.reaction.reactionmeddrapt.exact.",
      "PRR and ROR are disproportionality signals; they do not prove causality or clinical risk.",
      "ROR confidence intervals are computed from the log ROR standard error when all four cells are greater than zero.",
    ],
    source: {
      endpoint: EVENT_ENDPOINT,
      queries: [
        sourceQuery("All FAERS reports", "Count all drug event reports in openFDA.", {
          limit: 1,
        }),
        sourceQuery("Drug reports", "Count suspect-drug reports for the selected drug.", {
          search: drugQuery,
          limit: 1,
        }),
        sourceQuery("Event reports", "Count reports containing the selected MedDRA preferred term.", {
          search: eventQuery,
          limit: 1,
        }),
        sourceQuery("Drug-event reports", "Count reports matching both the selected drug and event.", {
          search: drugEventQuery,
          limit: 1,
        }),
      ],
    },
  };
}
