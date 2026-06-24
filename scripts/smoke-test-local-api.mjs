#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://localhost:3001";
const DEFAULT_DRUG = "metformin";
const DEFAULT_EVENT = "NAUSEA";
const DEFAULT_COMPARATOR = "warfarin";
const SAMPLE_LABEL_TEXT =
  "Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea. Contraindications: severe renal impairment.";

function normalizeBaseUrl(rawUrl) {
  const value = String(rawUrl ?? "").trim() || DEFAULT_BASE_URL;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid API smoke URL: ${value}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`API smoke URL must use http or https: ${value}`);
  }

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path === "" ? "" : path}`;
}

export function resolveApiSmokeOptions(argv = process.argv.slice(2), env = process.env) {
  let positionalUrl;
  let drug = env.API_SMOKE_DRUG || DEFAULT_DRUG;
  let event = env.API_SMOKE_EVENT || DEFAULT_EVENT;
  let comparator = env.API_SMOKE_COMPARATOR || DEFAULT_COMPARATOR;

  for (const arg of argv) {
    if (arg.startsWith("--drug=")) {
      drug = arg.slice("--drug=".length).trim() || DEFAULT_DRUG;
    } else if (arg.startsWith("--event=")) {
      event = arg.slice("--event=".length).trim() || DEFAULT_EVENT;
    } else if (arg.startsWith("--comparator=")) {
      comparator = arg.slice("--comparator=".length).trim() || DEFAULT_COMPARATOR;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!positionalUrl) {
      positionalUrl = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }

  return {
    baseUrl: normalizeBaseUrl(positionalUrl || env.API_SMOKE_URL),
    drug,
    event,
    comparator,
  };
}

export function buildApiSmokeUrls(baseUrl, drug, event, comparator = DEFAULT_COMPARATOR) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const homeUrl = new URL("/", normalizedBaseUrl);
  const faersUrl = new URL("/api/faers", normalizedBaseUrl);
  faersUrl.searchParams.set("drug", drug);

  const signalUrl = new URL("/api/signal", normalizedBaseUrl);
  signalUrl.searchParams.set("drug", drug);
  signalUrl.searchParams.set("event", event);

  const compareUrl = new URL("/api/compare", normalizedBaseUrl);
  compareUrl.searchParams.set("primary", drug);
  compareUrl.searchParams.set("comparator", comparator);
  compareUrl.searchParams.set("event", event);

  const reportUrl = new URL("/api/report", normalizedBaseUrl);
  const intakeUrl = new URL("/api/intake/medication", normalizedBaseUrl);

  return {
    homeUrl: homeUrl.toString(),
    faersUrl: faersUrl.toString(),
    signalUrl: signalUrl.toString(),
    compareUrl: compareUrl.toString(),
    reportUrl: reportUrl.toString(),
    intakeUrl: intakeUrl.toString(),
  };
}

async function assertOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}.`);
  }
}

function assertFaersPayload(payload) {
  if (!Number.isFinite(payload?.totalReports) || payload.totalReports <= 0) {
    throw new Error("FAERS payload must include a positive totalReports value.");
  }

  if (typeof payload?.source?.endpoint !== "string") {
    throw new Error("FAERS payload must include source.endpoint.");
  }
}

function assertSignalPayload(payload) {
  if (typeof payload?.interpretation?.label !== "string") {
    throw new Error("Signal payload must include interpretation.label.");
  }
}

function assertComparisonPayload(payload) {
  if (!Array.isArray(payload?.rows) || payload.rows.length < 2) {
    throw new Error("Comparison payload must include at least two comparison rows.");
  }
}

function assertReportPayload(payload) {
  if (typeof payload?.structuredReport?.title !== "string") {
    throw new Error("Report payload must include structuredReport.title.");
  }

  if (!Array.isArray(payload?.qualityChecklist)) {
    throw new Error("Report payload must include qualityChecklist.");
  }
}

function assertIntakePayload(payload) {
  if (!Array.isArray(payload?.drugCandidates) || payload.drugCandidates.length === 0) {
    throw new Error("Medication intake payload must include drugCandidates.");
  }

  if (payload.needsHumanConfirmation !== true) {
    throw new Error("Medication intake payload must require human confirmation.");
  }
}

export async function runApiSmoke({
  baseUrl,
  drug,
  event,
  comparator,
  fetchImpl = globalThis.fetch,
  log = console.log,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const urls = buildApiSmokeUrls(baseUrl, drug, event, comparator);

  log(`Checking homepage: ${urls.homeUrl}`);
  await assertOk(await fetchImpl(urls.homeUrl, { method: "HEAD" }), "Homepage");

  log(`Checking FAERS API: ${urls.faersUrl}`);
  const faersResponse = await fetchImpl(urls.faersUrl);
  await assertOk(faersResponse, "FAERS API");
  const faersPayload = await faersResponse.json();
  assertFaersPayload(faersPayload);

  log(`Checking signal API: ${urls.signalUrl}`);
  const signalResponse = await fetchImpl(urls.signalUrl);
  await assertOk(signalResponse, "Signal API");
  const signalPayload = await signalResponse.json();
  assertSignalPayload(signalPayload);

  log(`Checking comparison API: ${urls.compareUrl}`);
  const comparisonResponse = await fetchImpl(urls.compareUrl);
  await assertOk(comparisonResponse, "Comparison API");
  const comparisonPayload = await comparisonResponse.json();
  assertComparisonPayload(comparisonPayload);

  log(`Checking report API: ${urls.reportUrl}`);
  const reportResponse = await fetchImpl(urls.reportUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis: faersPayload,
      tone: "portfolio-summary",
    }),
  });
  await assertOk(reportResponse, "Report API");
  const reportPayload = await reportResponse.json();
  assertReportPayload(reportPayload);

  log(`Checking medication intake API: ${urls.intakeUrl}`);
  const intakeResponse = await fetchImpl(urls.intakeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ocrText: SAMPLE_LABEL_TEXT,
      fileName: "metformin-label-smoke.txt",
    }),
  });
  await assertOk(intakeResponse, "Medication intake API");
  const intakePayload = await intakeResponse.json();
  assertIntakePayload(intakePayload);

  const summary = {
    baseUrl: normalizeBaseUrl(baseUrl),
    drug,
    event,
    comparator,
    totalReports: faersPayload.totalReports,
    signalLabel: signalPayload.interpretation.label,
    comparisonRows: comparisonPayload.rows.length,
    reportMode: reportPayload.mode,
    intakeProvider: intakePayload.provider,
    needsHumanConfirmation: intakePayload.needsHumanConfirmation,
  };

  log(
    `Local API smoke passed: ${summary.drug}, ${summary.totalReports.toLocaleString()} FAERS reports, ${summary.event} = ${summary.signalLabel}, ${summary.comparator} comparison rows = ${summary.comparisonRows}, report = ${summary.reportMode}, intake = ${summary.intakeProvider} with human confirmation.`,
  );

  return summary;
}

async function main() {
  const options = resolveApiSmokeOptions();
  await runApiSmoke(options);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
