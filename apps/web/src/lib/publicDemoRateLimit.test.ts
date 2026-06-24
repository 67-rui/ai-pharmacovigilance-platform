import { afterEach, describe, expect, it } from "vitest";
import {
  checkPublicDemoRateLimit,
  resetPublicDemoRateLimits,
} from "./publicDemoRateLimit";

const rule = {
  namespace: "faers",
  limit: 2,
  windowMs: 60_000,
};

describe("public demo rate limiting", () => {
  afterEach(() => {
    resetPublicDemoRateLimits();
  });

  it("allows requests until the fixed-window limit is reached", () => {
    const request = new Request("http://localhost/api/faers", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });

    expect(checkPublicDemoRateLimit(request, rule, 1_000)).toMatchObject({
      allowed: true,
      limit: 2,
      remaining: 1,
    });
    expect(checkPublicDemoRateLimit(request, rule, 2_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(checkPublicDemoRateLimit(request, rule, 3_000)).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 58,
    });
  });

  it("isolates clients and route namespaces", () => {
    const firstClient = new Request("http://localhost/api/faers", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const secondClient = new Request("http://localhost/api/faers", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });

    checkPublicDemoRateLimit(firstClient, rule, 1_000);
    checkPublicDemoRateLimit(firstClient, rule, 2_000);

    expect(checkPublicDemoRateLimit(firstClient, rule, 3_000).allowed).toBe(
      false,
    );
    expect(checkPublicDemoRateLimit(secondClient, rule, 3_000).allowed).toBe(
      true,
    );
    expect(
      checkPublicDemoRateLimit(
        firstClient,
        { ...rule, namespace: "report" },
        3_000,
      ).allowed,
    ).toBe(true);
  });

  it("resets after the fixed window expires", () => {
    const request = new Request("http://localhost/api/faers", {
      headers: { "x-real-ip": "203.0.113.10" },
    });

    checkPublicDemoRateLimit(request, rule, 1_000);
    checkPublicDemoRateLimit(request, rule, 2_000);

    expect(checkPublicDemoRateLimit(request, rule, 61_001)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });
});
