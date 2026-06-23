import { describe, expect, it } from "vitest";
import {
  buildEventSearch,
  calculateSignalMetrics,
  classifySignal,
} from "./signal";

describe("buildEventSearch", () => {
  it("normalizes MedDRA preferred terms to exact uppercase searches", () => {
    expect(buildEventSearch(" acute kidney injury ")).toBe(
      'patient.reaction.reactionmeddrapt.exact:"ACUTE KIDNEY INJURY"',
    );
  });

  it("escapes quotes in event terms", () => {
    expect(buildEventSearch('nausea "severe"')).toBe(
      'patient.reaction.reactionmeddrapt.exact:"NAUSEA \\"SEVERE\\""',
    );
  });
});

describe("calculateSignalMetrics", () => {
  it("calculates PRR, ROR, and ROR confidence intervals from a 2x2 table", () => {
    const metrics = calculateSignalMetrics(10, 90, 20, 880);

    expect(metrics.prr).toBe(4.5);
    expect(metrics.ror).toBe(4.889);
    expect(metrics.rorLower95).toBeGreaterThan(2);
    expect(metrics.rorUpper95).toBeGreaterThan(metrics.rorLower95 ?? 0);
  });

  it("returns null confidence intervals when any cell is zero", () => {
    const metrics = calculateSignalMetrics(0, 90, 20, 880);

    expect(metrics.prr).toBe(0);
    expect(metrics.ror).toBe(0);
    expect(metrics.rorLower95).toBeNull();
    expect(metrics.rorUpper95).toBeNull();
  });
});

describe("classifySignal", () => {
  it("classifies elevated disproportionality when PRR and ROR are at least 2", () => {
    expect(classifySignal(10, 4.5, 4.889).label).toBe("signal-elevated");
  });

  it("requires at least three drug-event reports", () => {
    expect(classifySignal(2, 4.5, 4.889).label).toBe("insufficient-data");
  });
});
