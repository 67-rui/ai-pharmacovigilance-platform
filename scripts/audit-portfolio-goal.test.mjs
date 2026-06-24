import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  auditPortfolioGoal,
  REQUIRED_PORTFOLIO_EVIDENCE,
} from "./audit-portfolio-goal.mjs";

function writeFixture(rootDir, filePath, text) {
  const target = join(rootDir, filePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}

function writeCompletePortfolioFixture(rootDir) {
  writeFixture(
    rootDir,
    "README.md",
    [
      "/?drug=metformin",
      "medication-label evidence",
      "FAERS cannot establish incidence, causality, or medical advice.",
      "not medical advice",
      "schema validation",
      "human confirmation",
      "PRR",
      "ROR",
    ].join("\n"),
  );
  writeFixture(
    rootDir,
    "docs/portfolio-evidence-matrix.md",
    "Portfolio Evidence Matrix with schema validation, source provenance, human confirmation, and safety boundaries.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/app/api/faers/route.ts",
    "openFDA FAERS aggregate source provenance for /api/faers using analyzeFaersDrug and querySchema.safeParse for FAERS analysis.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/app/api/signal/route.ts",
    "Signal route returns PRR and ROR disproportionality metrics with analyzeSignal and querySchema.safeParse.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/app/api/compare/route.ts",
    "Compare route uses compareDrugs with primary and comparator event reporting share per 1,000 reports.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/app/api/report/route.ts",
    "Report route uses parseStructuredReport, zod, and safeParse for AI structured report validation.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/app/api/intake/medication/route.ts",
    "Medication-label intake uses DEEPSEEK_API_KEY, buildFallbackResponse, and needsHumanConfirmation before FAERS.",
  );
  writeFixture(
    rootDir,
    "apps/web/src/lib/report.ts",
    [
      "structuredReportSchema",
      "z.object",
      "parseStructuredReport",
      "No causal claims from FAERS report counts.",
      "No incidence, prevalence, or true-risk estimates.",
      "FAERS limitations are stated explicitly.",
    ].join("\n"),
  );
  writeFixture(
    rootDir,
    "apps/web/src/lib/pdfReport.ts",
    [
      "Report schema validation: passed",
      "Medication-intake schema validation",
      "Human confirmation before FAERS launch",
      "FAERS limitation: cannot establish incidence or causality",
    ].join("\n"),
  );
  writeFixture(
    rootDir,
    "apps/web/src/lib/medicationIntake.ts",
    "medicationIntakeSchema z.object parseMedicationIntake needsHumanConfirmation: true",
  );
  writeFixture(
    rootDir,
    "apps/web/src/components/PharmacovigilanceDashboard.tsx",
    "Human confirmation, Run full workflow, schema validation status, and FAERS limitations are visible.",
  );
  writeFixture(
    rootDir,
    "scripts/smoke-test-local-api.mjs",
    "Checks /api/faers, /api/signal, /api/compare, /api/report, and /api/intake/medication.",
  );
}

describe("portfolio goal audit", () => {
  test("passes when every portfolio evidence group is present", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "portfolio-goal-pass-"));

    try {
      writeCompletePortfolioFixture(rootDir);

      expect(auditPortfolioGoal(rootDir)).toEqual([]);
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("reports missing evidence with actionable labels", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "portfolio-goal-fail-"));

    try {
      writeCompletePortfolioFixture(rootDir);
      writeFixture(
        rootDir,
        "apps/web/src/app/api/report/route.ts",
        "Report route exists but forgot structured schema validation.",
      );

      expect(auditPortfolioGoal(rootDir)).toContain(
        "Missing portfolio evidence for AI structured report: apps/web/src/app/api/report/route.ts must include parseStructuredReport, zod, safeParse.",
      );
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("reports missing responsible-AI export checklist evidence", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "portfolio-goal-export-fail-"));

    try {
      writeCompletePortfolioFixture(rootDir);
      writeFixture(
        rootDir,
        "apps/web/src/lib/pdfReport.ts",
        "PDF report exists but lacks the responsible-AI export checklist.",
      );

      expect(auditPortfolioGoal(rootDir)).toContain(
        "Missing portfolio evidence for responsible-AI safety boundaries: apps/web/src/lib/pdfReport.ts must include Report schema validation: passed, Medication-intake schema validation, Human confirmation before FAERS launch, FAERS limitation: cannot establish incidence or causality.",
      );
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("keeps the evidence checklist aligned with the project goal", () => {
    expect(REQUIRED_PORTFOLIO_EVIDENCE.map((item) => item.id)).toEqual([
      "drug-name-entry",
      "medication-label-entry",
      "faers-query",
      "signal-analysis",
      "drug-comparison",
      "ai-structured-report",
      "schema-validation",
      "human-confirmation",
      "safety-boundaries",
      "demo-verification",
    ]);
  });
});
