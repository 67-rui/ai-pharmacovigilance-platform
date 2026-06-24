import type { ChartDatum } from "@/lib/types";

const outcomeFields = [
  "seriousnessdeath",
  "seriousnesslifethreatening",
  "seriousnesshospitalization",
  "seriousnessdisabling",
  "seriousnesscongenitalanomali",
  "seriousnessother",
] as const;

type OutcomeField = (typeof outcomeFields)[number];

type RawCount = {
  term: string | number;
  count: number;
};

export type OpenFdaDrugFixture = {
  drug: string;
  totalReports: number;
  lastUpdated?: string;
  topReactions: ChartDatum[];
  seriousness: RawCount[];
  seriousOutcomes: Partial<Record<OutcomeField, number>>;
  sex: RawCount[];
  ages: RawCount[];
  roles: RawCount[];
  yearTrend: ChartDatum[];
};

export const faersDrugFixtures = {
  metformin: {
    drug: "metformin",
    totalReports: 3210,
    lastUpdated: "2026-06-01",
    topReactions: [
      { label: "NAUSEA", value: 120 },
      { label: "DIARRHOEA", value: 80 },
      { label: "VOMITING", value: 64 },
    ],
    seriousness: [
      { term: "1", count: 700 },
      { term: "2", count: 2510 },
    ],
    seriousOutcomes: {
      seriousnesshospitalization: 44,
    },
    sex: [
      { term: "2", count: 1800 },
      { term: "1", count: 1000 },
    ],
    ages: [
      { term: "66", count: 90 },
      { term: "42", count: 30 },
    ],
    roles: [{ term: "1", count: 3210 }],
    yearTrend: [
      { label: "2024", value: 410 },
      { label: "2025", value: 440 },
      { label: "2026", value: 290 },
    ],
  },
  atorvastatin: {
    drug: "atorvastatin",
    totalReports: 2780,
    lastUpdated: "2026-06-01",
    topReactions: [
      { label: "MYALGIA", value: 210 },
      { label: "FATIGUE", value: 104 },
      { label: "ARTHRALGIA", value: 75 },
    ],
    seriousness: [
      { term: "1", count: 640 },
      { term: "2", count: 2140 },
    ],
    seriousOutcomes: {
      seriousnesshospitalization: 58,
      seriousnessother: 36,
    },
    sex: [
      { term: "2", count: 1300 },
      { term: "1", count: 1180 },
    ],
    ages: [
      { term: "71", count: 115 },
      { term: "59", count: 86 },
    ],
    roles: [{ term: "1", count: 2780 }],
    yearTrend: [
      { label: "2024", value: 320 },
      { label: "2025", value: 365 },
      { label: "2026", value: 260 },
    ],
  },
  ibuprofen: {
    drug: "ibuprofen",
    totalReports: 1915,
    lastUpdated: "2026-06-01",
    topReactions: [
      { label: "RASH", value: 95 },
      { label: "NAUSEA", value: 82 },
      { label: "ABDOMINAL PAIN", value: 63 },
    ],
    seriousness: [
      { term: "1", count: 390 },
      { term: "2", count: 1525 },
    ],
    seriousOutcomes: {
      seriousnesslifethreatening: 11,
      seriousnesshospitalization: 38,
    },
    sex: [
      { term: "2", count: 980 },
      { term: "1", count: 760 },
    ],
    ages: [
      { term: "34", count: 70 },
      { term: "51", count: 65 },
    ],
    roles: [{ term: "1", count: 1915 }],
    yearTrend: [
      { label: "2024", value: 245 },
      { label: "2025", value: 270 },
      { label: "2026", value: 170 },
    ],
  },
  warfarin: {
    drug: "warfarin",
    totalReports: 4520,
    lastUpdated: "2026-06-01",
    topReactions: [
      { label: "HAEMORRHAGE", value: 240 },
      { label: "INTERNATIONAL NORMALISED RATIO INCREASED", value: 132 },
      { label: "ANAEMIA", value: 88 },
    ],
    seriousness: [
      { term: "1", count: 1520 },
      { term: "2", count: 3000 },
    ],
    seriousOutcomes: {
      seriousnessdeath: 72,
      seriousnesshospitalization: 160,
      seriousnesslifethreatening: 48,
    },
    sex: [
      { term: "1", count: 2020 },
      { term: "2", count: 1980 },
    ],
    ages: [
      { term: "78", count: 145 },
      { term: "68", count: 120 },
    ],
    roles: [{ term: "1", count: 4520 }],
    yearTrend: [
      { label: "2024", value: 510 },
      { label: "2025", value: 530 },
      { label: "2026", value: 360 },
    ],
  },
} satisfies Record<string, OpenFdaDrugFixture>;

function responseJson(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function inputToUrl(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}

function countResults(items: ChartDatum[]) {
  return items.map((item) => ({ term: item.label, count: item.value }));
}

function totalForSearch(fixture: OpenFdaDrugFixture, search: string | null) {
  if (!search?.includes("receivedate:[")) return fixture.totalReports;

  const year = search.match(/receivedate:\[(\d{4})0101 TO \d{4}1231\]/)?.[1];
  return fixture.yearTrend.find((item) => item.label === year)?.value ?? 0;
}

export function createOpenFdaFixtureFetch(fixture: OpenFdaDrugFixture) {
  return async (input: RequestInfo | URL) => {
    const url = new URL(inputToUrl(input));
    const count = url.searchParams.get("count");
    const search = url.searchParams.get("search");

    if (!count) {
      const total = totalForSearch(fixture, search);
      return responseJson({
        meta: { last_updated: fixture.lastUpdated, results: { total } },
        results: total > 0 ? [{}] : [],
      });
    }

    if (count === "patient.reaction.reactionmeddrapt.exact") {
      return responseJson({ results: countResults(fixture.topReactions) });
    }

    if (count === "serious") {
      return responseJson({ results: fixture.seriousness });
    }

    if (outcomeFields.includes(count as OutcomeField)) {
      const value = fixture.seriousOutcomes[count as OutcomeField] ?? 0;
      return responseJson({
        results: value > 0 ? [{ term: "1", count: value }] : [],
      });
    }

    if (count === "patient.patientsex") {
      return responseJson({ results: fixture.sex });
    }

    if (count === "patient.patientonsetage") {
      return responseJson({ results: fixture.ages });
    }

    if (count === "patient.drug.drugcharacterization") {
      return responseJson({ results: fixture.roles });
    }

    return responseJson({ results: [] });
  };
}

export function createOpenFdaNoResultFetch() {
  return async () =>
    responseJson(
      {
        error: {
          code: "NOT_FOUND",
          message: "No matches found!",
        },
      },
      404,
    );
}

export function createOpenFdaRateLimitFetch() {
  return async () =>
    responseJson(
      {
        error: {
          code: "RATE_LIMIT",
          message: "rate limit",
        },
      },
      429,
    );
}
