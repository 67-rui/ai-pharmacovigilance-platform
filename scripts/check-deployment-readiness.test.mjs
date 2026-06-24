import { describe, expect, test } from "vitest";

import {
  checkEnvExample,
  checkPackageScripts,
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
          "smoke:demo": "node scripts/smoke-test-live-demo.mjs",
        },
      }),
    ).toEqual([]);

    expect(checkPackageScripts({ scripts: { test: "vitest run" } })).toContain(
      "Missing package script: smoke:demo",
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
});
