#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://localhost:3001";
const DEFAULT_DRUG = "metformin";
const DEFAULT_EVENT = "NAUSEA";

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

  for (const arg of argv) {
    if (arg.startsWith("--drug=")) {
      drug = arg.slice("--drug=".length).trim() || DEFAULT_DRUG;
    } else if (arg.startsWith("--event=")) {
      event = arg.slice("--event=".length).trim() || DEFAULT_EVENT;
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
  };
}

export function buildApiSmokeUrls(baseUrl, drug, event) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const homeUrl = new URL("/", normalizedBaseUrl);
  const faersUrl = new URL("/api/faers", normalizedBaseUrl);
  faersUrl.searchParams.set("drug", drug);

  const signalUrl = new URL("/api/signal", normalizedBaseUrl);
  signalUrl.searchParams.set("drug", drug);
  signalUrl.searchParams.set("event", event);

  return {
    homeUrl: homeUrl.toString(),
    faersUrl: faersUrl.toString(),
    signalUrl: signalUrl.toString(),
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

export async function runApiSmoke({
  baseUrl,
  drug,
  event,
  fetchImpl = globalThis.fetch,
  log = console.log,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const urls = buildApiSmokeUrls(baseUrl, drug, event);

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

  const summary = {
    baseUrl: normalizeBaseUrl(baseUrl),
    drug,
    event,
    totalReports: faersPayload.totalReports,
    signalLabel: signalPayload.interpretation.label,
  };

  log(
    `Local API smoke passed: ${summary.drug}, ${summary.totalReports.toLocaleString()} FAERS reports, ${summary.event} = ${summary.signalLabel}.`,
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
