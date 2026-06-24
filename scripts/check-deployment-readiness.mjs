#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { auditPortfolioGoal } from "./audit-portfolio-goal.mjs";

const REQUIRED_SCRIPTS = [
  "test",
  "test:e2e",
  "lint",
  "build",
  "start",
  "smoke:api",
  "smoke:demo",
  "audit:portfolio",
  "verify:portfolio",
  "tunnel:cloudflare",
  "tunnel:local",
];
const BLANK_PROVIDER_KEYS = [
  "OPENFDA_API_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
];
const REQUIRED_ENV_KEYS = [
  ...BLANK_PROVIDER_KEYS,
  "OPENAI_MODEL",
  "DEEPSEEK_MODEL",
  "PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS",
  "PUBLIC_DEMO_FAERS_RATE_LIMIT",
  "PUBLIC_DEMO_SIGNAL_RATE_LIMIT",
  "PUBLIC_DEMO_RANKINGS_RATE_LIMIT",
  "PUBLIC_DEMO_COMPARE_RATE_LIMIT",
  "PUBLIC_DEMO_REPORT_RATE_LIMIT",
  "PUBLIC_DEMO_INTAKE_RATE_LIMIT",
];
const REQUIRED_FILES = [
  "README.md",
  "docs/deployment.md",
  "docs/sample-report.md",
  "vercel.json",
  "render.yaml",
  "scripts/smoke-test-local-api.mjs",
  "scripts/smoke-test-live-demo.mjs",
  "scripts/audit-portfolio-goal.mjs",
  "scripts/verify-portfolio-gate.mjs",
  "apps/web/src/app/api/health/route.ts",
];
const SECRET_PATTERNS = [
  {
    label: "OpenAI/DeepSeek-style API key",
    pattern: /\bsk-[A-Za-z0-9_-]{24,}\b/g,
  },
  {
    label: "GitHub token",
    pattern: /\bgh[opsu]_[A-Za-z0-9_]{24,}\b/g,
  },
];

function parseEnvExample(text) {
  const entries = new Map();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    entries.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
  }

  return entries;
}

export function checkPackageScripts(packageJson) {
  const scripts = packageJson?.scripts ?? {};
  const findings = REQUIRED_SCRIPTS.flatMap((scriptName) =>
    scripts[scriptName] ? [] : [`Missing package script: ${scriptName}`],
  );

  if (
    scripts.start &&
    scripts.start.trim() !== "npm --workspace apps/web run start --"
  ) {
    findings.push(
      "Root start script must forward CLI arguments with: npm --workspace apps/web run start --",
    );
  }

  return findings;
}

export function checkEnvExample(text) {
  const entries = parseEnvExample(text);
  const findings = [];

  for (const key of REQUIRED_ENV_KEYS) {
    if (!entries.has(key)) {
      findings.push(`apps/web/.env.example is missing ${key}.`);
    }
  }

  for (const key of BLANK_PROVIDER_KEYS) {
    if ((entries.get(key) ?? "").trim()) {
      findings.push(
        `apps/web/.env.example must not contain a plaintext ${key} value.`,
      );
    }
  }

  return findings;
}

export function checkReadmeDeploymentLinks(text) {
  const findings = [];

  if (!text.includes("https://vercel.com/new/clone?repository-url=")) {
    findings.push("README.md is missing a Deploy with Vercel link.");
  }

  if (!text.includes("DEMO_URL=https://your-project.vercel.app npm run smoke:demo")) {
    findings.push("README.md is missing the deployed demo smoke-test command.");
  }

  if (!text.includes("docs/sample-report.md")) {
    findings.push("README.md is missing a link to docs/sample-report.md.");
  }

  if (!text.includes("/api/health")) {
    findings.push("README.md must document that live smoke covers /api/health.");
  }

  if (!text.includes("/?label=sample")) {
    findings.push("README.md must document that live smoke covers /?label=sample.");
  }

  return findings;
}

export function checkDeploymentGuide(text) {
  const findings = [];

  if (!text.includes("/api/health")) {
    findings.push(
      "docs/deployment.md must document that live smoke covers /api/health.",
    );
  }

  if (!text.includes("/?label=sample")) {
    findings.push(
      "docs/deployment.md must document that live smoke covers /?label=sample.",
    );
  }

  if (!text.includes("--bypass-tunnel-reminder")) {
    findings.push(
      "docs/deployment.md must document --bypass-tunnel-reminder for localtunnel smoke checks.",
    );
  }

  return findings;
}

