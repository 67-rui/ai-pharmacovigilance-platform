export type OcrQuality = "poor" | "fair" | "good";

export type OcrQualitySignal =
  | "drug-candidate"
  | "strength"
  | "dosage-form"
  | "safety-keyword"
  | "multi-line-label";

export type OcrQualityAssessment = {
  quality: OcrQuality;
  score: number;
  requiresReview: boolean;
  signals: OcrQualitySignal[];
  warnings: string[];
  recommendedNextStep: string;
};

const knownDrugPattern =
  /\b(?:metformin|ibuprofen|warfarin|atorvastatin|aspirin|acetaminophen|paracetamol)\b/i;
const strengthPattern = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%)\b/i;
const dosageFormPattern =
  /\b(?:tablets?|capsules?|injection|solution|cream|ointment|suspension)\b/i;
const genericMedicationLinePattern =
  /\b[A-Z][A-Za-z-]{3,}(?:\s+[A-Za-z-]{3,}){0,2}\s+(?:tablets?|capsules?|injection|solution|cream|ointment|suspension)\b/;
const safetyKeywordPattern =
  /\b(?:warning|warnings|adverse reactions?|contraindications?|boxed warning|interactions?|precautions?)\b/i;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function readableRatio(text: string) {
  if (!text.length) return 0;
  const readableCharacters = text.match(/[A-Za-z0-9\s.,;:()/%-]/g)?.length ?? 0;
  return readableCharacters / text.length;
}

export function assessOcrTextQuality(text: string): OcrQualityAssessment {
  const normalized = text.trim().replace(/\s+/g, " ");
  const wordCount = normalized ? normalized.split(" ").length : 0;
  const ratio = readableRatio(normalized);
  const lineCount = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;

  const signals: OcrQualitySignal[] = [];
  if (knownDrugPattern.test(normalized) || genericMedicationLinePattern.test(text)) {
    signals.push("drug-candidate");
  }
  if (strengthPattern.test(normalized)) signals.push("strength");
  if (dosageFormPattern.test(normalized)) signals.push("dosage-form");
  if (safetyKeywordPattern.test(normalized)) signals.push("safety-keyword");
  if (lineCount >= 2) signals.push("multi-line-label");

  let score = 20;
  if (normalized.length >= 80) score += 20;
  else if (normalized.length >= 40) score += 12;
  else if (normalized.length >= 24) score += 5;

  if (wordCount >= 12) score += 15;
  else if (wordCount >= 6) score += 8;

  if (signals.includes("drug-candidate")) score += 20;
  if (signals.includes("strength")) score += 18;
  if (signals.includes("dosage-form")) score += 10;
  if (signals.includes("safety-keyword")) score += 15;
  if (signals.includes("multi-line-label")) score += 8;

  if (ratio >= 0.92) score += 10;
  else if (ratio < 0.78) score -= 18;

  const finalScore = clampScore(score);
  const quality: OcrQuality =
    finalScore >= 75 ? "good" : finalScore >= 45 ? "fair" : "poor";

  const warnings: string[] = [];
  if (normalized.length < 40 || wordCount < 6) {
    warnings.push(
      "OCR text is short or sparse; verify the medication name manually.",
    );
  }
  if (!signals.includes("drug-candidate")) {
    warnings.push("No known medication candidate was confidently detected.");
  }
  if (!signals.includes("strength")) {
    warnings.push("No medication strength pattern was detected.");
  }
  if (ratio < 0.78) {
    warnings.push("OCR text contains noisy characters that may indicate misreads.");
  }

  const recommendedNextStep =
    quality === "good"
      ? "Review the extracted text, then run medication intake."
      : "Try Enhanced OCR, crop the label, or edit the text before running medication intake.";

  return {
    quality,
    score: finalScore,
    requiresReview: quality !== "good",
    signals,
    warnings,
    recommendedNextStep,
  };
}
