import { describe, expect, it } from "vitest";
import {
  buildFallbackMedicationIntake,
  medicationIntakeSchema,
  parseMedicationIntake,
} from "./medicationIntake";

describe("medication intake", () => {
  it("extracts a schema-shaped medication intake result from OCR text", () => {
    const result = buildFallbackMedicationIntake({
      ocrText:
        "Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea. Contraindications: severe renal impairment.",
      fileName: "metformin-label.png",
    });

    expect(medicationIntakeSchema.safeParse(result).success).toBe(true);
    expect(result.drugCandidates).toContain("Metformin");
    expect(result.activeIngredients).toContain("Metformin hydrochloride");
    expect(result.strengths).toContain("500 mg");
    expect(result.riskKeywords).toEqual(
      expect.arrayContaining(["adverse reactions", "contraindications"]),
    );
    expect(result.needsHumanConfirmation).toBe(true);
    expect(result.evidence.fileName).toBe("metformin-label.png");
  });

  it("parses fenced JSON returned by an API model", () => {
    const parsed = parseMedicationIntake(`\`\`\`json
{
  "provider": "deepseek",
  "drugCandidates": ["Ibuprofen"],
  "activeIngredients": ["ibuprofen"],
  "strengths": ["200 mg"],
  "dosageForm": "tablet",
  "riskKeywords": ["warning"],
  "confidence": "medium",
  "needsHumanConfirmation": true,
  "extractedText": "Ibuprofen 200 mg warning",
  "evidence": {
    "fileName": "label.jpg",
    "sourceType": "ocr-text"
  },
  "limitations": ["OCR text may be incomplete."]
}
\`\`\``);

    expect(parsed.drugCandidates).toEqual(["Ibuprofen"]);
    expect(parsed.provider).toBe("deepseek");
  });
});
