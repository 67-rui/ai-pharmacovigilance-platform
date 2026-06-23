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
  Database,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import type {
  ChartDatum,
  DrugComparison,
  FaersAnalysis,
  ReportResponse,
  SignalAnalysis,
  SignalRanking,
} from "@/lib/types";

const pieColors = ["#0f766e", "#be123c", "#2563eb", "#64748b"];
const examples = ["metformin", "atorvastatin", "ibuprofen", "warfarin"];

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
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                {ranking.rows.map((row, index) => (
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
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

export function PharmacovigilanceDashboard() {
  const [drug, setDrug] = useState("metformin");
  const [analysis, setAnalysis] = useState<FaersAnalysis | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [signal, setSignal] = useState<SignalAnalysis | null>(null);
  const [ranking, setRanking] = useState<SignalRanking | null>(null);
  const [comparatorDrug, setComparatorDrug] = useState("warfarin");
  const [comparison, setComparison] = useState<DrugComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isSignalLoading, setIsSignalLoading] = useState(false);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisRequestId = useRef(0);
  const reportRequestId = useRef(0);
  const signalRequestId = useRef(0);
  const rankingRequestId = useRef(0);
  const comparisonRequestId = useRef(0);

  const topReaction = useMemo(
    () => (analysis ? firstValue(analysis.topReactions) : "Not loaded"),
    [analysis],
  );

  async function runAnalysis(nextDrug = drug) {
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

      setAnalysis(payload);
      setComparatorDrug(payload.drug.toLowerCase() === "warfarin" ? "metformin" : "warfarin");
      const defaultEvent = payload.topReactions?.[0]?.label ?? "";
      setSelectedEvent(defaultEvent);
      if (defaultEvent) {
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
        body: JSON.stringify({ analysis }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate report.");
      }

      if (requestId !== reportRequestId.current) return;

      setReport(payload);
    } catch (error) {
      if (requestId !== reportRequestId.current) return;
      setError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      if (requestId === reportRequestId.current) {
        setIsReporting(false);
      }
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <div className="mt-4 flex justify-end">
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

                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  {analysis.highlights.map((item) => (
                    <li key={item} className="rounded-md bg-slate-50 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                    <button
                      type="button"
                      onClick={() => toMarkdownFile(analysis.drug, report.report)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
                    >
                      <Download size={16} />
                      MD
                    </button>
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
