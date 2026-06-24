import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MEDICATION_INTAKE_PROMPT_VERSION,
  buildFallbackMedicationIntake,
  parseMedicationIntake,
} from "../../../../lib/medicationIntake";
import type { MedicationIntakeResult } from "@/lib/types";

const bodySchema = z.object({
  ocrText: z.string().min(8).max(8000),
  fileName: z.string().max(240).optional(),
});

function buildPrompt(input: z.infer<typeof bodySchema>) {
  return [
    "You are extracting structured medication-label information for a pharmacovigilance workflow.",
    `Prompt version: ${MEDICATION_INTAKE_PROMPT_VERSION}.`,
    "Use only the OCR/user-provided text. Do not infer facts that are not present.",
    "Return strict JSON only. Do not wrap it in Markdown or a code fence.",
    "The JSON object must contain: provider, drugCandidates, activeIngredients, strengths, dosageForm, riskKeywords, confidence, needsHumanConfirmation, extractedText, evidence, limitations.",
    'provider must be "deepseek". confidence must be "low", "medium", or "high". evidence.sourceType must be "ocr-text".',
    "Set needsHumanConfirmation to true unless the OCR text is exceptionally clear.",
    "Do not provide diagnosis, treatment, dosing, or medication-use advice.",
    "OCR text:",
    input.ocrText,
    "",
    `File name: ${input.fileName ?? "not provided"}`,
  ].join("\n");
}

function extractDeepSeekText(payload: unknown) {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateDeepSeekIntake(
  input: z.infer<typeof bodySchema>,
): Promise<MedicationIntakeResult> {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
      temperature: 0.1,
      max_tokens: 900,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek medication intake failed: ${text}`);
  }

  const content = extractDeepSeekText(await response.json());
  if (!content) {
    throw new Error("DeepSeek returned an empty medication intake response.");
  }

  return parseMedicationIntake(content);
}

function buildFallbackResponse(
  input: z.infer<typeof bodySchema>,
  warning?: string,
) {
  return {
    ...buildFallbackMedicationIntake(input),
    warning,
    promptVersion: MEDICATION_INTAKE_PROMPT_VERSION,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid medication intake payload." },
      { status: 400 },
    );
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      buildFallbackResponse(
        parsed.data,
        "DEEPSEEK_API_KEY is not configured; generated a local fallback extraction.",
      ),
    );
  }

  try {
    const result = await generateDeepSeekIntake(parsed.data);
    return NextResponse.json({
      ...result,
      promptVersion: MEDICATION_INTAKE_PROMPT_VERSION,
    });
  } catch (error) {
    const warning =
      error instanceof Error ? error.message : "DeepSeek medication intake failed.";
    return NextResponse.json(buildFallbackResponse(parsed.data, warning));
  }
}
