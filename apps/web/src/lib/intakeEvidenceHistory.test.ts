import { describe, expect, it } from "vitest";
import {
  addIntakeEvidenceHistoryEntry,
  buildIntakeEvidenceHistoryEntry,
} from "./intakeEvidenceHistory";
import type { MedicationIntakeResult } from "./types";

const intakeResult: MedicationIntakeResult = {
  provider: "fallback",
  drugCandidates: ["Metformin", "Metformin hydrochloride"],
  activeIngredients: ["metformin hydrochloride"],
  strengths: ["500 mg"],
  dosageForm: "tablet",
  riskKeywords: ["adverse reactions", "contraindications"],
  confidence: "medium",
  needsHumanConfirmation: true,
  extractedText: "Metformin hydrochloride tablets 500 mg",
  evidence: {
    fileName: "metformin-label.png",
    sourceType: "ocr-text",
  },
  limitations: ["OCR text may be incomplete."],
};

describe("intake evidence history", () => {
  it("builds a confirmed evidence record from a medication intake result", () => {
    const entry = buildIntakeEvidenceHistoryEntry(intakeResult, {
      confirmedDrug: "Metformin",
      labelText:
        "Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea.",
      savedAt: "2026-06-24T01:00:00.000Z",
    });

    expect(entry).toEqual({
      id: "metformin-2026-06-24T01:00:00.000Z",
      savedAt: "2026-06-24T01:00:00.000Z",
      confirmedDrug: "Metformin",
      provider: "fallback",
      confidence: "medium",
      fileName: "metformin-label.png",
      sourceType: "ocr-text",
      drugCandidates: ["Metformin", "Metformin hydrochloride"],
      activeIngredients: ["metformin hydrochloride"],
      strengths: ["500 mg"],
      riskKeywords: ["adverse reactions", "contraindications"],
      promptVersion: undefined,
      textSnippet:
        "Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea.",
      limitations: ["OCR text may be incomplete."],
    });
  });

  it("keeps the newest confirmation first and deduplicates by confirmed drug", () => {
    const first = buildIntakeEvidenceHistoryEntry(intakeResult, {
      confirmedDrug: "Metformin",
      labelText: "First label text",
      savedAt: "2026-06-24T01:00:00.000Z",
    });
    const second = buildIntakeEvidenceHistoryEntry(intakeResult, {
      confirmedDrug: "metformin",
      labelText: "Updated label text",
      savedAt: "2026-06-24T02:00:00.000Z",
    });

    expect(addIntakeEvidenceHistoryEntry([first], second)).toEqual([second]);
  });

  it("limits saved evidence records", () => {
    const entries = Array.from({ length: 4 }, (_, index) =>
      buildIntakeEvidenceHistoryEntry(intakeResult, {
        confirmedDrug: `drug-${index}`,
        labelText: `label-${index}`,
        savedAt: `2026-06-24T0${index}:00:00.000Z`,
      }),
    );
    const newest = buildIntakeEvidenceHistoryEntry(intakeResult, {
      confirmedDrug: "newest",
      labelText: "latest",
      savedAt: "2026-06-24T05:00:00.000Z",
    });

    expect(
      addIntakeEvidenceHistoryEntry(entries, newest, 3).map(
        (entry) => entry.confirmedDrug,
      ),
    ).toEqual(["newest", "drug-0", "drug-1"]);
  });
});
