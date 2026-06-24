#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_SCRIPTS = ["test", "test:e2e", "lint", "build", "smoke:demo"];
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
  "vercel.json",
  "scripts/smoke-test-live-demo.mjs",
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
  return REQUIRED_SCRIPTS.flatMap((scriptName) =>
    scripts[scriptName] ? [] : [`Missing package script: ${scriptName}`],
  );
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