export function checkRenderBlueprint(text) {
  const findings = [];

  if (!text.includes("type: web") || !text.includes("runtime: node")) {
    findings.push("render.yaml must define a Node web service.");
  }

  if (!text.includes("buildCommand: npm install && npm run build")) {
    findings.push("render.yaml must build with npm install && npm run build.");
  }

  if (!text.includes("startCommand: npm run start")) {
    findings.push("render.yaml must start with npm run start.");
  }

  if (!text.includes("healthCheckPath: /api/health")) {
    findings.push("render.yaml must expose /api/health as the health check path.");
  }

  if (
    !text.includes("OPENFDA_API_KEY") ||
    !text.includes("OPENAI_API_KEY") ||
    !text.includes("DEEPSEEK_API_KEY")
  ) {
    findings.push(
      "render.yaml must document OPENFDA_API_KEY, OPENAI_API_KEY, and DEEPSEEK_API_KEY as environment variables.",
    );
  }

  return findings;
}

export function checkSampleReport(text) {
  const findings = [];

  if (!text.includes("# Sample Pharmacovigilance Reviewer Report")) {
    findings.push("docs/sample-report.md must include the sample report title.");
  }

  if (!/schema validated(?:\s*:|\s*\|\s*)\s*yes/i.test(text)) {
    findings.push("docs/sample-report.md must include schema validation status.");
  }

  if (!text.includes("faers-safety-report-v2")) {
    findings.push("docs/sample-report.md must include prompt versioning.");
  }

  if (!text.includes("cannot establish incidence") || !text.includes("causality")) {
    findings.push(
      "docs/sample-report.md must include FAERS no-causality/no-incidence limitations.",
    );
  }

  if (!text.includes("Human confirmation")) {
    findings.push("docs/sample-report.md must include the human-confirmation boundary.");
  }

  if (!text.includes("PRR") || !text.includes("ROR")) {
    findings.push("docs/sample-report.md must include PRR/ROR signal metrics.");
  }

  if (!text.includes("Source provenance")) {
    findings.push("docs/sample-report.md must include source provenance.");
  }

  return findings;
}

export function scanForPlaintextSecrets(files) {
  const findings = [];

  for (const file of files) {
    for (const { label, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.text)) {
        findings.push(`Potential plaintext secret in ${file.filePath}: ${label}`);
      }
    }
  }

  return findings;
}

function checkRequiredFiles(rootDir) {
  return REQUIRED_FILES.flatMap((filePath) =>
    existsSync(join(rootDir, filePath)) ? [] : [`Missing required file: ${filePath}`],
  );
}

function readJson(rootDir, filePath) {
  return JSON.parse(readFileSync(join(rootDir, filePath), "utf8"));
}

function readText(rootDir, filePath) {
  return readFileSync(join(rootDir, filePath), "utf8");
}

function buildSecretScanFiles(rootDir) {
  const filePaths = [
    "README.md",
    "docs/deployment.md",
    "docs/roadmap.md",
    "apps/web/.env.example",
    "package.json",
    "vercel.json",
    "render.yaml",
  ];

  return filePaths
    .filter((filePath) => existsSync(join(rootDir, filePath)))
    .map((filePath) => ({
      filePath,
      text: readText(rootDir, filePath),
    }));
}

export function checkDeploymentReadiness(rootDir = process.cwd()) {
  const findings = [];

  findings.push(...checkRequiredFiles(rootDir));

  if (existsSync(join(rootDir, "package.json"))) {
    findings.push(...checkPackageScripts(readJson(rootDir, "package.json")));
  }

  if (existsSync(join(rootDir, "apps/web/.env.example"))) {
    findings.push(...checkEnvExample(readText(rootDir, "apps/web/.env.example")));
  }

  if (existsSync(join(rootDir, "README.md"))) {
    findings.push(...checkReadmeDeploymentLinks(readText(rootDir, "README.md")));
  }

  if (existsSync(join(rootDir, "docs/deployment.md"))) {
    findings.push(...checkDeploymentGuide(readText(rootDir, "docs/deployment.md")));
  }

  if (existsSync(join(rootDir, "render.yaml"))) {
    findings.push(...checkRenderBlueprint(readText(rootDir, "render.yaml")));
  }

  if (existsSync(join(rootDir, "docs/sample-report.md"))) {
    findings.push(...checkSampleReport(readText(rootDir, "docs/sample-report.md")));
  }

  if (existsSync(join(rootDir, "scripts/audit-portfolio-goal.mjs"))) {
    findings.push(...auditPortfolioGoal(rootDir));
  }

  findings.push(...scanForPlaintextSecrets(buildSecretScanFiles(rootDir)));

  return findings;
}

function main() {
  const rootDir = process.cwd();
  const findings = checkDeploymentReadiness(rootDir);

  if (findings.length) {
    console.error("Deployment readiness check failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Deployment readiness check passed for ${relative(process.cwd(), rootDir) || "."}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
