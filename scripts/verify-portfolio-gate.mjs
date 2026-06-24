#!/usr/bin/env node

import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 3001;
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 1_000;

function normalizeBaseUrl(rawUrl) {
  const value = String(rawUrl ?? "").trim() || `http://localhost:${DEFAULT_PORT}`;
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, "");

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Portfolio gate URL must use http or https: ${value}`);
  }

  return `${url.origin}${path === "" ? "" : path}`;
}

function parsePort(value) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Portfolio gate port must be between 1 and 65535: ${value}`);
  }

  return parsed;
}

export function resolvePortfolioGateOptions(
  argv = process.argv.slice(2),
  env = process.env,
) {
  let baseUrl = env.PORTFOLIO_GATE_URL;
  let port = env.PORTFOLIO_GATE_PORT
    ? parsePort(env.PORTFOLIO_GATE_PORT)
    : DEFAULT_PORT;

  for (const arg of argv) {
    if (arg.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length));
    } else if (arg.startsWith("--url=")) {
      baseUrl = arg.slice("--url=".length);
    } else {
      throw new Error(`Unknown portfolio gate option: ${arg}`);
    }
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl || `http://localhost:${port}`),
    port,
  };
}

export function buildPortfolioGateCommands(options) {
  return [
    ["npm", ["run", "check:deploy"]],
    ["npm", ["run", "audit:portfolio"]],
    ["npm", ["run", "test"]],
    ["npm", ["run", "lint"]],
    ["npm", ["run", "build"]],
    ["npm", ["run", "test:e2e"]],
    ["npm", ["run", "smoke:api", "--", options.baseUrl]],
    ["npm", ["run", "smoke:demo", "--", options.baseUrl, "--mock"]],
  ];
}

export function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}.`));
    });
  });
}

export async function startServer(port) {
  const child = spawn(
    "npm",
    ["--workspace", "apps/web", "run", "dev", "--", "--port", String(port)],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );

  return {
    stop: async () => {
      if (child.exitCode !== null) return;

      child.kill("SIGINT");
      await new Promise((resolve) => {
        child.once("exit", resolve);
      });
    },
  };
}

export async function waitForHealth(
  healthUrl,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  const deadline = now() + HEALTH_TIMEOUT_MS;

  while (now() < deadline) {
    try {
      const response = await fetchImpl(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting; keep polling until the timeout.
    }

    await sleep(HEALTH_POLL_MS);
  }

  throw new Error(`Timed out waiting for ${healthUrl}.`);
}

export async function runPortfolioGate({
  options,
  runCommand: runCommandImpl = runCommand,
  startServer: startServerImpl = startServer,
  waitForHealth: waitForHealthImpl = waitForHealth,
  log = console.log,
} = {}) {
  const gateOptions = options ?? resolvePortfolioGateOptions();
  const commands = buildPortfolioGateCommands(gateOptions);
  const buildCommands = commands.slice(0, 6);
  const smokeCommands = commands.slice(6);

  for (const [command, args] of buildCommands) {
    log(`Running ${command} ${args.join(" ")}`);
    await runCommandImpl(command, args);
  }

  const server = await startServerImpl(gateOptions.port);

  try {
    await waitForHealthImpl(`${gateOptions.baseUrl}/api/health`);

    for (const [command, args] of smokeCommands) {
      log(`Running ${command} ${args.join(" ")}`);
      await runCommandImpl(command, args);
    }
  } finally {
    await server.stop();
  }
}

async function main() {
  await runPortfolioGate();
  console.log("Portfolio verification gate passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
