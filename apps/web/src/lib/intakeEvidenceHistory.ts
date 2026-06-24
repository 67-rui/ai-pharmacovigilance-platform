import type { MedicationIntakeResult } from "./types";

export const INTAKE_EVIDENCE_HISTORY_STORAGE_KEY =
  "ai-pv-intake-evidence-history-v1";
export const MAX_INTAKE_EVIDENCE_HISTORY_ENTRIES = 8;

export type IntakeEvidenceHistoryEntry = {
  id: string;
  savedAt: string;
  confirmedDrug: string;
  provider: MedicationIntakeResult["provider"];
  confidence: MedicationIntakeResult["confidence"];
  fileName?: string;
  sourceType: MedicationIntakeResult["evidence"]["sourceType"];
  drugCandidates: string[];
  activeIngredients: string[];
  strengths: string[];
  riskKeywords: string[];
  promptVersion?: string;
  textSnippet: string;
  limitations: string[];
};

function normalizeDrug(value: string) {
  return value.trim().toLowerCase();
}

function entryId(drug: string, savedAt: string) {
  return `${normalizeDrug(drug).replace(/[^a-z0-9]+/g, "-")}-${savedAt}`;
}

function snippet(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 180);
}

export function buildIntakeEvidenceHistoryEntry(
  intakeResult: MedicationIntakeResult,
  options: { confirmedDrug: string; labelText: string; savedAt: string },
): IntakeEvidenceHistoryEntry {
  return {
    id: entryId(options.confirmedDrug, options.savedAt),
    savedAt: options.savedAt,
    confirmedDrug: options.confirmedDrug,
    provider: intakeResult.provider,
    confidence: intakeResult.confidence,
    fileName: intakeResult.evidence.fileName,
    sourceType: intakeResult.evidence.sourceType,
    drugCandidates: intakeResult.drugCandidates,
    activeIngredients: intakeResult.activeIngredients,
    strengths: intakeResult.strengths,
    riskKeywords: intakeResult.riskKeywords,
    promptVersion: intakeResult.promptVersion,
    textSnippet: snippet(options.labelText || intakeResult.extractedText),
    limitations: intakeResult.limitations,
  };
}

export function addIntakeEvidenceHistoryEntry(
  entries: IntakeEvidenceHistoryEntry[],
  entry: IntakeEvidenceHistoryEntry,
  maxEntries = MAX_INTAKE_EVIDENCE_HISTORY_ENTRIES,
) {
  const nextEntries = entries.filter(
    (item) => normalizeDrug(item.confirmedDrug) !== normalizeDrug(entry.confirmedDrug),
  );

  return [entry, ...nextEntries].slice(0, maxEntries);
}
