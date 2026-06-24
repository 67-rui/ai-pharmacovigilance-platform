import { describe, expect, it } from "vitest";
import { assessOcrTextQuality } from "./ocrQuality";

describe("OCR quality assessment", () => {
  it("rates medication label text with drug, strength, and warning terms as good", () => {
    const assessment = assessOcrTextQuality(
      [
        "Metformin hydrochloride tablets 500 mg",
        "Warnings and precautions include lactic acidosis.",
        "Adverse reactions include nausea and diarrhea.",
      ].join("\n"),
    );

    expect(assessment.quality).toBe("good");
    expect(assessment.score).toBeGreaterThanOrEqual(80);
    expect(assessment.requiresReview).toBe(false);
    expect(assessment.signals).toContain("drug-candidate");
    expect(assessment.signals).toContain("strength");
    expect(assessment.signals).toContain("safety-keyword");
  });

  it("rates short noisy OCR text as poor and asks for manual review", () => {
    const assessment = assessOcrTextQuality("M3tf0r?? ## 5OO rng");

    expect(assessment.quality).toBe("poor");
    expect(assessment.score).toBeLessThan(45);
    expect(assessment.requiresReview).toBe(true);
    expect(assessment.warnings).toContain(
      "OCR text is short or sparse; verify the medication name manually.",
    );
    expect(assessment.recommendedNextStep).toContain("Enhanced OCR");
  });

  it("detects a medication candidate from an unknown clear label line", () => {
    const assessment = assessOcrTextQuality(
      "Lisinopril tablets 10 mg. Warnings include dizziness.",
    );

    expect(assessment.quality).not.toBe("poor");
    expect(assessment.signals).toContain("drug-candidate");
    expect(assessment.warnings).not.toContain(
      "No known medication candidate was confidently detected.",
    );
  });
});
