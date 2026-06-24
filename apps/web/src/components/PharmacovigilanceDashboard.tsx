"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Pill,
  RefreshCw,
  Search,
  Sparkles,
  ScanText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPanel } from "./ChartPanel";
import { EmptyChart } from "./EmptyChart";
import { MetricCard } from "./MetricCard";
import {
  INTAKE_EVIDENCE_HISTORY_STORAGE_KEY,
  addIntakeEvidenceHistoryEntry,
  buildIntakeEvidenceHistoryEntry,
  type IntakeEvidenceHistoryEntry,
} from "@/lib/intakeEvidenceHistory";
import { buildPdfReportSections } from "@/lib/pdfReport";
import {
  REPORT_HISTORY_STORAGE_KEY,
  addReportHistoryEntry,
  buildReportHistoryEntry,
  type ReportHistoryEntry,
} from "@/lib/reportHistory";
import { REPORT_TONE_OPTIONS } from "@/lib/report";
import { filterSignalRankingRows } from "@/lib/ranking";
import {
  buildShareableAnalysisSearch,
  parseShareableAnalysisParams,
} from "@/lib/shareableAnalysis";
import { buildWorkflowRequestPlan } from "@/lib/workflow";
import type {
  ChartDatum,
  DrugComparison,
  FaersAnalysis,
  MedicationIntakeResult,
  ReportResponse,
  ReportTone,
  SignalAnalysis,
  SignalRanking,
} from "@/lib/types";

const pieColors = ["#0f766e", "#be123c", "#2563eb", "#64748b"];
const examples = ["metformin", "atorvastatin", "ibuprofen", "warfarin"];
const reportToneEntries = Object.entries(REPORT_TONE_OPTIONS) as Array<
  [ReportTone, (typeof REPORT_TONE_OPTIONS)[ReportTone]]
>;

function formatNumber(value: number) {
  return value.toLocaleString();
}

