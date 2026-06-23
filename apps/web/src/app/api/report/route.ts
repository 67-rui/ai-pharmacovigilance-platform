import { NextResponse } from "next/server";
import { z } from "zod";
import type { FaersAnalysis, ReportResponse } from "@/lib/types";

const chartDatumSchema = z.object({
  label: z.string(),
  value: z.number(),
});

const analysisSchema = z.object({
  drug: z.string(),
  generatedAt: z.string(),
  totalReports: z.number(),
  sampleSize: z.number(),
  search: z.string(),
  topReactions: z.array(chartDatumSchema),
  seriousness: z.array(chartDatumSchema),
  seriousOutcomes: z.array(chartDatumSchema),
  sexDistribution: z.array(chartDatumSchema),
  ageDistribution: z.array(chartDatumSchema),
  yearTrend: z.array(chartDatumSchema),
  roleDistribution: z.array(chartDatumSchema),
  highlights: z.array(z.string()),
  limitations: z.array(z.string()),
  source: z.object({
    name: z.string(),
    url: z.string(),
    endpoint: z.string(),
    search: z.string(),
    assumptions: z.array(z.string()),
    queries: z.array(
      z.object({
        label: z.string(),
        purpose: z.string(),
        url: z.string(),
      }),
    ),
  }),
});

const bodySchema = z.object({
  analysis: analysisSchema,
});

const REPORT_PROMPT_VERSION = "faers-safety-report-v1";

const REPORT_QUALITY_CHECKLIST = [
  "No causal claims from FAERS report counts.",
  "No incidence, prevalence, or true-risk estimates.",
  "FAERS limitations are stated explicitly.",
  "Reviewer follow-up questions are included.",
  "Signal language is framed as hypothesis generation.",
];

function listTop(items: { label: string; value: number }[], limit = 5) {
  return items
    .slice(0, limit)
    .map((item) => `${item.label} (${item.value.toLocaleString()})`)
    .join(", ");
}

function templateReport(analysis: FaersAnalysis) {
  return [
    `## ${analysis.drug} FAERS Safety Summary`,
    "",
    `The openFDA FAERS query matched ${analysis.totalReports.toLocaleString()} suspect-drug reports. Dashboard panels are generated from aggregate FAERS count queries for adverse reactions, demographics, seriousness, outcomes, and reporting year ranges.`,
    "",
    "### Signal Triage",
    `- Most frequently reported reactions: ${listTop(analysis.topReactions) || "not available"}.`,
    `- Seriousness distribution: ${listTop(analysis.seriousness, 2) || "not available"}.`,
    `- Serious outcome flags: ${listTop(analysis.seriousOutcomes) || "not available"}.`,
    "",
    "### Demographic Pattern",
    `- Sex distribution: ${listTop(analysis.sexDistribution, 3) || "not available"}.`,
    `- Age distribution: ${listTop(analysis.ageDistribution, 7) || "not available"}.`,
    "",
    "### Reviewer Notes",
    "- Treat these counts as signal-triage inputs rather than incidence estimates.",
    "- Review duplicate handling, co-medications, indication, dose, chronology, and dechallenge/rechallenge evidence before escalating a signal.",
    "- Compare against class alternatives and background disease risk before forming a hypothesis.",
    "",
    "### Report Quality Checklist",
    ...REPORT_QUALITY_CHECKLIST.map((item) => `- ${item}`),
    "",
    "### Limitations",
    ...analysis.limitations.map((item) => `- ${item}`),
  ].join("\n");
}

function buildPrompt(analysis: FaersAnalysis) {
  return [
    "You are preparing a pharmacovigilance triage report for a pharmacist or drug safety reviewer.",
    `Prompt version: ${REPORT_PROMPT_VERSION}.`,
    "Use only the JSON statistics below. Do not invent clinical facts or causal claims.",
    "Write concise Markdown with these sections: Safety Signal Overview, Key Patterns, Reviewer Follow-up, Limitations.",
    "Always state that FAERS reports cannot establish incidence or causality and that this is not medical advice.",
    "Quality checklist that must be satisfied:",
    ...REPORT_QUALITY_CHECKLIST.map((item) => `- ${item}`),
    "",
    JSON.stringify(analysis, null, 2),
  ].join("\n");
}

function extractResponseText(payload: unknown) {
  const data = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
        type?: string;
      }>;
    }>;
  };

  if (data.output_text) {
    return data.output_text;
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

async function generateOpenAiReport(
  analysis: FaersAnalysis,
): Promise<ReportResponse> {
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(analysis),
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI report generation failed: ${text}`);
  }

  const report = extractResponseText(await response.json()).trim();
  if (!report) {
    throw new Error("OpenAI returned an empty report.");
  }

  return {
    mode: "openai",
    model,
    report,
    promptVersion: REPORT_PROMPT_VERSION,
    qualityChecklist: REPORT_QUALITY_CHECKLIST,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON request body.",
      },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid FAERS analysis payload.",
      },
      { status: 400 },
    );
  }

  const analysis = parsed.data.analysis as FaersAnalysis;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      mode: "template",
      report: templateReport(analysis),
      promptVersion: REPORT_PROMPT_VERSION,
      qualityChecklist: REPORT_QUALITY_CHECKLIST,
      warning: "OPENAI_API_KEY is not configured; generated a local template report.",
    } satisfies ReportResponse);
  }

  try {
    return NextResponse.json(await generateOpenAiReport(analysis));
  } catch (error) {
    const warning =
      error instanceof Error ? error.message : "OpenAI report generation failed.";

    return NextResponse.json({
      mode: "template",
      report: templateReport(analysis),
      promptVersion: REPORT_PROMPT_VERSION,
      qualityChecklist: REPORT_QUALITY_CHECKLIST,
      warning,
    } satisfies ReportResponse);
  }
}
