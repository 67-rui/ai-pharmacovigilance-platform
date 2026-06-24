import { describe, expect, test } from "vitest";

import {
  buildPortfolioGateCommands,
  resolvePortfolioGateOptions,
  runPortfolioGate,
} from "./verify-portfolio-gate.mjs";

describe("portfolio verification gate", () => {
  test("defaults to localhost:3001 for local smoke checks", () => {
    expect(resolvePortfolioGateOptions([], {})).toEqual({
      baseUrl: "http://localhost:3001",
      port: 3001,
    });
  });

  test("builds the portfolio gate command sequence", () => {
    expect(
      buildPortfolioGateCommands({
        baseUrl: "http://localhost:3001",
        port: 3001,
      }),
    ).toEqual([
      ["npm", ["run", "check:deploy"]],
      ["npm", ["run", "audit:portfolio"]],
      ["npm", ["run", "test"]],
      ["npm", ["run", "lint"]],
      ["npm", ["run", "build"]],
      ["npm", ["run", "test:e2e"]],
      ["npm", ["run", "smoke:api", "--", "http://localhost:3001"]],
      [
        "npm",
        ["run", "smoke:demo", "--", "http://localhost:3001", "--mock"],
      ],
    ]);
  });

  test("starts the local app only after build checks and stops it after smoke", async () => {
    const events = [];
    const server = {
      stop: async () => {
        events.push("server:stop");
      },
    };

    await runPortfolioGate({
      options: {
        baseUrl: "http://localhost:3001",
        port: 3001,
      },
      runCommand: async (command, args) => {
        events.push(`${command} ${args.join(" ")}`);
      },
      startServer: async (port) => {
        events.push(`server:start:${port}`);
        return server;
      },
      waitForHealth: async (url) => {
        events.push(`health:${url}`);
      },
      log: () => {},
    });

    expect(events).toEqual([
      "npm run check:deploy",
      "npm run audit:portfolio",
      "npm run test",
      "npm run lint",
      "npm run build",
      "npm run test:e2e",
      "server:start:3001",
      "health:http://localhost:3001/api/health",
      "npm run smoke:api -- http://localhost:3001",
      "npm run smoke:demo -- http://localhost:3001 --mock",
      "server:stop",
    ]);
  });
});
