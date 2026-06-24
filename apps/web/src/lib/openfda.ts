import type { ChartDatum, FaersAnalysis } from "./types";

const EVENT_ENDPOINT = "https://api.fda.gov/drug/event.json";

export class NoFaersResultsError extends Error {
  constructor(drug: string) {
    super(`No FAERS reports found for "${drug}".`);
    this.name = "NoFaersResultsError";
  }
}

type OpenFdaCountResult = {
  term?: string | number;
  time?: string | number;
  count?: number;
};

type OpenFdaResponse<T> = {
  meta?: {
    results?: {
      total?: number;
      limit?: number;
      skip?: number;
    };
  };
  results?: T[];
  error?: {
    code?: string;
    message?: string;
  };
};

const seriousnessLabels: Record<string, string> = {
  "1": "Serious",
  "2": "Non-serious",
};

const sexLabels: Record<string, string> = {
  "0": "Unknown",
  "1": "Male",
  "2": "Female",
};

const roleLabels: Record<string, string> = {
  "1": "Primary suspect",
  "2": "Secondary suspect",
  "3": "Concomitant",
  "4": "Interacting",
};

const outcomeFields = [
  ["Death", "seriousnessdeath"],
  ["Life threatening", "seriousnesslifethreatening"],
  ["Hospitalization", "seriousnesshospitalization"],
  ["Disability", "seriousnessdisabling"],
  ["Congenital anomaly", "seriousnesscongenitalanomali"],
  ["Other serious", "seriousnessother"],
] as const;

function cleanDrugName(drug: string) {
  return drug.trim().replace(/\s+/g, " ").slice(0, 80);
}

