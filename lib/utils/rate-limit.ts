// Simple in-memory rate limiter (for development)
// For production, use Redis/Upstash

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

const store: RateLimitStore = {}

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  const windowMs = windowSeconds * 1000

  const record = store[key]

  if (!record || now > record.resetAt) {
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    }
    return { success: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: limit - record.count }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  })
}, 60000) // Clean every minute

