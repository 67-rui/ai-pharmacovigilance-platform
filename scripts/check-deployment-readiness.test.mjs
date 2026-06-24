import { describe, expect, test } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkDeploymentReadiness,
  checkEnvExample,
  checkDeploymentGuide,
  checkPackageScripts,
  checkReadmeDeploymentLinks,
  checkRenderBlueprint,
  checkSampleReport,
  scanForPlaintextSecrets,
} from "./check-deployment-readiness.mjs";

describe("deployment readiness checks", () => {
  test("requires portfolio deployment scripts", () => {
    expect(
      checkPackageScripts({
        scripts: {
          test: "vitest run apps/web/src scripts",
          "test:e2e": "playwright test",
          lint: "npm --workspace apps/web run lint",
          build: "npm --workspace apps/web run build",
          start: "npm --workspace apps/web run start --",
          "smoke:api": "node scripts/smoke-test-local-api.mjs",
          "smoke:demo": "node scripts/smoke-test-live-demo.mjs",
          "audit:portfolio": "node scripts/audit-portfolio-goal.mjs",
          "tunnel:local": "npx localtunnel --port 3001",
        },
      }),
    ).toEqual([]);

    const missingScripts = checkPackageScripts({ scripts: { test: "vitest run" } });
    expect(missingScripts).toContain("Missing package script: start");
    expect(missingScripts).toContain("Missing package script: smoke:api");
    expect(missingScripts).toContain("Missing package script: audit:portfolio");
    expect(missingScripts).toContain("Missing package script: tunnel:local");

    const malformedStart = checkPackageScripts({
      scripts: {
        test: "vitest run",
        "test:e2e": "playwright test",
        lint: "eslint",
        build: "next build",
        start: "npm --workspace apps/web run start",
        "smoke:api": "node scripts/smoke-test-local-api.mjs",
        "smoke:demo": "node scripts/smoke-test-live-demo.mjs",
        "audit:portfolio": "node scripts/audit-portfolio-goal.mjs",
        "tunnel:local": "npx localtunnel --port 3001",
      },
    });
    expect(malformedStart).toContain(
      "Root start script must forward CLI arguments with: npm --workspace apps/web run start --",
    );
  });

  test("requires optional provider keys to stay blank in env examples", () => {
    const cleanEnv = [
      "OPENFDA_API_KEY=",
      "OPENAI_API_KEY=",
      "OPENAI_MODEL=gpt-5.5",
      "DEEPSEEK_API_KEY=",
      "DEEPSEEK_MODEL=deepseek-chat",
      "PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS=60000",
      "PUBLIC_DEMO_FAERS_RATE_LIMIT=30",
      "PUBLIC_DEMO_SIGNAL_RATE_LIMIT=60",
      "PUBLIC_DEMO_RANKINGS_RATE_LIMIT=20",
      "PUBLIC_DEMO_COMPARE_RATE_LIMIT=30",
      "PUBLIC_DEMO_REPORT_RATE_LIMIT=20",
      "PUBLIC_DEMO_INTAKE_RATE_LIMIT=20",
    ].join("\n");

    expect(checkEnvExample(cleanEnv)).toEqual([]);
    expect(
      checkEnvExample(
        cleanEnv.replace("OPENAI_API_KEY=", "OPENAI_API_KEY=sk-test-secret"),
      ),
    ).toContain(
      "apps/web/.env.example must not contain a plaintext OPENAI_API_KEY value.",
    );
  });

  test("flags plaintext API keys in scanned repository text", () => {
    expect(
      scanForPlaintextSecrets([
        {
          filePath: "README.md",
          text: "Use OPENAI_API_KEY in your deployment environment.",
        },
      ]),
    ).toEqual([]);
    expect(
      scanForPlaintextSecrets([
        {
          filePath: "docs/example.md",
          text: "accidental key sk-1234567890abcdef1234567890abcdef",
        },
      ]),
    ).toEqual([
      "Potential plaintext secret in docs/example.md: OpenAI/DeepSeek-style API key",
    ]);
  });

  test("requires README deployment links for portfolio reviewers", () => {
    const readme = [
      "[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F67-rui%2Fai-pharmacovigilance-platform)",
      "Review the sample report at docs/sample-report.md.",
      "DEMO_URL=https://your-project.vercel.app npm run smoke:demo",
      "The live smoke script checks `/?label=sample`.",
    ].join("\n");

    expect(checkReadmeDeploymentLinks(readme)).toEqual([]);
    expect(checkReadmeDeploymentLinks("No deployment links here.")).toEqual([
      "README.md is missing a Deploy with Vercel link.",
      "README.md is missing the deployed demo smoke-test command.",
      "README.md is missing a link to docs/sample-report.md.",
      "README.md must document that live smoke covers /?label=sample.",
    ]);
  });

  test("requires deployment guide smoke coverage for sample-label URLs", () => {
    const guide = [
      "DEMO_URL=https://your-project.vercel.app npm run smoke:demo",
      "The smoke script opens Chrome and checks `/?drug=metformin&workflow=full`, `/?label=sample`, and `--mock` local self-checks.",
    ].join("\n");

    expect(checkDeploymentGuide(guide)).toEqual([]);
    expect(checkDeploymentGuide("DEMO_URL=https://your-project.vercel.app npm run smoke:demo")).toEqual([
      "docs/deployment.md must document that live smoke covers /?label=sample.",
    ]);
  });

  test("requires a non-Vercel Node hosting blueprint", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "pv-deploy-"));

    try {
      writeFileSync(
        join(rootDir, "package.json"),
        JSON.stringify({
          scripts: {
            test: "vitest run apps/web/src scripts",
            "test:e2e": "playwright test",
            lint: "npm --workspace apps/web run lint",
            build: "npm --workspace apps/web run build",
            start: "npm --workspace apps/web run start --",
            "smoke:api": "node scripts/smoke-test-local-api.mjs",
            "smoke:demo": "node scripts/smoke-test-live-demo.mjs",
            "tunnel:local": "npx localtunnel --port 3001",
          },
        }),
      );
      writeFileSync(
        join(rootDir, "README.md"),
        [
          "[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F67-rui%2Fai-pharmacovigilance-platform)",
          "Review the sample report at docs/sample-report.md.",
          "DEMO_URL=https://your-project.vercel.app npm run smoke:demo",
          "The live smoke script checks `/?label=sample`.",
        ].join("\n"),
      );

      const findings = checkDeploymentReadiness(rootDir);

      expect(findings).toContain("Missing required file: render.yaml");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("requires the portfolio goal audit script", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "pv-goal-audit-"));

    try {
      writeFileSync(
        join(rootDir, "package.json"),
        JSON.stringify({
          scripts: {
            test: "vitest run apps/web/src scripts",
            "test:e2e": "playwright test",
            lint: "npm --workspace apps/web run lint",
            build: "npm --workspace apps/web run build",
            start: "npm --workspace apps/web run start --",
            "smoke:api": "node scripts/smoke-test-local-api.mjs",
            "smoke:demo": "node scripts/smoke-test-live-demo.mjs",
            "audit:portfolio": "node scripts/audit-portfolio-goal.mjs",
            "tunnel:local": "npx localtunnel --port 3001",
          },
        }),
      );

      expect(checkDeploymentReadiness(rootDir)).toContain(
        "Missing required file: scripts/audit-portfolio-goal.mjs",
      );
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("requires Render blueprint to run the built-in Next.js API app", () => {
    const renderBlueprint = [
      "services:",
      "  - type: web",
      "    runtime: node",
      "    buildCommand: npm install && npm run build",
      "    startCommand: npm run start",
      "    healthCheckPath: /",
      "    envVars:",
      "      - key: OPENFDA_API_KEY",
      "        sync: false",
      "      - key: OPENAI_API_KEY",
      "        sync: false",
      "      - key: DEEPSEEK_API_KEY",
      "        sync: false",
    ].join("\n");

    expect(checkRenderBlueprint(renderBlueprint)).toEqual([]);
    expect(checkRenderBlueprint("services: []")).toEqual([
      "render.yaml must define a Node web service.",
      "render.yaml must build with npm install && npm run build.",
      "render.yaml must start with npm run start.",
      "render.yaml must expose / as the health check path.",
      "render.yaml must document OPENFDA_API_KEY, OPENAI_API_KEY, and DEEPSEEK_API_KEY as environment variables.",
    ]);
  });

  test("scans Render blueprint for plaintext provider keys", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "pv-render-secret-"));

    try {
      writeFileSync(join(rootDir, "README.md"), "");
      writeFileSync(
        join(rootDir, "render.yaml"),
        "envVars:\n  - key: OPENAI_API_KEY\n    value: sk-1234567890abcdef1234567890abcdef\n",
      );

      expect(checkDeploymentReadiness(rootDir)).toContain(
        "Potential plaintext secret in render.yaml: OpenAI/DeepSeek-style API key",
      );
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });

  test("requires a portfolio sample report with safety guardrails", () => {
    const sampleReport = [
      "# Sample Pharmacovigilance Reviewer Report",
      "Schema validated: yes",
      "Prompt version: faers-safety-report-v2",
      "FAERS reports cannot establish incidence, prevalence, clinical risk, or causality.",
      "Human confirmation is required before medication-label evidence launches analysis.",
      "PRR: 2.10",
      "ROR: 2.20",
      "Source provenance",
    ].join("\n");

    expect(checkSampleReport(sampleReport)).toEqual([]);
    expect(checkSampleReport("Thin report")).toEqual([
      "docs/sample-report.md must include the sample report title.",
      "docs/sample-report.md must include schema validation status.",
      "docs/sample-report.md must include prompt versioning.",
      "docs/sample-report.md must include FAERS no-causality/no-incidence limitations.",
      "docs/sample-report.md must include the human-confirmation boundary.",
      "docs/sample-report.md must include PRR/ROR signal metrics.",
      "docs/sample-report.md must include source provenance.",
    ]);
  });
});
