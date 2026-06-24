import { NextResponse } from "next/server";
import {
  buildPublicDemoRateLimitHeaders,
  checkPublicDemoRateLimit,
  getPublicDemoRateLimitRule,
} from "../../lib/publicDemoRateLimit";

type PublicDemoRateLimitConfig = {
  namespace: string;
  envLimitName: string;
  defaultLimit: number;
  label: string;
};

export function limitPublicDemoRequest(
  request: Request,
  config: PublicDemoRateLimitConfig,
) {
  const rateLimit = checkPublicDemoRateLimit(
    request,
    getPublicDemoRateLimitRule(
      config.namespace,
      config.envLimitName,
      config.defaultLimit,
    ),
  );

  if (rateLimit.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: `Public demo rate limit reached for ${config.label}.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    },
    {
      status: 429,
      headers: buildPublicDemoRateLimitHeaders(rateLimit),
    },
  );
}
