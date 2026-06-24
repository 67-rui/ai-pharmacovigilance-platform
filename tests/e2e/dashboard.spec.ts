import { expect, test } from "@playwright/test";

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
  report: "## metformin FAERS Portfolio Summary\n\n### Safety Signal Overview\nSchema-valid report.",
  structuredReport: {
    title: "metformin FAERS Portfolio Summary",
    safetySignalOverview:
      "metformin matched 3,210 suspect-drug FAERS reports. These aggregate counts support signal triage and hypothesis generation, but they cannot establish incidence, prevalence, clinical risk, or causality.",
    keyPatterns: ["Most frequently reported reactions: NAUSEA (120)."],
    reviewerFollowUp: ["Review duplicate reports, co-medications, and chronology."],
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

test("loads a shareable full workflow and exposes report export controls", async ({
  page,
}) => {
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

  await page.goto("/?drug=metformin&workflow=full");

  await expect(
    page.getByRole("heading", { name: "FAERS adverse event intelligence" }),
  ).toBeVisible();
  await expect(
    page.getByText("metformin has 3,210 suspect-drug FAERS matches."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pharmacovigilance report" })).toBeVisible();
  await expect(page.getByText("Schema validated")).toBeVisible();
  await expect(page.getByText("No causal claims from FAERS report counts.")).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "MD" })).toBeVisible();
  await expect(page.getByText("metformin has the higher event reporting share")).toBeVisible();
});
