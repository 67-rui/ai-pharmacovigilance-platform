export type ChartDatum = {
  label: string;
  value: number;
};

export type FaersAnalysis = {
  drug: string;
  generatedAt: string;
  totalReports: number;
  sampleSize: number;
  search: string;
  topReactions: ChartDatum[];
  seriousness: ChartDatum[];
  seriousOutcomes: ChartDatum[];
  sexDistribution: ChartDatum[];
  ageDistribution: ChartDatum[];
  yearTrend: ChartDatum[];
  roleDistribution: ChartDatum[];
  highlights: string[];
  limitations: string[];
  source: {
    name: string;
    url: string;
    endpoint: string;
    search: string;
    assumptions: string[];
    queries: Array<{
      label: string;
      purpose: string;
      url: string;
    }>;
  };
};

export type ReportResponse = {
  mode: "openai" | "template";
  report: string;
  promptVersion: string;
  qualityChecklist: string[];
  model?: string;
  warning?: string;
};

export type SignalAnalysis = {
  drug: string;
  event: string;
  generatedAt: string;
  table: {
    drugAndEvent: number;
    drugAndOtherEvents: number;
    otherDrugsAndEvent: number;
    otherDrugsAndOtherEvents: number;
  };
  metrics: {
    prr: number | null;
    ror: number | null;
    rorLower95: number | null;
    rorUpper95: number | null;
  };
  interpretation: {
    label: "signal-elevated" | "signal-watch" | "insufficient-data";
    summary: string;
  };
  assumptions: string[];
  source: {
    endpoint: string;
    queries: Array<{
      label: string;
      purpose: string;
      url: string;
    }>;
  };
};

export type DrugComparison = {
  primaryDrug: string;
  comparatorDrug: string;
  event: string;
  generatedAt: string;
  rows: Array<{
    drug: string;
    role: "primary" | "comparator";
    totalDrugReports: number;
    eventReports: number;
    otherEventReports: number;
    eventSharePerThousand: number | null;
    prr: number | null;
    ror: number | null;
    rorLower95: number | null;
    rorUpper95: number | null;
    interpretationLabel: SignalAnalysis["interpretation"]["label"];
  }>;
  comparison: {
    higherEventShareDrug: string | null;
    eventShareRatio: number | null;
    summary: string;
  };
  assumptions: string[];
};

export type SignalRanking = {
  drug: string;
  generatedAt: string;
  rows: Array<{
    event: string;
    eventReports: number;
    prr: number | null;
    ror: number | null;
    rorLower95: number | null;
    rorUpper95: number | null;
    interpretationLabel: SignalAnalysis["interpretation"]["label"];
    interpretationSummary: string;
  }>;
  assumptions: string[];
};
