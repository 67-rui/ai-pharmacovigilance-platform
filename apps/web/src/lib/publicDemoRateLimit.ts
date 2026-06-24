export type PublicDemoRateLimitRule = {
  namespace: string;
  limit: number;
  windowMs: number;
};

export type PublicDemoRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedClient = forwardedFor?.split(",")[0]?.trim();

  return (
    forwardedClient ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "local"
  );
}

function buildBucketKey(request: Request, namespace: string) {
  return `${namespace}:${getClientIp(request)}`;
}

export function checkPublicDemoRateLimit(
  request: Request,
  rule: PublicDemoRateLimitRule,
  now = Date.now(),
): PublicDemoRateLimitResult {
  const key = buildBucketKey(request, rule.namespace);
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + rule.windowMs,
        };

  if (bucket.count >= rule.limit) {
    buckets.set(key, bucket);
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  };
}

export function resetPublicDemoRateLimits() {
  buckets.clear();
}

export function getPublicDemoRateLimitRule(
  namespace: string,
  envLimitName: string,
  defaultLimit: number,
): PublicDemoRateLimitRule {
  return {
    namespace,
    limit: readPositiveIntegerEnv(envLimitName, defaultLimit),
    windowMs: readPositiveIntegerEnv(
      "PUBLIC_DEMO_RATE_LIMIT_WINDOW_MS",
      DEFAULT_WINDOW_MS,
    ),
  };
}

export function buildPublicDemoRateLimitHeaders(
  result: PublicDemoRateLimitResult,
) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
