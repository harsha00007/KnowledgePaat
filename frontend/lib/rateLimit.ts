import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// In-Memory Sliding Window Store with timestamp-based sliding log
interface MemoryBucket {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryBucket>();

// Periodic cleanup of stale memory entries (runs at most once every 60s)
let lastCleanup = Date.now();
function cleanupMemoryStore() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;

  for (const [key, bucket] of memoryStore.entries()) {
    // Keep timestamps from the last 10 minutes
    const valid = bucket.timestamps.filter(t => now - t < 600000);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      bucket.timestamps = valid;
    }
  }
}

/**
 * Extract trusted real client IP from incoming NextRequest
 */
export function getRealClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip') || 
                 req.headers.get('cf-connecting-ip') || 
                 req.headers.get('x-client-ip');
                 
  return realIp ? realIp.trim() : '127.0.0.1';
}

/**
 * Check Rate Limit for a given unique key (user ID or IP + action)
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // 1. Check for Upstash Redis distributed credentials in environment
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `ratelimit:${key}`;
      // Upstash REST INCR & EXPIRE pipeline
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, windowSeconds, 'NX'],
          ['TTL', redisKey],
        ]),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const count = results[0]?.result || 1;
        const ttl = Math.max(1, results[2]?.result || windowSeconds);

        const remaining = Math.max(0, limit - count);
        const reset = Math.floor(now / 1000) + ttl;
        const success = count <= limit;

        return {
          success,
          limit,
          remaining,
          reset,
          retryAfter: success ? undefined : ttl,
        };
      }
    } catch (err) {
      console.warn('Upstash Redis rate limit fallback to memory store:', err);
    }
  }

  // 2. Sliding Window Memory Engine (Fallback)
  cleanupMemoryStore();

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(key, bucket);
  }

  // Remove timestamps outside the sliding window
  const windowStart = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter(t => t > windowStart);

  if (bucket.timestamps.length < limit) {
    bucket.timestamps.push(now);
    const remaining = limit - bucket.timestamps.length;
    const oldestTimestamp = bucket.timestamps[0] || now;
    const resetMs = (oldestTimestamp + windowMs) - now;
    const reset = Math.ceil(resetMs / 1000);

    return {
      success: true,
      limit,
      remaining,
      reset: Math.max(1, reset),
    };
  }

  // Limit exceeded
  const oldestTimestamp = bucket.timestamps[0] || now;
  const retryAfterMs = (oldestTimestamp + windowMs) - now;
  const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

  return {
    success: false,
    limit,
    remaining: 0,
    reset: retryAfter,
    retryAfter,
  };
}

/**
 * Standard 429 Too Many Requests response builder
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = result.retryAfter || 60;
  
  return NextResponse.json(
    {
      error: `Too many requests. Please slow down and try again in ${retryAfterSec} seconds.`,
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

/**
 * Inject rate limit headers onto a successful response
 */
export function addRateLimitHeaders(
  res: NextResponse,
  result: RateLimitResult
): NextResponse {
  res.headers.set('X-RateLimit-Limit', String(result.limit));
  res.headers.set('X-RateLimit-Remaining', String(result.remaining));
  res.headers.set('X-RateLimit-Reset', String(result.reset));
  return res;
}

/**
 * Centralized Predefined Rate Limiting Policies
 */
export const RATE_LIMIT_POLICIES = {
  // AI Mock Interview Tiers
  AI_MOCK_START: { limit: 10, windowSeconds: 300 },       // 10 starts per 5 mins
  AI_MOCK_EVALUATE: { limit: 20, windowSeconds: 60 },     // 20 evaluations per minute
  AI_MOCK_SUBMIT: { limit: 30, windowSeconds: 60 },       // 30 answers per minute
  AI_MOCK_COMPLETE: { limit: 10, windowSeconds: 300 },    // 10 completions per 5 mins
  
  // AI Career Intelligence & Voice
  AI_CAREER_PLAN: { limit: 10, windowSeconds: 300 },      // 10 plans per 5 mins
  SPEECH_TO_TEXT: { limit: 15, windowSeconds: 60 },       // 15 audio transcriptions per minute
  
  // Admin Operations
  ADMIN_BULK_IMPORT: { limit: 15, windowSeconds: 300 },   // 15 bulk imports per 5 mins
  ADMIN_SETTINGS: { limit: 30, windowSeconds: 60 },       // 30 settings updates per minute
  
  // Student Assessment & Progress
  TEST_SUBMIT: { limit: 30, windowSeconds: 300 },         // 30 test submissions per 5 mins
  CAREER_PROGRESS: { limit: 30, windowSeconds: 60 },      // 30 progress aggregations per minute
  TASK_UPDATE: { limit: 60, windowSeconds: 60 },          // 60 task toggles per minute
  
  // Payment & Checkout Transactions (Razorpay Test Mode)
  PAYMENT_CREATE: { limit: 15, windowSeconds: 300 },      // 15 order creations per 5 mins
  PAYMENT_VERIFY: { limit: 20, windowSeconds: 300 },      // 20 verification attempts per 5 mins

  // Public Inquiries
  CONTACT_SUBMIT: { limit: 5, windowSeconds: 300 },       // 5 contact messages per 5 mins per IP
};
