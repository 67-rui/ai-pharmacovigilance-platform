import { describe, expect, test } from "vitest";

import {
  buildSmokeUrls,
  resolveSmokeOptions,
} from "./smoke-test-live-demo.mjs";

describe("live demo smoke-test CLI helpers", () => {
  test("uses DEMO_URL when no positional URL is provided", () => {
    const options = resolveSmokeOptions([], {
      DEMO_URL: "https://demo.example.com/",
    });

    expect(options.baseUrl).toBe("https://demo.example.com");
    expect(options.mockApis).toBe(false);
  });

  test("prefers the positional URL and enables mock API mode", () => {
    const options = resolveSmokeOptions(
      ["https://preview.example.com///", "--mock"],
      {
        DEMO_URL: "https://demo.example.com",
      },
    );

    expect(options.baseUrl).toBe("https://preview.example.com");
    expect(options.mockApis).toBe(true);
  });

  test("builds a reproducible full-workflow URL from the base URL", () => {
    expect(buildSmokeUrls("https://demo.example.com", "metformin")).toEqual({
      homeUrl: "https://demo.example.com/",
      labelSampleUrl: "https://demo.example.com/?label=sample",
      workflowUrl: "https://demo.example.com/?drug=metformin&workflow=full",
    });
  });

  test("requires a target demo URL", () => {
    expect(() => resolveSmokeOptions([], {})).toThrow(
      "Set DEMO_URL or pass a demo URL",
    );
  });
});