function escapePhrase(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildDrugSearch(drug: string) {
  const safeDrug = escapePhrase(cleanDrugName(drug));
  const fields = [
    `patient.drug.openfda.generic_name:"${safeDrug}"`,
    `patient.drug.openfda.brand_name:"${safeDrug}"`,
    `patient.drug.medicinalproduct:"${safeDrug}"`,
  ];

  return `patient.drug.drugcharacterization:1 AND (${fields.join(" OR ")})`;
}

function endpointUrl(params: Record<string, string | number>) {
  const url = new URL(EVENT_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  if (process.env.OPENFDA_API_KEY) {
    url.searchParams.set("api_key", process.env.OPENFDA_API_KEY);
  }

  return url;
}

function publicEndpointUrl(params: Record<string, string | number>) {
  const url = new URL(EVENT_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
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

async function fetchOpenFda<T>(
  params: Record<string, string | number>,
): Promise<OpenFdaResponse<T>> {
  const response = await fetch(endpointUrl(params), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return { results: [], meta: { results: { total: 0 } } };
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`openFDA request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<OpenFdaResponse<T>>;
}

async function countField(
  search: string,
  field: string,
  limit = 10,
): Promise<ChartDatum[]> {
  const payload = await fetchOpenFda<OpenFdaCountResult>({
    search,
    count: field,
    limit,
  });

  return (payload.results ?? [])
    .map((item) => ({
      label: String(item.term ?? item.time ?? "Unknown"),
      value: Number(item.count ?? 0),
    }))
    .filter((item) => item.value > 0);
}

async function fetchTotal(search: string) {
  const payload = await fetchOpenFda<unknown>({
    search,
    limit: 1,
  });

  return payload.meta?.results?.total ?? 0;
}

function mapLabels(items: ChartDatum[], labels: Record<string, string>) {
  return items.map((item) => ({
    label: labels[item.label] ?? `Code ${item.label}`,
    value: item.value,
  }));
}

function bucketAge(age: number) {
  if (age < 18) return "0-17";
  if (age < 45) return "18-44";
  if (age < 65) return "45-64";
  if (age < 75) return "65-74";
  if (age < 85) return "75-84";
  return "85+";
}

function sumBuckets(
  items: ChartDatum[],
  labeler: (item: ChartDatum) => string,
  order: string[],
) {
  const totals = new Map<string, number>();
  items.forEach((item) => {
    const label = labeler(item);
    totals.set(label, (totals.get(label) ?? 0) + item.value);
  });

  return order
    .map((label) => ({ label, value: totals.get(label) ?? 0 }))
    .filter((item) => item.value > 0);
}

function getOutcomeValue(items: ChartDatum[]) {
  return items.find((item) => item.label === "1")?.value ?? 0;
}

export function buildAgeDistribution(items: ChartDatum[]) {
  return sumBuckets(
    items.filter((item) => Number.isFinite(Number(item.label))),
    (item) => bucketAge(Number(item.label)),
    ["0-17", "18-44", "45-64", "65-74", "75-84", "85+"],
  );
}

async function getSeriousOutcomes(search: string) {
  const outcomes = await Promise.all(
    outcomeFields.map(async ([label, field]) => {
      const counts = await countField(search, field, 2);
      return {
        label,
        value: getOutcomeValue(counts),
      };
    }),
  );

  return outcomes.filter((item) => item.value > 0);
}

async function getYearTrend(search: string) {
  const years = getTrendYears();
  const totals = await Promise.all(
    years.map(async (year) => ({
      label: String(year),
      value: await fetchTotal(`${search} AND receivedate:[${year}0101 TO ${year}1231]`),
    })),
  );

  return totals.filter((item) => item.value > 0);
}

function getTrendYears() {
  const currentYear = new Date().getUTCFullYear();
  return Array.from({ length: 8 }, (_, index) => currentYear - 7 + index);
}

function buildSourceMetadata(search: string) {
  const queries = [
    sourceQuery("Matched reports", "Count all suspect-drug reports matched by the search expression.", {
      search,
      limit: 1,
    }),
    sourceQuery("Top reactions", "Aggregate MedDRA preferred terms reported with the drug.", {
      search,
      count: "patient.reaction.reactionmeddrapt.exact",
      limit: 12,
    }),
    sourceQuery("Seriousness", "Compare serious and non-serious report flags.", {
      search,
      count: "serious",
      limit: 2,
    }),
    ...outcomeFields.map(([label, field]) =>
      sourceQuery(`${label} outcome`, `Count reports where ${label.toLowerCase()} is flagged.`, {
        search,
        count: field,
        limit: 2,
      }),
    ),
    sourceQuery("Patient sex", "Aggregate patient sex codes reported to FAERS.", {
      search,
      count: "patient.patientsex",
      limit: 4,
    }),
    sourceQuery("Patient age", "Aggregate patient age values where age unit is years.", {
      search: `${search} AND patient.patientonsetageunit:801`,
      count: "patient.patientonsetage",
      limit: 120,
    }),
    sourceQuery("Drug role", "Aggregate FAERS drug characterization codes.", {
      search,
      count: "patient.drug.drugcharacterization",
      limit: 4,
    }),
    ...getTrendYears().map((year) =>
      sourceQuery(`${year} reports`, `Count reports received during ${year}.`, {
        search: `${search} AND receivedate:[${year}0101 TO ${year}1231]`,
        limit: 1,
      }),
    ),
  ];

  return {
    name: "openFDA Drug Adverse Event API",
    url: "https://open.fda.gov/apis/drug/event/",
    endpoint: EVENT_ENDPOINT,
    search,
    assumptions: [
      "The drug is treated as a suspect drug by requiring patient.drug.drugcharacterization:1.",
      "The drug name is matched against openFDA generic_name, openFDA brand_name, and FAERS medicinalproduct.",
      "Aggregate count queries are used instead of full report downloads to keep the dashboard responsive.",
      "Patient age buckets use reports where patient.patientonsetageunit:801 indicates age in years.",
      "Year trend counts use receivedate ranges for the most recent eight calendar years.",
      "Public query URLs intentionally omit any OPENFDA_API_KEY value.",
    ],
    queries,
  };
}

function firstLabel(items: ChartDatum[], fallback = "not available") {
  return items[0]?.label ?? fallback;
}

function makeHighlights(
  totalReports: number,
  topReactions: ChartDatum[],
  seriousOutcomes: ChartDatum[],
  sexDistribution: ChartDatum[],
) {
  const seriousOutcome = firstLabel(seriousOutcomes);
  const sexSkew = firstLabel(sexDistribution);

  return [
    `${totalReports.toLocaleString()} FAERS reports matched the suspect-drug search.`,
    `${firstLabel(topReactions)} is the most frequently reported MedDRA preferred term in this query.`,
    seriousOutcomes.length
      ? `${seriousOutcome} is the leading serious outcome flag among aggregate outcome counts.`
      : "No serious outcome flags were returned by the aggregate outcome queries.",
    `${sexSkew} is the largest sex category among aggregate reports with available values.`,
  ];
}

export async function analyzeFaersDrug(drug: string): Promise<FaersAnalysis> {
  const normalizedDrug = cleanDrugName(drug);
  if (!normalizedDrug) {
    throw new Error("Drug name is required.");
  }

  const search = buildDrugSearch(normalizedDrug);
  const [
    totalReports,
    topReactions,
    seriousness,
    seriousOutcomes,
    sexCounts,
    ageCounts,
    roleCounts,
    yearTrend,
  ] = await Promise.all([
    fetchTotal(search),
    countField(search, "patient.reaction.reactionmeddrapt.exact", 12),
    countField(search, "serious", 2),
    getSeriousOutcomes(search),
    countField(search, "patient.patientsex", 4),
    countField(`${search} AND patient.patientonsetageunit:801`, "patient.patientonsetage", 120),
    countField(search, "patient.drug.drugcharacterization", 4),
    getYearTrend(search),
  ]);

  if (totalReports === 0) {
    throw new NoFaersResultsError(normalizedDrug);
  }

  const sexDistribution = mapLabels(sexCounts, sexLabels).sort(
    (a, b) => b.value - a.value,
  );
  const seriousnessMapped = mapLabels(seriousness, seriousnessLabels);
  const roleDistribution = mapLabels(roleCounts, roleLabels);
  const ageDistribution = buildAgeDistribution(ageCounts);

  return {
    drug: normalizedDrug,
    generatedAt: new Date().toISOString(),
    totalReports,
    sampleSize: totalReports,
    search,
    topReactions,
    seriousness: seriousnessMapped,
    seriousOutcomes,
    sexDistribution,
    ageDistribution,
    yearTrend,
    roleDistribution,
    highlights: makeHighlights(
      totalReports,
      topReactions,
      seriousOutcomes,
      sexDistribution,
    ),
    limitations: [
      "FAERS is a spontaneous reporting system and cannot establish incidence rates.",
      "Report counts can be affected by duplicate submissions, reporting bias, media attention, and market share.",
      "A reported association does not prove that the drug caused the adverse event.",
      "This dashboard is for research and pharmacovigilance triage, not medical advice.",
    ],
    source: {
      ...buildSourceMetadata(search),
    },
  };
}
