#!/usr/bin/env node

import { expect, chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";

const DEFAULT_DRUG = "metformin";
const DEFAULT_TIMEOUT_MS = 120_000;
const SAMPLE_LABEL_TEXT =
  "Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea. Contraindications: severe renal impairment.";

const analysisFixture = {
  drug: "metformin",
  generatedAt: "2026-06-24T10:00:00.000Z",
  totalReports: 3210,
  sampleSize: 3210,
  search: 'patient.drug.medicinalproduct:"METFORMIN"',
  topReactions: [
    { label: "NAUSEA", value: 120 },
    { label: "DIARRHOEA", value: 80 },
    { label: "VOMITING", value: 50 },
  ],
  seriousness: [
    { label: "Serious", value: 700 },
    { label: "Non-serious", value: 2510 },
  ],
  seriousOutcomes: [{ label: "Hospitalization", value: 44 }],
  sexDistribution: [
    { label: "Female", value: 1800 },
    { label: "Male", value: 1000 },
  ],
  ageDistribution: [
    { label: "18-44", value: 30 },
    { label: "65-74", value: 90 },
  ],
  yearTrend: [
    { label: "2025", value: 100 },
    { label: "2026", value: 120 },
  ],
  roleDistribution: [{ label: "Primary suspect", value: 3210 }],
  highlights: [
    "metformin has 3,210 suspect-drug FAERS matches.",
    "NAUSEA is the most frequently reported MedDRA preferred term.",
  ],
  limitations: [
    "FAERS reports cannot establish incidence, prevalence, or causality.",
  ],
  source: {
    name: "openFDA FAERS",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: "https://api.fda.gov/drug/event.json",
    search: 'patient.drug.medicinalproduct:"METFORMIN"',
    assumptions: ["Suspect drug search."],
    dataFreshness: {
      status: "live",
      lastUpdated: "2026-06-01",
      cacheStrategy: "no-store",
    },
    queries: [
      {
        label: "Top reactions",
        purpose: "Count MedDRA preferred terms.",
        url: "https://api.fda.gov/drug/event.json?search=metformin",
      },
    ],
  },
};

const signalFixture = {
  drug: "metformin",
  event: "NAUSEA",
  generatedAt: "2026-06-24T10:01:00.000Z",
  table: {
    drugAndEvent: 120,
    drugAndOtherEvents: 3090,
    otherDrugsAndEvent: 9500,
    otherDrugsAndOtherEvents: 150000,
  },
  metrics: {
    prr: 2.1,
    ror: 2.2,
    rorLower95: 2,
    rorUpper95: 2.4,
  },
  interpretation: {
    label: "signal-elevated",
    summary:
      "The event is reported disproportionately often with this drug in FAERS and should be reviewed as a signal hypothesis.",
  },
  assumptions: ["PRR and ROR are disproportionality metrics."],
  source: {
    endpoint: "https://api.fda.gov/drug/event.json",
    queries: [],
  },
};

const rankingFixture = {
  drug: "metformin",
  generatedAt: "2026-06-24T10:02:00.000Z",
  rows: [
    {
      event: "NAUSEA",
      eventReports: 120,
      prr: 2.1,
      ror: 2.2,
      rorLower95: 2,
      rorUpper95: 2.4,
      interpretationLabel: "signal-elevated",
      interpretationSummary: "Elevated signal hypothesis.",
    },
  ],
  assumptions: ["Rows are ordered by interpretation class."],
};

const comparisonFixture = {
  primaryDrug: "metformin",
  comparatorDrug: "warfarin",
  event: "NAUSEA",
  generatedAt: "2026-06-24T10:03:00.000Z",
  rows: [
    {
      drug: "metformin",
      role: "primary",
      totalDrugReports: 3210,
      eventReports: 120,
      otherEventReports: 3090,
      eventSharePerThousand: 37.383,
      prr: 2.1,
      ror: 2.2,
      rorLower95: 2,
      rorUpper95: 2.4,
      interpretationLabel: "signal-elevated",
    },
    {
      drug: "warfarin",
      role: "comparator",
      totalDrugReports: 5000,
      eventReports: 50,
      otherEventReports: 4950,
      eventSharePerThousand: 10,
      prr: 1.1,
      ror: 1.2,
      rorLower95: 1,
      rorUpper95: 1.4,
      interpretationLabel: "signal-watch",
    },
  ],
  comparison: {
    higherEventShareDrug: "metformin",
    eventShareRatio: 3.738,
    summary:
      "metformin has the higher event reporting share for this MedDRA term in FAERS. This is a reporting-share comparison, not a clinical risk comparison.",
  },
  assumptions: ["Comparison uses FAERS report shares per 1,000 reports."],
};

const reportFixture = {
  mode: "template",
  report:
    "## metformin FAERS Portfolio Summary\n\n### Safety Signal Overview\nSchema-valid report.",
  structuredReport: {
    title: "metformin FAERS Portfolio Summary",
    safetySignalOverview:
      "metformin matched 3,210 suspect-drug FAERS reports. These aggregate counts support signal triage and hypothesis generation, but they cannot establish incidence, prevalence, clinical risk, or causality.",
    keyPatterns: ["Most frequently reported reactions: NAUSEA (120)."],
    reviewerFollowUp: [
      "Review duplicate reports, co-medications, and chronology.",
    ],
    limitations: [
      "FAERS reports cannot establish incidence, prevalence, or causality.",
    ],
    qualityChecks: ["No causal claims from FAERS report counts."],
  },
  promptVersion: "faers-safety-report-v2",
  qualityChecklist: ["No causal claims from FAERS report counts."],
  tone: "portfolio-summary",
  warning: "OPENAI_API_KEY is not configured; generated a local template report.",
};

const intakeFixture = {
  provider: "fallback",
  drugCandidates: ["Metformin"],
  activeIngredients: ["Metformin hydrochloride"],
  strengths: ["500 mg"],
  dosageForm: "tablet",
  riskKeywords: ["adverse reactions", "renal impairment"],
  confidence: "medium",
  needsHumanConfirmation: true,
  extractedText: SAMPLE_LABEL_TEXT,
  promptVersion: "medication-label-intake-v1",
  warning: "DEEPSEEK_API_KEY is not configured; used local fallback extraction.",
  evidence: {
    sourceType: "ocr-text",
  },
  limitations: [
    "This intake result depends on OCR or user-provided label text and may miss or misread fields.",
  ],
};

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function normalizeBaseUrl(rawUrl) {
  const value = String(rawUrl ?? "").trim();

  if (!value) {
    throw new Error("Set DEMO_URL or pass a demo URL.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid demo URL: ${value}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Demo URL must use http or https: ${value}`);
  }

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path === "" ? "" : path}`;
}

function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

export function resolveSmokeOptions(argv = process.argv.slice(2), env = process.env) {
  let positionalUrl;
  let mockApis = parseBoolean(env.SMOKE_MOCK_APIS);
  let headed = parseBoolean(env.SMOKE_HEADED);
  let timeoutMs = env.SMOKE_TIMEOUT_MS
    ? parsePositiveInteger(env.SMOKE_TIMEOUT_MS, "SMOKE_TIMEOUT_MS")
    : DEFAULT_TIMEOUT_MS;
  let drug = env.SMOKE_DRUG || DEFAULT_DRUG;

  for (const arg of argv) {
    if (arg === "--mock") {
      mockApis = true;
    } else if (arg === "--no-mock") {
      mockApis = false;
    } else if (arg === "--headed") {
      headed = true;
    } else if (arg.startsWith("--timeout-ms=")) {
      timeoutMs = parsePositiveInteger(arg.slice("--timeout-ms=".length), "--timeout-ms");
    } else if (arg.startsWith("--drug=")) {
      drug = arg.slice("--drug=".length).trim() || DEFAULT_DRUG;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!positionalUrl) {
      positionalUrl = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }

  return {
    baseUrl: normalizeBaseUrl(positionalUrl ?? env.DEMO_URL),
    drug,
    headed,
    mockApis,
    timeoutMs,
  };
}

export function buildSmokeUrls(baseUrl, drug = DEFAULT_DRUG) {
  const homeUrl = new URL("/", `${baseUrl}/`);
  const workflowUrl = new URL("/", `${baseUrl}/`);
  workflowUrl.searchParams.set("drug", drug);
  workflowUrl.searchParams.set("workflow", "full");

  return {
    homeUrl: homeUrl.toString(),
    workflowUrl: workflowUrl.toString(),
  };
}

async function installMockApiRoutes(page) {
  await page.route("**/api/faers?**", async (route) => {
    await route.fulfill({ json: analysisFixture });
  });
  await page.route("**/api/signal?**", async (route) => {
    await route.fulfill({ json: signalFixture });
  });
  await page.route("**/api/rankings?**", async (route) => {
    await route.fulfill({ json: rankingFixture });
  });
  await page.route("**/api/compare?**", async (route) => {
    await route.fulfill({ json: comparisonFixture });
  });
  await page.route("**/api/report", async (route) => {
    await route.fulfill({ json: reportFixture });
  });
  await page.route("**/api/intake/medication", async (route) => {
    await route.fulfill({ json: intakeFixture });
  });
}

async function verifyHomeLoads(page, homeUrl, timeoutMs) {
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await expect(
    page.getByRole("heading", { name: "FAERS adverse event intelligence" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("OCR / label text")).toBeVisible({
    timeout: 20_000,
  });
}

async function verifyFullWorkflow(page, workflowUrl, timeoutMs) {
  await page.goto(workflowUrl, {
    waitUntil: "domcontentloaded",
    timeout: timeoutMs,
  });
  await expect(
    page.getByRole("heading", { name: "FAERS adverse event intelligence" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "Pharmacovigilance report" }),
  ).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText("Schema validated")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("source-provenance")).toBeVisible({
    timeout: 20_000,
  });
}

async function verifyLabelIntakePath(page, homeUrl, timeoutMs) {
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  const labelText = page.getByLabel("OCR / label text");
  await labelText.click();
  await labelText.pressSequentially(SAMPLE_LABEL_TEXT);

  const intakeButton = page.getByRole("button", { name: "DeepSeek intake" });
  await expect(intakeButton).toBeEnabled({ timeout: 20_000 });
  await intakeButton.click();

  await expect(page.getByText("Schema validated")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Human confirmation")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: "Metformin", exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Confirm and run workflow" }).click();
  await expect(
    page.getByRole("heading", { name: "Pharmacovigilance report" }),
  ).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible({
    timeout: 20_000,
  });
}

async function newSmokePage(browser, options) {
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);

  if (options.mockApis) {
    await installMockApiRoutes(page);
  }

  return page;
}

export async function runLiveDemoSmoke(options) {
  const { homeUrl, workflowUrl } = buildSmokeUrls(options.baseUrl, options.drug);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: !options.headed,
  });

  try {
    console.log(`Smoke target: ${options.baseUrl}`);
    console.log(`API mode: ${options.mockApis ? "mocked" : "live"}`);

    let page = await newSmokePage(browser, options);
    await verifyHomeLoads(page, homeUrl, options.timeoutMs);
    await page.close();
    console.log("PASS home page loads");

    page = await newSmokePage(browser, options);
    await verifyFullWorkflow(page, workflowUrl, options.timeoutMs);
    await page.close();
    console.log("PASS shareable full workflow");

    page = await newSmokePage(browser, options);
    await verifyLabelIntakePath(page, homeUrl, options.timeoutMs);
    await page.close();
    console.log("PASS label evidence confirmation workflow");
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = resolveSmokeOptions();
  await runLiveDemoSmoke(options);
  console.log("Live demo smoke test passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
