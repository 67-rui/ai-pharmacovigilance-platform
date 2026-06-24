import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const port = Number(process.env.DEMO_VIDEO_PORT ?? 3104);
const baseUrl = `http://localhost:${port}`;
const outputDir = path.join(repoRoot, "docs", "assets");
const videoDir = path.join(outputDir, "demo-video-temp");
const outputFile = path.join(outputDir, "pharmacovigilance-demo.webm");

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
    { label: "HYPOGLYCAEMIA", value: 35 },
  ],
  seriousness: [
    { label: "Serious", value: 700 },
    { label: "Non-serious", value: 2510 },
  ],
  seriousOutcomes: [
    { label: "Hospitalization", value: 44 },
    { label: "Death", value: 12 },
  ],
  sexDistribution: [
    { label: "Female", value: 1800 },
    { label: "Male", value: 1000 },
    { label: "Unknown", value: 410 },
  ],
  ageDistribution: [
    { label: "18-44", value: 30 },
    { label: "45-64", value: 80 },
    { label: "65-74", value: 90 },
  ],
  yearTrend: [
    { label: "2023", value: 85 },
    { label: "2024", value: 96 },
    { label: "2025", value: 100 },
    { label: "2026", value: 120 },
  ],
  roleDistribution: [{ label: "Primary suspect", value: 3210 }],
  highlights: [
    "metformin has 3,210 suspect-drug FAERS matches.",
    "NAUSEA is the most frequently reported MedDRA preferred term.",
    "Female is the largest sex category among aggregate reports with available values.",
  ],
  limitations: [
    "FAERS reports cannot establish incidence, prevalence, or causality.",
    "Report counts can be affected by duplicate submissions, reporting bias, media attention, and market share.",
  ],
  source: {
    name: "openFDA FAERS",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: "https://api.fda.gov/drug/event.json",
    search: 'patient.drug.medicinalproduct:"METFORMIN"',
    assumptions: [
      "Uses suspect-drug role coding when available.",
      "Aggregate count queries are used instead of full report downloads.",
    ],
    queries: [
      {
        label: "Matched reports",
        purpose: "Count all suspect-drug reports matched by the search expression.",
        url: "https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22METFORMIN%22&limit=1",
      },
      {
        label: "Top reactions",
        purpose: "Aggregate MedDRA preferred terms reported with the drug.",
        url: "https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22METFORMIN%22&count=patient.reaction.reactionmeddrapt.exact",
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
    {
      event: "DIARRHOEA",
      eventReports: 80,
      prr: 1.8,
      ror: 1.9,
      rorLower95: 1.6,
      rorUpper95: 2.1,
      interpretationLabel: "signal-watch",
      interpretationSummary: "Watch signal.",
    },
  ],
  assumptions: ["Ranking supports reviewer prioritization, not clinical risk ranking."],
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
    keyPatterns: [
      "Most frequently reported reactions: NAUSEA (120), DIARRHOEA (80), VOMITING (50).",
      "The workflow keeps source query assumptions visible for reviewer traceability.",
    ],
    reviewerFollowUp: [
      "Review duplicate reports, co-medications, indication, chronology, and dechallenge/rechallenge evidence.",
      "Compare the drug-event pattern against class alternatives before forming a safety hypothesis.",
    ],
    limitations: [
      "FAERS reports cannot establish incidence, prevalence, or causality.",
      "Report counts may reflect duplicate reporting, stimulated reporting, missing values, and reporting bias.",
    ],
    qualityChecks: ["No causal claims from FAERS report counts."],
  },
  promptVersion: "faers-safety-report-v2",
  qualityChecklist: [
    "No causal claims from FAERS report counts.",
    "No incidence, prevalence, or true-risk estimates.",
    "FAERS limitations are stated explicitly.",
  ],
  tone: "portfolio-summary",
  warning: "OPENAI_API_KEY is not configured; generated a local template report.",
};

function startServer() {
  return spawn(
    "npm",
    ["--workspace", "apps/web", "run", "dev", "--", "-p", String(port)],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function routeFixtures(page) {
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
}

async function pause(ms = 850) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrollTo(locator) {
  await locator.scrollIntoViewIfNeeded();
  await pause();
}

const server = startServer();

try {
  await waitForServer(baseUrl);
  await mkdir(outputDir, { recursive: true });
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 900 },
    },
  });
  const page = await context.newPage();

  await routeFixtures(page);
  await page.goto(`${baseUrl}/?drug=metformin&workflow=full`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "PDF" }).waitFor();

  await pause(1200);
  await scrollTo(page.getByTestId("signal-analysis"));
  await scrollTo(page.getByTestId("drug-comparison"));
  await scrollTo(page.getByTestId("ai-report"));
  await scrollTo(page.getByTestId("source-provenance"));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await pause(800);

  const video = page.video();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  await copyFile(videoPath, outputFile);
  await rm(videoDir, { recursive: true, force: true });
  console.log(`Captured demo video at ${outputFile}.`);
} finally {
  server.kill("SIGTERM");
}
