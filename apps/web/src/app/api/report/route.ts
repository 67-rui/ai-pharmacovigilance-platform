import { NextResponse } from "next/server";
import { z } from "zod";
import {
  REPORT_PROMPT_VERSION,
  REPORT_QUALITY_CHECKLIST,
  buildTemplateStructuredReport,
  parseStructuredReport,
  structuredReportToMarkdown,
} from "../../../lib/report";
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

function buildPrompt(analysis: FaersAnalysis) {
  return [
    "You are preparing a pharmacovigilance triage report for a pharmacist or drug safety reviewer.",
    `Prompt version: ${REPORT_PROMPT_VERSION}.`,
    "Use only the JSON statistics below. Do not invent clinical facts or causal claims.",
    "Return strict JSON only. Do not wrap it in Markdown or a code fence.",
    "The JSON object must contain these keys exactly: title, safetySignalOverview, keyPatterns, reviewerFollowUp, limitations, qualityChecks.",
    "Use concise reviewer-ready language. keyPatterns, reviewerFollowUp, limitations, and qualityChecks must be arrays of strings.",
    "Always state that FAERS reports cannot establish incidence or causality and that this is not medical advice.",
    "Quality checklist that must be satisfied:",
    ...REPORT_QUALITY_CHECKLIST.map((item) => `- ${item}`),
    "",
    JSON.stringify(analysis, null, 2),
  ].join("\n");
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}

function buildTemplateResponse(
  analysis: FaersAnalysis,
  warning?: string,
): ReportResponse {
  const structuredReport = buildTemplateStructuredReport(analysis);

  return {
    mode: "template",
    report: structuredReportToMarkdown(structuredReport),
    structuredReport,
    promptVersion: REPORT_PROMPT_VERSION,
    qualityChecklist: REPORT_QUALITY_CHECKLIST,
    warning,
  };
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

  const reportText = extractResponseText(await response.json()).trim();
  if (!reportText) {
    throw new Error("OpenAI returned an empty report.");
  }
  const structuredReport = parseStructuredReport(parseJsonFromText(reportText));

  return {
    mode: "openai",
    model,
    report: structuredReportToMarkdown(structuredReport),
    structuredReport,
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
    return NextResponse.json(
      buildTemplateResponse(
        analysis,
        "OPENAI_API_KEY is not configured; generated a local template report.",
      ),
    );
  }

  try {
    return NextResponse.json(await generateOpenAiReport(analysis));
  } catch (error) {
    const warning =
      error instanceof Error ? error.message : "OpenAI report generation failed.";

    return NextResponse.json(buildTemplateResponse(analysis, warning));
  }
}
