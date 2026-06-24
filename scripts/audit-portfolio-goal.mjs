#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const REQUIRED_PORTFOLIO_EVIDENCE = [
  {
    id: "drug-name-entry",
    label: "drug-name entry",
    checks: [
      {
        filePath: "README.md",
        terms: ["/?drug=metformin"],
      },
    ],
  },
  {
    id: "medication-label-entry",
    label: "medication-label evidence entry",
    checks: [
      {
        filePath: "apps/web/src/app/api/intake/medication/route.ts",
        terms: ["DEEPSEEK_API_KEY", "needsHumanConfirmation", "buildFallbackResponse"],
      },
    ],
  },
  {
    id: "faers-query",
    label: "FAERS data query",
    checks: [
      {
        filePath: "apps/web/src/app/api/faers/route.ts",
        terms: ["analyzeFaersDrug", "querySchema.safeParse", "FAERS analysis"],
      },
    ],
  },
  {
    id: "signal-analysis",
    label: "signal analysis",
    checks: [
      {
        filePath: "README.md",
        terms: ["PRR", "ROR"],
      },
      {
        filePath: "apps/web/src/app/api/signal/route.ts",
        terms: ["analyzeSignal", "querySchema.safeParse"],
      },
    ],
  },
  {
    id: "drug-comparison",
    label: "drug comparison",
    checks: [
      {
        filePath: "apps/web/src/app/api/compare/route.ts",
        terms: ["compareDrugs", "primary", "comparator"],
      },
    ],
  },
  {
    id: "ai-structured-report",
    label: "AI structured report",
    checks: [
      {
        filePath: "apps/web/src/app/api/report/route.ts",
        terms: ["parseStructuredReport", "zod", "safeParse"],
      },
    ],
  },
  {
    id: "schema-validation",
    label: "schema validation",
    checks: [
      {
        filePath: "apps/web/src/lib/report.ts",
        terms: ["structuredReportSchema", "z.object", "parseStructuredReport"],
      },
      {
        filePath: "apps/web/src/lib/medicationIntake.ts",
        terms: ["medicationIntakeSchema", "z.object", "parseMedicationIntake"],
      },
    ],
  },
  {
    id: "human-confirmation",
    label: "human confirmation",
    checks: [
      {
        filePath: "apps/web/src/lib/medicationIntake.ts",
        terms: ["needsHumanConfirmation: true"],
      },
      {
        filePath: "apps/web/src/components/PharmacovigilanceDashboard.tsx",
        terms: ["Human confirmation"],
      },
    ],
  },
  {
    id: "safety-boundaries",
    label: "responsible-AI safety boundaries",
    checks: [
      {
        filePath: "README.md",
        terms: ["incidence", "causality", "not medical advice"],
      },
      {
        filePath: "apps/web/src/lib/report.ts",
        terms: [
          "No causal claims from FAERS report counts.",
          "No incidence, prevalence, or true-risk estimates.",
          "FAERS limitations are stated explicitly.",
        ],
      },
    ],
  },
  {
    id: "demo-verification",
    label: "demo verification",
    checks: [
      {
        filePath: "scripts/smoke-test-local-api.mjs",
        terms: [
          "/api/faers",
          "/api/signal",
          "/api/compare",
          "/api/report",
          "/api/intake/medication",
        ],
      },
      {
        filePath: "docs/portfolio-evidence-matrix.md",
        terms: ["Portfolio Evidence Matrix"],
      },
    ],
  },
];

function readText(rootDir, filePath) {
  return readFileSync(join(rootDir, filePath), "utf8");
}

function missingTerms(text, terms) {
  return terms.filter((term) => !text.includes(term));
}

export function auditPortfolioGoal(rootDir = process.cwd()) {
  const findings = [];

  for (const evidence of REQUIRED_PORTFOLIO_EVIDENCE) {
    for (const check of evidence.checks) {
      const absolutePath = join(rootDir, check.filePath);

      if (!existsSync(absolutePath)) {
        findings.push(
          `Missing portfolio evidence for ${evidence.label}: ${check.filePath} does not exist.`,
        );
        continue;
      }

      const missing = missingTerms(readText(rootDir, check.filePath), check.terms);
      if (missing.length) {
        findings.push(
          `Missing portfolio evidence for ${evidence.label}: ${check.filePath} must include ${missing.join(", ")}.`,
        );
      }
    }
  }

  return findings;
}

function main() {
  const rootDir = process.cwd();
  const findings = auditPortfolioGoal(rootDir);

  if (findings.length) {
    console.error("Portfolio goal audit failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Portfolio goal audit passed: ${REQUIRED_PORTFOLIO_EVIDENCE.length} evidence groups verified for ${relative(process.cwd(), rootDir) || "."}.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
