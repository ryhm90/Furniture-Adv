import { NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 5000;

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size <= MAX_TRACKED_KEYS) {
    return;
  }

  const sortedEntries = [...rateLimitStore.entries()].sort(
    (left, right) => left[1].resetAt - right[1].resetAt,
  );
  const keysToDelete = sortedEntries.slice(0, rateLimitStore.size - MAX_TRACKED_KEYS);
  keysToDelete.forEach(([key]) => rateLimitStore.delete(key));
}

export function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function consumePublicRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const ip = getRequestIp(request);
  const key = `${scope}:${ip}`;
  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (currentEntry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((currentEntry.resetAt - now) / 1000), 1),
    };
  }

  currentEntry.count += 1;
  rateLimitStore.set(key, currentEntry);

  return {
    allowed: true,
    remaining: Math.max(limit - currentEntry.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((currentEntry.resetAt - now) / 1000), 1),
  };
}