function firstValue(items: ChartDatum[]) {
  return items[0]?.label ?? "Not available";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toMarkdownFile(drug: string, report: string) {
  const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
  downloadBlob(
    `${drug.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-faers-report.md`,
    blob,
  );
}

function toPdfFile(
  analysis: FaersAnalysis,
  report: ReportResponse,
  signal: SignalAnalysis | null,
  ranking: SignalRanking | null,
  comparison: DrugComparison | null,
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const maxWidth = 516;
  const lineHeight = 14;
  let y = margin;

  const addPageIfNeeded = (nextHeight = lineHeight) => {
    if (y + nextHeight > 744) {
      doc.addPage();
      y = margin;
    }
  };

  const addText = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    lines.forEach((line) => {
      addPageIfNeeded(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    });
  };

  doc.setProperties({
    title: `${analysis.drug} FAERS Pharmacovigilance Report`,
    subject: "AI-assisted pharmacovigilance reviewer report",
    creator: "AI Pharmacovigilance Platform",
  });

  addText(`${analysis.drug} FAERS Pharmacovigilance Report`, 16, "bold");
  addText("AI-assisted reviewer artifact with FAERS and responsible-AI guardrails.", 10);
  y += 10;

  buildPdfReportSections({ analysis, signal, ranking, comparison, report }).forEach(
    (section) => {
      addPageIfNeeded(36);
      addText(section.title, 12, "bold");
      section.lines.forEach((line) => addText(`- ${line}`));
      y += 8;
    },
  );

  doc.save(`${slug(analysis.drug)}-faers-report.pdf`);
}

function csvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(
  filename: string,
  rows: Array<Record<string, string | number | null>>,
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvValue).join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function readReportHistory() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(REPORT_HISTORY_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ReportHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function readIntakeEvidenceHistory() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(INTAKE_EVIDENCE_HISTORY_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as IntakeEvidenceHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function analysisCsvRows(analysis: FaersAnalysis) {
  const chartRows = [
    ["top_reactions", analysis.topReactions],
    ["seriousness", analysis.seriousness],
    ["serious_outcomes", analysis.seriousOutcomes],
    ["sex_distribution", analysis.sexDistribution],
    ["age_distribution", analysis.ageDistribution],
    ["year_trend", analysis.yearTrend],
    ["role_distribution", analysis.roleDistribution],
  ] as const;

  return chartRows.flatMap(([section, rows]) =>
    rows.map((row) => ({
      drug: analysis.drug,
      generatedAt: analysis.generatedAt,
      section,
      label: row.label,
      value: row.value,
    })),
  );
}

function signalCsvRows(signal: SignalAnalysis) {
  return [
    {
      drug: signal.drug,
      event: signal.event,
      section: "2x2_table",
      metric: "drug_and_event",
      value: signal.table.drugAndEvent,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "2x2_table",
      metric: "drug_and_other_events",
      value: signal.table.drugAndOtherEvents,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "2x2_table",
      metric: "other_drugs_and_event",
      value: signal.table.otherDrugsAndEvent,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "2x2_table",
      metric: "other_drugs_and_other_events",
      value: signal.table.otherDrugsAndOtherEvents,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "metrics",
      metric: "prr",
      value: signal.metrics.prr,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "metrics",
      metric: "ror",
      value: signal.metrics.ror,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "metrics",
      metric: "ror_lower_95",
      value: signal.metrics.rorLower95,
    },
    {
      drug: signal.drug,
      event: signal.event,
      section: "metrics",
      metric: "ror_upper_95",
      value: signal.metrics.rorUpper95,
    },
  ];
}

function comparisonCsvRows(comparison: DrugComparison) {
  return comparison.rows.map((row) => ({
    event: comparison.event,
    role: row.role,
    drug: row.drug,
    totalDrugReports: row.totalDrugReports,
    eventReports: row.eventReports,
    otherEventReports: row.otherEventReports,
    eventSharePerThousand: row.eventSharePerThousand,
    prr: row.prr,
    ror: row.ror,
    rorLower95: row.rorLower95,
    rorUpper95: row.rorUpper95,
    interpretationLabel: row.interpretationLabel,
  }));
}

function rankingCsvRows(ranking: SignalRanking) {
  return ranking.rows.map((row, index) => ({
    rank: index + 1,
    drug: ranking.drug,
    event: row.event,
    eventReports: row.eventReports,
    prr: row.prr,
    ror: row.ror,
    rorLower95: row.rorLower95,
    rorUpper95: row.rorUpper95,
    interpretationLabel: row.interpretationLabel,
  }));
}

function LoadingActionIcon({
  isLoading,
  Icon,
  size = 16,
}: {
  isLoading: boolean;
  Icon: LucideIcon;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ height: size, width: size }}
    >
      <Icon
        size={size}
        className={`transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
      />
      <RefreshCw
        size={size}
        className={`absolute inset-0 transition-opacity ${isLoading ? "animate-spin opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}

function MeasuredChartFrame({
  children,
}: {
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextSize = {
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      };

      if (nextSize.width <= 0 || nextSize.height <= 0) {
        setSize(null);
        return;
      }

      setSize((current) =>
        current?.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize,
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="h-full w-full min-w-0">
      {size ? children(size) : null}
    </div>
  );
}

function HorizontalBars({
  data,
  color = "#0f766e",
}: {
  data: ChartDatum[];
  color?: string;
}) {
  if (!data.length) return <EmptyChart />;

  return (
    <MeasuredChartFrame>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 118 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      )}
    </MeasuredChartFrame>
  );
}

function DonutChart({ data }: { data: ChartDatum[] }) {
  if (!data.length) return <EmptyChart />;

  return (
    <MeasuredChartFrame>
      {({ width, height }) => (
        <PieChart width={width} height={height}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={2}
          >
            {data.map((item, index) => (
              <Cell
                key={item.label}
                fill={pieColors[index % pieColors.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      )}
    </MeasuredChartFrame>
  );
}

function TrendChart({ data }: { data: ChartDatum[] }) {
  if (!data.length) return <EmptyChart />;

  return (
    <MeasuredChartFrame>
      {({ width, height }) => (
        <AreaChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 8, right: 18, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            fill="url(#trendFill)"
            strokeWidth={2}
          />
        </AreaChart>
      )}
    </MeasuredChartFrame>
  );
}

function metricText(value: number | null) {
  return value === null ? "N/A" : value.toLocaleString();
}

function numberFilterValue(value: string) {
  const numberValue = Number(value);
  return value.trim() && Number.isFinite(numberValue) ? numberValue : undefined;
}

function SignalPanel({
  analysis,
  selectedEvent,
  signal,
  isSignalLoading,
  onEventChange,
  onRunSignal,
  onExportSignalCsv,
}: {
  analysis: FaersAnalysis;
  selectedEvent: string;
  signal: SignalAnalysis | null;
  isSignalLoading: boolean;
  onEventChange: (event: string) => void;
  onRunSignal: () => void;
  onExportSignalCsv: () => void;
}) {
  const eventOptions = analysis.topReactions.map((item) => item.label);
  const selectedPreset = eventOptions.includes(selectedEvent)
    ? selectedEvent
    : "";

  return (
    <section
      data-testid="signal-analysis"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Signal detection
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            PRR / ROR disproportionality analysis
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-[12rem_minmax(14rem,1fr)_auto_auto]">
          <div>
            <label className="sr-only" htmlFor="event-select">
              Top reaction preset
            </label>
            <select
              id="event-select"
              value={selectedPreset}
              onChange={(event) => {
                if (event.target.value) {
                  onEventChange(event.target.value);
                }
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Custom event</option>
              {eventOptions.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="event-input">
              MedDRA preferred term
            </label>
            <input
              id="event-input"
              value={selectedEvent}
              onChange={(event) => onEventChange(event.target.value.toUpperCase())}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="MedDRA preferred term"
            />
          </div>
          <button
            type="button"
            onClick={onRunSignal}
            disabled={isSignalLoading || selectedEvent.trim().length < 2}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <LoadingActionIcon isLoading={isSignalLoading} Icon={Activity} />
            Compute
          </button>
          {signal ? (
            <button
              type="button"
              onClick={onExportSignalCsv}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
            >
              <Download size={16} />
              CSV
            </button>
          ) : null}
        </div>
      </div>

      {signal ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <MetricCard
              label="PRR"
              value={metricText(signal.metrics.prr)}
              detail="Proportional reporting ratio"
            />
            <MetricCard
              label="ROR"
              value={metricText(signal.metrics.ror)}
              detail="Reporting odds ratio"
            />
            <MetricCard
              label="ROR 95% CI"
              value={
                signal.metrics.rorLower95 === null ||
                signal.metrics.rorUpper95 === null
                  ? "N/A"
                  : `${signal.metrics.rorLower95} - ${signal.metrics.rorUpper95}`
              }
              detail="Log ROR confidence interval"
            />
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-3 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <div className="p-3">2x2 table</div>
                <div className="p-3">{signal.event}</div>
                <div className="p-3">Other events</div>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-200 text-sm text-slate-700">
                <div className="p-3 font-semibold text-slate-950">
                  {signal.drug}
                </div>
                <div className="p-3 font-mono">
                  {formatNumber(signal.table.drugAndEvent)}
                </div>
                <div className="p-3 font-mono">
                  {formatNumber(signal.table.drugAndOtherEvents)}
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-200 text-sm text-slate-700">
                <div className="p-3 font-semibold text-slate-950">
                  Other drugs
                </div>
                <div className="p-3 font-mono">
                  {formatNumber(signal.table.otherDrugsAndEvent)}
                </div>
                <div className="p-3 font-mono">
                  {formatNumber(signal.table.otherDrugsAndOtherEvents)}
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg border p-4 text-sm leading-6 ${
                signal.interpretation.label === "signal-elevated"
                  ? "border-rose-200 bg-rose-50 text-rose-950"
                  : signal.interpretation.label === "signal-watch"
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <div className="mb-1 font-semibold">
                {signal.interpretation.label === "signal-elevated"
                  ? "Elevated reporting signal"
                  : signal.interpretation.label === "signal-watch"
                    ? "Watch signal"
                    : "Insufficient data"}
              </div>
              {signal.interpretation.summary}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assumptions
                </div>
                <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700">
                  {signal.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Signal query URLs
                </div>
                <div className="mt-2 space-y-2">
                  {signal.source.queries.map((query) => (
                    <a
                      key={query.label}
                      href={query.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-emerald-800"
                    >
                      <span>{query.label}</span>
                      <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          {isSignalLoading ? "Computing signal metrics" : "Signal metrics pending"}
        </div>
      )}
    </section>
  );
}

function SignalRankingPanel({
  analysis,
  ranking,
  isRankingLoading,
  onRunRanking,
  onExportRankingCsv,
}: {
  analysis: FaersAnalysis;
  ranking: SignalRanking | null;
  isRankingLoading: boolean;
  onRunRanking: () => void;
  onExportRankingCsv: () => void;
}) {
  const candidateCount = Math.min(analysis.topReactions.length, 6);
  const [interpretationFilter, setInterpretationFilter] = useState("all");
  const [minReportsFilter, setMinReportsFilter] = useState("");
  const [minPrrFilter, setMinPrrFilter] = useState("");
  const [minRorFilter, setMinRorFilter] = useState("");
  const filteredRows = ranking
    ? filterSignalRankingRows(ranking.rows, {
        interpretation: interpretationFilter as
          | SignalAnalysis["interpretation"]["label"]
          | "all",
        minReports: numberFilterValue(minReportsFilter),
        minPrr: numberFilterValue(minPrrFilter),
        minRor: numberFilterValue(minRorFilter),
      })
    : [];

  return (
    <section
      data-testid="signal-ranking"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Signal prioritization
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Ranked top MedDRA signal candidates
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRunRanking}
            disabled={isRankingLoading || candidateCount === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <LoadingActionIcon isLoading={isRankingLoading} Icon={Activity} />
            Rank top signals
          </button>
          {ranking ? (
            <button
              type="button"
              onClick={onExportRankingCsv}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
            >
              <Download size={16} />
              CSV
            </button>
          ) : null}
        </div>
      </div>

      {ranking ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ranking filters
                </div>
                <div className="text-sm text-slate-600">
                  Showing {filteredRows.length} of {ranking.rows.length} candidate events
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Interpretation
                </span>
                <select
                  value={interpretationFilter}
                  onChange={(event) => setInterpretationFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">All</option>
                  <option value="signal-elevated">Elevated</option>
                  <option value="signal-watch">Watch</option>
                  <option value="insufficient-data">Insufficient</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Min reports
                </span>
                <input
                  type="number"
                  min="0"
                  value={minReportsFilter}
                  onChange={(event) => setMinReportsFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Min PRR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minPrrFilter}
                  onChange={(event) => setMinPrrFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Min ROR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minRorFilter}
                  onChange={(event) => setMinRorFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Event</th>
                  <th className="px-3 py-3">Drug-event reports</th>
                  <th className="px-3 py-3">PRR</th>
                  <th className="px-3 py-3">ROR</th>
                  <th className="px-3 py-3">ROR 95% CI</th>
                  <th className="px-3 py-3">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {filteredRows.map((row, index) => (
                  <tr key={row.event}>
                    <td className="px-3 py-3 font-mono">{index + 1}</td>
                    <td className="px-3 py-3 font-semibold text-slate-950">
                      {row.event}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {formatNumber(row.eventReports)}
                    </td>
                    <td className="px-3 py-3 font-mono">{metricText(row.prr)}</td>
                    <td className="px-3 py-3 font-mono">{metricText(row.ror)}</td>
                    <td className="px-3 py-3 font-mono">
                      {row.rorLower95 === null || row.rorUpper95 === null
                        ? "N/A"
                        : `${row.rorLower95} - ${row.rorUpper95}`}
                    </td>
                    <td className="px-3 py-3">{row.interpretationLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
              No signal candidates match the current filters.
            </div>
          ) : null}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <div className="font-semibold">Ranking boundary</div>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {ranking.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
          {isRankingLoading
            ? "Ranking top signal candidates"
            : `Rank the top ${candidateCount} reported MedDRA terms with PRR and ROR.`}
        </div>
      )}
    </section>
  );
}

function ComparisonPanel({
  primaryDrug,
  selectedEvent,
  comparatorDrug,
  comparison,
  isComparisonLoading,
  onComparatorChange,
  onRunComparison,
  onExportComparisonCsv,
}: {
  primaryDrug: string;
  selectedEvent: string;
  comparatorDrug: string;
  comparison: DrugComparison | null;
  isComparisonLoading: boolean;
  onComparatorChange: (drug: string) => void;
  onRunComparison: () => void;
  onExportComparisonCsv: () => void;
}) {
  return (
    <section
      data-testid="drug-comparison"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Comparative safety view
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Drug-vs-drug event reporting comparison
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto_auto]">
          <label className="sr-only" htmlFor="comparator-drug">
            Comparator drug
          </label>
          <input
            id="comparator-drug"
            value={comparatorDrug}
            onChange={(event) => onComparatorChange(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="Comparator drug"
          />
          <button
            type="button"
            onClick={onRunComparison}
            disabled={
              isComparisonLoading ||
              comparatorDrug.trim().length < 2 ||
              selectedEvent.trim().length < 2
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <LoadingActionIcon isLoading={isComparisonLoading} Icon={Activity} />
            Compare
          </button>
          {comparison ? (
            <button
              type="button"
              onClick={onExportComparisonCsv}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
            >
              <Download size={16} />
              CSV
            </button>
          ) : null}
        </div>
      </div>

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Event"
              value={comparison.event}
              detail="MedDRA preferred term"
            />
            <MetricCard
              label="Higher event share"
              value={comparison.comparison.higherEventShareDrug ?? "Tie / N/A"}
              detail="Per 1,000 suspect-drug reports"
            />
            <MetricCard
              label="Share ratio"
              value={metricText(comparison.comparison.eventShareRatio)}
              detail="Higher share divided by lower share"
            />
          </div>

          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-3">Drug</th>
                  <th className="px-3 py-3">Event reports</th>
                  <th className="px-3 py-3">Total drug reports</th>
                  <th className="px-3 py-3">Event / 1k</th>
                  <th className="px-3 py-3">PRR</th>
                  <th className="px-3 py-3">ROR</th>
                  <th className="px-3 py-3">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {comparison.rows.map((row) => (
                  <tr key={row.role}>
                    <td className="px-3 py-3 font-semibold text-slate-950">
                      {row.drug}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {formatNumber(row.eventReports)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {formatNumber(row.totalDrugReports)}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {metricText(row.eventSharePerThousand)}
                    </td>
                    <td className="px-3 py-3 font-mono">{metricText(row.prr)}</td>
                    <td className="px-3 py-3 font-mono">{metricText(row.ror)}</td>
                    <td className="px-3 py-3">{row.interpretationLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <div className="font-semibold">Comparison boundary</div>
            <p className="mt-1">{comparison.comparison.summary}</p>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {comparison.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          {isComparisonLoading
            ? "Comparing drug-event reporting shares"
            : `Compare ${primaryDrug || "primary drug"} against another drug for ${selectedEvent || "a selected event"}`}
        </div>
      )}
    </section>
  );
}

function SourceQueryPanel({ analysis }: { analysis: FaersAnalysis }) {
  return (
    <section
      data-testid="source-provenance"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <Database size={15} />
            Source provenance
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            openFDA query assumptions
          </h2>
        </div>
        <a
          href={analysis.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
        >
          <ExternalLink size={16} />
          API docs
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Endpoint
            </div>
            <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
              {analysis.source.endpoint}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search expression
            </div>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-50">
              {analysis.source.search}
            </pre>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Assumptions
            </div>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {analysis.source.assumptions.map((item) => (
                <li key={item} className="rounded-md bg-slate-50 p-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Public request URLs
          </div>
          <div className="mt-2 max-h-[35rem] overflow-auto rounded-md border border-slate-200">
            {analysis.source.queries.map((query) => (
              <div
                key={`${query.label}-${query.url}`}
                className="border-b border-slate-200 p-3 last:border-b-0"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {query.label}
                    </div>
                    <div className="mt-1 text-sm leading-5 text-slate-600">
                      {query.purpose}
                    </div>
                  </div>
                  <a
                    href={query.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                </div>
                <div className="mt-2 break-all rounded-md bg-slate-50 p-2 font-mono text-xs leading-5 text-slate-600">
                  {query.url}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type MedicationIntakePanelProps = {
  imagePreviewUrl: string;
  intakeText: string;
  intakeResult: MedicationIntakeResult | null;
  isIntakeLoading: boolean;
  isOcrLoading: boolean;
  ocrProgress: number | null;
  ocrError: string | null;
  onImageChange: (file: File | null) => void;
  onTextChange: (value: string) => void;
  onRunOcr: () => void;
  onRunIntake: () => void;
  onConfirmDrug: (drug: string) => void;
};

function MedicationIntakePanel({
  imagePreviewUrl,
  intakeText,
  intakeResult,
  isIntakeLoading,
  isOcrLoading,
  ocrProgress,
  ocrError,
  onImageChange,
  onTextChange,
  onRunOcr,
  onRunIntake,
  onConfirmDrug,
}: MedicationIntakePanelProps) {
  const primaryDrug = intakeResult?.drugCandidates[0];

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <ImageIcon size={15} />
            Medication image intake
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Label-to-FAERS intake
          </h2>
        </div>
        <button
          type="button"
          onClick={onRunIntake}
          disabled={isIntakeLoading || intakeText.trim().length < 8}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <LoadingActionIcon isLoading={isIntakeLoading} Icon={Sparkles} />
          DeepSeek intake
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="block flex-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Evidence image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            <button
              type="button"
              onClick={onRunOcr}
              disabled={isOcrLoading || !imagePreviewUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              <LoadingActionIcon isLoading={isOcrLoading} Icon={ScanText} />
              Run OCR
            </button>
          </div>

          {isOcrLoading || ocrProgress !== null || ocrError ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Browser OCR</span>
                <span>{ocrProgress !== null ? `${Math.round(ocrProgress)}%` : "Ready"}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all"
                  style={{ width: `${ocrProgress ?? 0}%` }}
                />
              </div>
              {ocrError ? (
                <div className="mt-2 text-sm leading-6 text-rose-800">{ocrError}</div>
              ) : (
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  OCR runs locally in the browser and fills the label text field for review.
                </div>
              )}
            </div>
          ) : null}

          <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50">
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreviewUrl}
                alt="Medication evidence preview"
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <ImageIcon size={17} />
                No image selected
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              OCR / label text
            </span>
            <textarea
              value={intakeText}
              onChange={(event) => onTextChange(event.target.value)}
              className="mt-2 min-h-52 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Metformin hydrochloride tablets 500 mg. Adverse reactions..."
            />
          </label>

          {intakeResult ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                  {intakeResult.provider}
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-800">
                  {intakeResult.confidence} confidence
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
                  Schema validated
                </span>
                {intakeResult.promptVersion ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                    {intakeResult.promptVersion}
                  </span>
                ) : null}
                <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
                  Human confirmation
                </span>
                {intakeResult.warning ? (
                  <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">
                    Fallback warning
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Drug candidates
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {intakeResult.drugCandidates.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => onConfirmDrug(candidate)}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-emerald-700 bg-white px-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                      >
                        <Pill size={14} />
                        {candidate}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Strengths
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {intakeResult.strengths.join(", ") || "Not detected"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active ingredients
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {intakeResult.activeIngredients.join(", ") || "Not detected"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk keywords
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {intakeResult.riskKeywords.join(", ") || "Not detected"}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {intakeResult.warning ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Provider warning
                    </div>
                    <div className="mt-1">{intakeResult.warning}</div>
                  </div>
                ) : null}

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Extraction limitations
                  </div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    {intakeResult.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {primaryDrug ? (
                <button
                  type="button"
                  onClick={() => onConfirmDrug(primaryDrug)}
                  className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <CheckCircle2 size={16} />
                  Confirm and run workflow
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PharmacovigilanceDashboard() {
  const [drug, setDrug] = useState("metformin");
  const [analysis, setAnalysis] = useState<FaersAnalysis | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [signal, setSignal] = useState<SignalAnalysis | null>(null);
  const [ranking, setRanking] = useState<SignalRanking | null>(null);
  const [comparatorDrug, setComparatorDrug] = useState("warfarin");
  const [comparison, setComparison] = useState<DrugComparison | null>(null);
  const [reportTone, setReportTone] = useState<ReportTone>("pharmacist-review");
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  const [intakeEvidenceHistory, setIntakeEvidenceHistory] = useState<
    IntakeEvidenceHistoryEntry[]
  >([]);
  const [intakeText, setIntakeText] = useState("");
  const [intakeImageFile, setIntakeImageFile] = useState<File | null>(null);
  const [intakeFileName, setIntakeFileName] = useState<string | undefined>();
  const [intakeImagePreviewUrl, setIntakeImagePreviewUrl] = useState("");
  const [intakeResult, setIntakeResult] = useState<MedicationIntakeResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isSignalLoading, setIsSignalLoading] = useState(false);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [isIntakeLoading, setIsIntakeLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const analysisRequestId = useRef(0);
  const reportRequestId = useRef(0);
  const signalRequestId = useRef(0);
  const rankingRequestId = useRef(0);
  const comparisonRequestId = useRef(0);
  const intakeRequestId = useRef(0);

  const topReaction = useMemo(
    () => (analysis ? firstValue(analysis.topReactions) : "Not loaded"),
    [analysis],
  );

  useEffect(() => {
    window.setTimeout(() => {
      setReportHistory(readReportHistory());
      setIntakeEvidenceHistory(readIntakeEvidenceHistory());
    }, 0);
  }, []);

  useEffect(() => {
    const sharedAnalysis = parseShareableAnalysisParams(window.location.search);

    if (!sharedAnalysis) return;

    void runAnalysis(sharedAnalysis.drug, {
      runWorkflow: sharedAnalysis.runWorkflow,
      syncUrl: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (intakeImagePreviewUrl) {
        URL.revokeObjectURL(intakeImagePreviewUrl);
      }
    };
  }, [intakeImagePreviewUrl]);

  function handleIntakeImageChange(file: File | null) {
    if (intakeImagePreviewUrl) {
      URL.revokeObjectURL(intakeImagePreviewUrl);
    }

    setIntakeImageFile(file);
    setIntakeFileName(file?.name);
    setIntakeImagePreviewUrl(file ? URL.createObjectURL(file) : "");
    setOcrProgress(null);
    setOcrError(null);
  }

  async function runBrowserOcr() {
    if (!intakeImageFile) return;

    setIsOcrLoading(true);
    setOcrProgress(0);
    setOcrError(null);
    setError(null);

    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(intakeImageFile, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });
      const text = result.data.text.trim();

      if (!text) {
        throw new Error("No readable text was detected in the selected image.");
      }

      intakeRequestId.current += 1;
      setIntakeResult(null);
      setIntakeText(text);
      setOcrProgress(100);
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : "Unable to run OCR.");
    } finally {
      setIsOcrLoading(false);
    }
  }

  function syncAnalysisUrl(nextDrug: string, options?: { runWorkflow?: boolean }) {
    const nextSearch = buildShareableAnalysisSearch(nextDrug, options);

    if (window.location.search === nextSearch) return;

    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch}`);
  }

  function saveReportHistory(
    nextAnalysis: FaersAnalysis,
    nextReport: ReportResponse,
    options?: { runWorkflow?: boolean },
  ) {
    const entry = buildReportHistoryEntry(nextAnalysis, nextReport, {
      savedAt: new Date().toISOString(),
      workflowUrl: buildShareableAnalysisSearch(nextAnalysis.drug, options),
    });

    setReportHistory((current) => {
      const nextEntries = addReportHistoryEntry(current, entry);
      window.localStorage.setItem(
        REPORT_HISTORY_STORAGE_KEY,
        JSON.stringify(nextEntries),
      );
      return nextEntries;
    });
  }

  function saveIntakeEvidenceHistory(nextDrug: string) {
    if (!intakeResult) return;

    const entry = buildIntakeEvidenceHistoryEntry(intakeResult, {
      confirmedDrug: nextDrug,
      labelText: intakeText,
      savedAt: new Date().toISOString(),
    });

    setIntakeEvidenceHistory((current) => {
      const nextEntries = addIntakeEvidenceHistoryEntry(current, entry);
      window.localStorage.setItem(
        INTAKE_EVIDENCE_HISTORY_STORAGE_KEY,
        JSON.stringify(nextEntries),
      );
      return nextEntries;
    });
  }

  async function runAnalysis(
    nextDrug = drug,
    options?: { runWorkflow?: boolean; syncUrl?: boolean },
  ) {
    const requestId = analysisRequestId.current + 1;
    analysisRequestId.current = requestId;
    reportRequestId.current += 1;
    signalRequestId.current += 1;
    rankingRequestId.current += 1;
    comparisonRequestId.current += 1;
    setIsLoading(true);
    setIsReporting(false);
    setIsSignalLoading(false);
    setIsRankingLoading(false);
    setIsComparisonLoading(false);
    setIsWorkflowLoading(false);
    setError(null);
    setReport(null);
    setSignal(null);
    setRanking(null);
    setComparison(null);

    try {
      const response = await fetch(`/api/faers?drug=${encodeURIComponent(nextDrug)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to analyze FAERS data.");
      }

      if (requestId !== analysisRequestId.current) return;

      if (options?.syncUrl !== false) {
        syncAnalysisUrl(payload.drug, { runWorkflow: options?.runWorkflow });
      }
      setDrug(payload.drug);
      setAnalysis(payload);
      const nextComparatorDrug = payload.drug.toLowerCase() === "warfarin" ? "metformin" : "warfarin";
      setComparatorDrug(nextComparatorDrug);
      const defaultEvent = payload.topReactions?.[0]?.label ?? "";
      setSelectedEvent(defaultEvent);
      if (options?.runWorkflow) {
        void runWorkflowForAnalysis(payload, nextComparatorDrug);
      } else if (defaultEvent) {
        void runSignal(payload.drug, defaultEvent);
      }
    } catch (error) {
      if (requestId !== analysisRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === analysisRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  async function generateReport() {
    if (!analysis) return;
    const requestId = reportRequestId.current + 1;
    reportRequestId.current = requestId;
    setIsReporting(true);
    setError(null);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis, tone: reportTone }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate report.");
      }

      if (requestId !== reportRequestId.current) return;

      setReport(payload);
      saveReportHistory(analysis, payload);
    } catch (error) {
      if (requestId !== reportRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === reportRequestId.current) {
        setIsReporting(false);
      }
    }
  }

  async function runMedicationIntake() {
    const requestId = intakeRequestId.current + 1;
    intakeRequestId.current = requestId;
    setIsIntakeLoading(true);
    setError(null);
    setIntakeResult(null);

    try {
      const response = await fetch("/api/intake/medication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ocrText: intakeText,
          fileName: intakeFileName,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to extract medication intake.");
      }

      if (requestId !== intakeRequestId.current) return;

      setIntakeResult(payload);
    } catch (error) {
      if (requestId !== intakeRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === intakeRequestId.current) {
        setIsIntakeLoading(false);
      }
    }
  }

  function confirmIntakeDrug(nextDrug: string) {
    if (!nextDrug || nextDrug === "Needs human review") return;
    saveIntakeEvidenceHistory(nextDrug);
    setDrug(nextDrug);
    void runAnalysis(nextDrug, { runWorkflow: true });
  }

  async function runFullWorkflow() {
    if (!analysis) return;
    syncAnalysisUrl(analysis.drug, { runWorkflow: true });
    await runWorkflowForAnalysis(analysis, comparatorDrug);
  }

  async function runWorkflowForAnalysis(
    nextAnalysis: FaersAnalysis,
    nextComparatorDrug = comparatorDrug,
  ) {
    const plan = buildWorkflowRequestPlan(nextAnalysis, nextComparatorDrug);
    setIsWorkflowLoading(true);
    setIsReporting(true);
    setIsSignalLoading(plan.canRunSignal);
    setIsRankingLoading(plan.canRunRanking);
    setIsComparisonLoading(plan.canRunComparison);
    setError(null);

    try {
      setSelectedEvent(plan.defaultEvent);
      setComparatorDrug(plan.comparatorDrug);

      const requests = {
        signal: plan.canRunSignal
          ? fetch(
              `/api/signal?drug=${encodeURIComponent(nextAnalysis.drug)}&event=${encodeURIComponent(plan.defaultEvent)}`,
            )
          : Promise.resolve(null),
        ranking: plan.canRunRanking
          ? fetch(
              `/api/rankings?${new URLSearchParams([
                ["drug", nextAnalysis.drug],
                ...plan.rankingEvents.map((event) => ["event", event] as [string, string]),
              ]).toString()}`,
            )
          : Promise.resolve(null),
        comparison: plan.canRunComparison
          ? fetch(
              `/api/compare?primary=${encodeURIComponent(nextAnalysis.drug)}&comparator=${encodeURIComponent(plan.comparatorDrug)}&event=${encodeURIComponent(plan.defaultEvent)}`,
            )
          : Promise.resolve(null),
        report: fetch("/api/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ analysis: nextAnalysis, tone: reportTone }),
        }),
      };

      const [signalResponse, rankingResponse, comparisonResponse, reportResponse] =
        await Promise.all([
          requests.signal,
          requests.ranking,
          requests.comparison,
          requests.report,
        ]);

      if (signalResponse) {
        const payload = await signalResponse.json();
        if (!signalResponse.ok) throw new Error(payload.error ?? "Unable to compute signal metrics.");
        setSignal(payload);
      }

      if (rankingResponse) {
        const payload = await rankingResponse.json();
        if (!rankingResponse.ok) throw new Error(payload.error ?? "Unable to rank signal candidates.");
        setRanking(payload);
      }

      if (comparisonResponse) {
        const payload = await comparisonResponse.json();
        if (!comparisonResponse.ok) throw new Error(payload.error ?? "Unable to compare drugs.");
        setComparison(payload);
      }

      const reportPayload = await reportResponse.json();
      if (!reportResponse.ok) {
        throw new Error(reportPayload.error ?? "Unable to generate report.");
      }
      setReport(reportPayload);
      saveReportHistory(nextAnalysis, reportPayload, { runWorkflow: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsWorkflowLoading(false);
      setIsReporting(false);
      setIsSignalLoading(false);
      setIsRankingLoading(false);
      setIsComparisonLoading(false);
    }
  }

  async function runComparison() {
    if (!analysis || selectedEvent.trim().length < 2) return;
    const requestId = comparisonRequestId.current + 1;
    comparisonRequestId.current = requestId;
    setIsComparisonLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/compare?primary=${encodeURIComponent(analysis.drug)}&comparator=${encodeURIComponent(comparatorDrug)}&event=${encodeURIComponent(selectedEvent.trim().toUpperCase())}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to compare drugs.");
      }

      if (requestId !== comparisonRequestId.current) return;

      setComparison(payload);
    } catch (error) {
      if (requestId !== comparisonRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === comparisonRequestId.current) {
        setIsComparisonLoading(false);
      }
    }
  }

  async function runRanking() {
    if (!analysis || !analysis.topReactions.length) return;
    const requestId = rankingRequestId.current + 1;
    rankingRequestId.current = requestId;
    setIsRankingLoading(true);
    setError(null);

    const params = new URLSearchParams({
      drug: analysis.drug,
    });
    analysis.topReactions.slice(0, 6).forEach((event) => {
      params.append("event", event.label);
    });

    try {
      const response = await fetch(`/api/rankings?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to rank signal candidates.");
      }

      if (requestId !== rankingRequestId.current) return;

      setRanking(payload);
    } catch (error) {
      if (requestId !== rankingRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === rankingRequestId.current) {
        setIsRankingLoading(false);
      }
    }
  }

  async function runSignal(signalDrug = analysis?.drug ?? drug, event = selectedEvent) {
    const normalizedEvent = event.trim().toUpperCase();
    if (!signalDrug || normalizedEvent.length < 2) return;
    const requestId = signalRequestId.current + 1;
    signalRequestId.current = requestId;
    comparisonRequestId.current += 1;
    setIsSignalLoading(true);
    setIsComparisonLoading(false);
    setError(null);

    try {
      const response = await fetch(
        `/api/signal?drug=${encodeURIComponent(signalDrug)}&event=${encodeURIComponent(normalizedEvent)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to compute signal metrics.");
      }

      if (requestId !== signalRequestId.current) return;

      setSignal(payload);
      setSelectedEvent(payload.event ?? normalizedEvent);
      setComparison(null);
    } catch (error) {
      if (requestId !== signalRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === signalRequestId.current) {
        setIsSignalLoading(false);
      }
    }
  }

  function changeSignalEvent(event: string) {
    signalRequestId.current += 1;
    comparisonRequestId.current += 1;
    setIsSignalLoading(false);
    setIsComparisonLoading(false);
    setSelectedEvent(event.toUpperCase());
    setSignal(null);
    setComparison(null);
  }

  function exportAnalysisCsv() {
    if (!analysis) return;
    downloadCsv(`${slug(analysis.drug)}-faers-analysis.csv`, analysisCsvRows(analysis));
  }

  function exportSignalCsv() {
    if (!signal) return;
    downloadCsv(
      `${slug(signal.drug)}-${slug(signal.event)}-signal.csv`,
      signalCsvRows(signal),
    );
  }

  function exportRankingCsv() {
    if (!ranking) return;
    downloadCsv(`${slug(ranking.drug)}-signal-ranking.csv`, rankingCsvRows(ranking));
  }

  function exportComparisonCsv() {
    if (!comparison) return;
    downloadCsv(
      `${slug(comparison.primaryDrug)}-${slug(comparison.comparatorDrug)}-${slug(comparison.event)}-comparison.csv`,
      comparisonCsvRows(comparison),
    );
  }

  function exportReportPdf() {
    if (!analysis || !report) return;
    toPdfFile(analysis, report, signal, ranking, comparison);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAnalysis();
  }

  return (
    <main translate="no" className="min-h-screen bg-slate-50 text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Activity size={18} />
                AI Pharmacovigilance Platform
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                FAERS adverse event intelligence
              </h1>
            </div>

            <form
              onSubmit={submitForm}
              className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl"
            >
              <label className="sr-only" htmlFor="drug">
                Drug name
              </label>
              <input
                id="drug"
                value={drug}
                onChange={(event) => setDrug(event.target.value)}
                className="h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Drug name"
              />
              <button
                type="submit"
                disabled={isLoading || drug.trim().length < 2}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <LoadingActionIcon isLoading={isLoading} Icon={Search} size={17} />
                Analyze
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setDrug(example);
                  void runAnalysis(example);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-800"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {reportHistory.length ? (
          <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Saved reviewer history
                </div>
                <h2 className="text-base font-semibold text-slate-950">
                  Recent AI safety reports
                </h2>
              </div>
              <div className="text-xs leading-5 text-slate-500">
                Stored locally in this browser
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {reportHistory.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {item.drug}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {formatSavedAt(item.savedAt)} · {item.mode} · {item.promptVersion}
                      </div>
                    </div>
                    <a
                      href={item.workflowUrl}
                      className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
                    >
                      <ExternalLink size={13} />
                      Open
                    </a>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-700">Top reaction:</span>{" "}
                      {item.topReaction}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Reports:</span>{" "}
                      {formatNumber(item.totalReports)}
                    </div>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                    {item.reportTitle}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <MedicationIntakePanel
          imagePreviewUrl={intakeImagePreviewUrl}
          intakeText={intakeText}
          intakeResult={intakeResult}
          isIntakeLoading={isIntakeLoading}
          isOcrLoading={isOcrLoading}
          ocrProgress={ocrProgress}
          ocrError={ocrError}
          onImageChange={handleIntakeImageChange}
          onTextChange={(value) => {
            intakeRequestId.current += 1;
            setIntakeResult(null);
            setIntakeText(value);
          }}
          onRunOcr={() => void runBrowserOcr()}
          onRunIntake={() => void runMedicationIntake()}
          onConfirmDrug={confirmIntakeDrug}
        />

        {intakeEvidenceHistory.length ? (
          <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Confirmed intake evidence
                </div>
                <h2 className="text-base font-semibold text-slate-950">
                  Human-reviewed label candidates
                </h2>
              </div>
              <div className="text-xs leading-5 text-slate-500">
                Stored locally after confirmation
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {intakeEvidenceHistory.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-slate-950">
                          {item.confirmedDrug}
                        </div>
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                          confirmed
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {formatSavedAt(item.savedAt)} · {item.provider} · {item.confidence}
                        {" "}confidence
                      </div>
                    </div>
                    <div className="text-xs leading-5 text-slate-500">
                      {item.fileName ?? item.sourceType}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-700">Candidates:</span>{" "}
                      {item.drugCandidates.join(", ")}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Strengths:</span>{" "}
                      {item.strengths.join(", ") || "Not detected"}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Ingredients:</span>{" "}
                      {item.activeIngredients.join(", ") || "Not detected"}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Keywords:</span>{" "}
                      {item.riskKeywords.join(", ") || "Not detected"}
                    </div>
                  </div>
                  <div className="mt-2 rounded-md bg-white p-2 text-sm leading-6 text-slate-700">
                    {item.textSnippet}
                  </div>
                  {item.limitations.length ? (
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {item.limitations[0]}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div
          data-testid="dashboard-overview"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            label="Matched reports"
            value={analysis ? formatNumber(analysis.totalReports) : "-"}
            detail={analysis ? "Suspect-drug FAERS matches" : "Run a query"}
          />
          <MetricCard
            label="Count basis"
            value={analysis ? formatNumber(analysis.sampleSize) : "-"}
            detail="Aggregate FAERS query basis"
          />
          <MetricCard
            label="Top reaction"
            value={topReaction}
            detail="MedDRA preferred term"
          />
          <MetricCard
            label="Source"
            value={analysis ? "openFDA" : "-"}
            detail={analysis ? "Drug adverse event endpoint" : "Pending"}
          />
        </div>

        {analysis ? (
          <>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void runFullWorkflow()}
                disabled={isWorkflowLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <LoadingActionIcon isLoading={isWorkflowLoading} Icon={Sparkles} />
                Run full workflow
              </button>
              <button
                type="button"
                onClick={exportAnalysisCsv}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
              >
                <Download size={16} />
                Export analysis CSV
              </button>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <ChartPanel title="Top reported adverse reactions" eyebrow="MedDRA PT">
                <HorizontalBars data={analysis.topReactions} />
              </ChartPanel>
              <ChartPanel title="Serious vs non-serious reports" eyebrow="Aggregate">
                <DonutChart data={analysis.seriousness} />
              </ChartPanel>
              <ChartPanel title="Serious outcome flags" eyebrow="Aggregate">
                <HorizontalBars data={analysis.seriousOutcomes} color="#be123c" />
              </ChartPanel>
              <ChartPanel title="Report year trend" eyebrow="Year ranges">
                <TrendChart data={analysis.yearTrend} />
              </ChartPanel>
              <ChartPanel title="Patient sex distribution" eyebrow="Aggregate">
                <DonutChart data={analysis.sexDistribution} />
              </ChartPanel>
              <ChartPanel title="Patient age distribution" eyebrow="Age in years">
                <HorizontalBars data={analysis.ageDistribution} color="#ca8a04" />
              </ChartPanel>
            </div>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Reviewer view
                    </div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Safety highlights
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="report-tone">
                      Report tone
                    </label>
                    <select
                      id="report-tone"
                      value={reportTone}
                      onChange={(event) =>
                        setReportTone(event.target.value as ReportTone)
                      }
                      className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      {reportToneEntries.map(([value, option]) => (
                        <option key={value} value={value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={generateReport}
                      disabled={isReporting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <LoadingActionIcon isLoading={isReporting} Icon={FileText} />
                      Report
                    </button>
                  </div>
                </div>

                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {analysis.highlights.map((item) => (
                    <li key={item} className="rounded-md bg-slate-50 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                data-testid="ai-report"
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex min-h-10 items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      AI summary
                    </div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Pharmacovigilance report
                    </h2>
                  </div>
                  {report ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={exportReportPdf}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                      >
                        <Download size={16} />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => toMarkdownFile(analysis.drug, report.report)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
                      >
                        <Download size={16} />
                        MD
                      </button>
                    </div>
                  ) : null}
                </div>

                {report ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
                        {report.mode === "openai" ? report.model : "Template mode"}
                      </span>
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                        {report.promptVersion}
                      </span>
                      <span className="rounded-md bg-violet-100 px-2 py-1 text-violet-800">
                        {REPORT_TONE_OPTIONS[report.tone].label}
                      </span>
                      <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-800">
                        Schema validated
                      </span>
                      {report.warning ? (
                        <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
                          Fallback
                        </span>
                      ) : null}
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Quality guardrails
                      </div>
                      <ul className="mt-2 grid gap-2 text-sm leading-5 text-slate-700 md:grid-cols-2">
                        {report.qualityChecklist.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Safety signal overview
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {report.structuredReport.safetySignalOverview}
                          </p>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Key patterns
                          </div>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                            {report.structuredReport.keyPatterns.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Reviewer follow-up
                          </div>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                            {report.structuredReport.reviewerFollowUp.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Raw statistics anchor
                          </div>
                          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <dt className="text-slate-500">Reports</dt>
                              <dd className="font-semibold text-slate-950">
                                {formatNumber(analysis.totalReports)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500">Top reaction</dt>
                              <dd className="font-semibold text-slate-950">
                                {topReaction}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500">Source</dt>
                              <dd className="font-semibold text-slate-950">
                                {analysis.source.name}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-slate-500">Mode</dt>
                              <dd className="font-semibold text-slate-950">
                                {report.mode}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Limitations
                          </div>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                            {report.structuredReport.limitations.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <details className="rounded-md border border-slate-200 bg-white">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">
                        Markdown preview
                      </summary>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-50">
                        {report.report}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    Report pending
                  </div>
                )}
              </div>
            </section>

            <SignalPanel
              analysis={analysis}
              selectedEvent={selectedEvent}
              signal={signal}
              isSignalLoading={isSignalLoading}
              onEventChange={changeSignalEvent}
              onRunSignal={() => void runSignal()}
              onExportSignalCsv={exportSignalCsv}
            />

            <SignalRankingPanel
              analysis={analysis}
              ranking={ranking}
              isRankingLoading={isRankingLoading}
              onRunRanking={() => void runRanking()}
              onExportRankingCsv={exportRankingCsv}
            />

            <ComparisonPanel
              primaryDrug={analysis.drug}
              selectedEvent={selectedEvent}
              comparatorDrug={comparatorDrug}
              comparison={comparison}
              isComparisonLoading={isComparisonLoading}
              onComparatorChange={(value) => {
                comparisonRequestId.current += 1;
                setIsComparisonLoading(false);
                setComparatorDrug(value);
                setComparison(null);
              }}
              onRunComparison={() => void runComparison()}
              onExportComparisonCsv={exportComparisonCsv}
            />

            <SourceQueryPanel analysis={analysis} />

            <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle size={17} />
                FAERS interpretation limits
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {analysis.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <div className="mt-6 flex min-h-[28rem] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            Waiting for first analysis
          </div>
        )}
      </div>
    </main>
  );
}
