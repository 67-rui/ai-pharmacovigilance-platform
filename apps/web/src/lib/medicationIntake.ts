import { z } from "zod";
import type { MedicationIntakeResult } from "./types";

export const MEDICATION_INTAKE_PROMPT_VERSION =
  "medication-label-intake-v1";

export const medicationIntakeSchema = z.object({
  provider: z.enum(["deepseek", "fallback"]),
  drugCandidates: z.array(z.string().min(2).max(120)).min(1).max(8),
  activeIngredients: z.array(z.string().min(2).max(160)).max(8),
  strengths: z.array(z.string().min(1).max(80)).max(8),
  dosageForm: z.string().max(120).optional(),
  riskKeywords: z.array(z.string().min(2).max(120)).max(12),
  confidence: z.enum(["low", "medium", "high"]),
  needsHumanConfirmation: z.boolean(),
  extractedText: z.string().max(8000),
  evidence: z.object({
    fileName: z.string().max(240).optional(),
    sourceType: z.enum(["ocr-text", "image-metadata"]),
  }),
  limitations: z.array(z.string().min(5).max(280)).min(1).max(8),
});

type IntakeInput = {
  ocrText: string;
  fileName?: string;
};

const knownDrugPatterns = [
  { pattern: /\bmetformin(?:\s+hydrochloride)?\b/i, name: "Metformin" },
  { pattern: /\bibuprofen\b/i, name: "Ibuprofen" },
  { pattern: /\bwarfarin\b/i, name: "Warfarin" },
  { pattern: /\batorvastatin\b/i, name: "Atorvastatin" },
  { pattern: /\baspirin\b/i, name: "Aspirin" },
  { pattern: /\bacetaminophen\b|\bparacetamol\b/i, name: "Acetaminophen" },
];

const riskKeywordPatterns = [
  { pattern: /\badverse reactions?\b/i, keyword: "adverse reactions" },
  { pattern: /\bcontraindications?\b/i, keyword: "contraindications" },
  { pattern: /\bwarnings?\b/i, keyword: "warning" },
  { pattern: /\bblack box\b|\bboxed warning\b/i, keyword: "boxed warning" },
  { pattern: /\brenal impairment\b/i, keyword: "renal impairment" },
  { pattern: /\bhepatic impairment\b/i, keyword: "hepatic impairment" },
  { pattern: /\bpregnancy\b/i, keyword: "pregnancy" },
  { pattern: /\binteraction\b|\binteractions\b/i, keyword: "interactions" },
];

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function formatIngredient(value: string) {
  return titleCase(value).replace(/\bHydrochloride\b/g, "hydrochloride");
}

function extractDrugCandidates(text: string) {
  const known = knownDrugPatterns
    .filter((item) => item.pattern.test(text))
    .map((item) => item.name);

  if (known.length) return unique(known);

  const firstMedicationLikeLine = text
    .split(/\r?\n|[.;]/)
    .map((line) => line.trim())
    .find((line) => /\b(tablets?|capsules?|injection|solution|cream)\b/i.test(line));

  const candidate = firstMedicationLikeLine
    ?.replace(/\b(tablets?|capsules?|injection|solution|cream).*$/i, "")
    .trim();

  return candidate ? [titleCase(candidate)] : ["Needs human review"];
}

function extractIngredients(text: string, candidates: string[]) {
  const ingredients = [];
  const hydrochlorideMatch = text.match(/\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+hydrochloride\b/i);

  if (hydrochlorideMatch) {
    ingredients.push(formatIngredient(`${hydrochlorideMatch[1]} hydrochloride`));
  }

  return unique([...ingredients, ...candidates]);
}

function extractStrengths(text: string) {
  return unique(
    Array.from(text.matchAll(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%)\b/gi)).map(
      (match) => match[0].replace(/\s+/g, " "),
    ),
  );
}

function extractRiskKeywords(text: string) {
  return unique(
    riskKeywordPatterns
      .filter((item) => item.pattern.test(text))
      .map((item) => item.keyword),
  );
}

function extractDosageForm(text: string) {
  const match = text.match(
    /\b(tablets?|capsules?|injection|solution|cream|ointment|suspension)\b/i,
  );
  return match ? match[0].toLowerCase() : undefined;
}

export function buildFallbackMedicationIntake(
  input: IntakeInput,
): MedicationIntakeResult {
  const text = input.ocrText.trim();
  const drugCandidates = extractDrugCandidates(text);

  return {
    provider: "fallback",
    drugCandidates,
    activeIngredients: extractIngredients(text, drugCandidates),
    strengths: extractStrengths(text),
    dosageForm: extractDosageForm(text),
    riskKeywords: extractRiskKeywords(text),
    confidence: drugCandidates[0] === "Needs human review" ? "low" : "medium",
    needsHumanConfirmation: true,
    extractedText: text,
    evidence: {
      fileName: input.fileName,
      sourceType: text ? "ocr-text" : "image-metadata",
    },
    limitations: [
      "This intake result depends on OCR or user-provided label text and may miss or misread fields.",
      "Medication extraction must be confirmed by a human before FAERS analysis.",
      "This workflow does not provide diagnosis, treatment, or medication-use advice.",
    ],
  };
}

export function parseMedicationIntake(value: string | unknown) {
  if (typeof value !== "string") {
    return medicationIntakeSchema.parse(value) as MedicationIntakeResult;
  }

  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return medicationIntakeSchema.parse(
    JSON.parse(fenced?.[1] ?? trimmed),
  ) as MedicationIntakeResult;
}
