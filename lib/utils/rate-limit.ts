/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Check if request should be rate limited
 * @param key - Unique identifier (e.g., userId)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns True if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store[key];

  if (!record || now > record.resetTime) {
    // Create new window
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Clear rate limit for a key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  delete store[key];
}

/**
 * Get rate limit info without incrementing
 */
export function getRateLimitInfo(
  key: string,
  maxRequests: number,
  windowMs: number
): { remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store[key];

  if (!record || now > record.resetTime) {
    return {
      remaining: maxRequests,
      resetTime: now + windowMs,
    };
  }

  return {
    remaining: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime,
  };
}
