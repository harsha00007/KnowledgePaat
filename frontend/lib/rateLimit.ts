import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import '@/utils/supabase/dnsPin';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  isSensitive?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  outage?: boolean;
}

// In-Memory Sliding Window Store for local fallback / non-sensitive operations
interface MemoryBucket {
  timestamps: number[];
}

const memoryStore = new Map<string, MemoryBucket>();

let lastCleanup = Date.now();
function cleanupMemoryStore() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return;
  lastCleanup = now;

  for (const [key, bucket] of memoryStore.entries()) {
    const valid = bucket.timestamps.filter(t => now - t < 600000);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      bucket.timestamps = valid;
    }
  }
}

/**
 * Lazy-initialized singleton Supabase admin client for shared rate-limit state
 */
let sharedAdminSupabase: SupabaseClient | null = null;
function getSharedSupabaseClient(): SupabaseClient | null {
  if (sharedAdminSupabase) return sharedAdminSupabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  try {
    sharedAdminSupabase = createSupabaseClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return sharedAdminSupabase;
  } catch (err) {
    console.error('Failed to initialize shared Supabase client for rate limiting:', err);
    return null;
  }
}

/**
 * Extract trusted real client IP from incoming NextRequest
 * 
 * TRUSTED PROXY CONFIGURATION & SECURITY ARCHITECTURE:
 * -----------------------------------------------------
 * In production/staging hosting architectures (e.g. Cloudflare, AWS ALB, Nginx):
 * 1. An edge proxy terminates TLS, strips spoofable client headers, and injects
 *    authoritative client IP headers (`cf-connecting-ip`, `x-real-ip`).
 * 2. Forwarded headers are ONLY trusted when the immediate upstream connection
 *    originates from a trusted proxy path (configured via TRUST_PROXY=true).
 * 3. In unverified or direct local environments without a verified edge proxy,
 *    forwarded headers are NOT trusted to prevent header spoofing attacks.
 * 4. CRITICAL: Account quotas for authenticated customers NEVER rely on client IP;
 *    they bind strictly to the server-verified user ID (from verified Supabase JWT).
 */
import crypto from 'crypto';

function safeCompareSecret(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function getRealClientIp(req: NextRequest): string {
  const isVercel = process.env.VERCEL === '1';

  // 1. Explicit Isolated Test Harness (strictly isolated tests, never general production or deployed traffic)
  const isIsolatedTest = process.env.ISOLATED_TEST_RUN === 'true';
  if (isIsolatedTest && !isVercel) {
    const simIp = req.headers.get('x-test-simulated-ip')?.trim();
    if (simIp && isValidIp(simIp)) return simIp;
  }

  // 2. Deployment-Aware Platform: Vercel Edge Platform Ingress
  // On Vercel, serverless function Request objects do not expose a raw TCP socket (req.socket is undefined).
  // The Vercel edge router injects and sanitizes `x-vercel-forwarded-for`, `x-real-ip`, and NextRequest.ip.
  // External clients cannot spoof `x-vercel-forwarded-for` because Vercel strips or overwrites it.
  if (isVercel) {
    // If an external reverse proxy (e.g. Cloudflare) is chained in front of Vercel,
    // verify the edge secret before trusting Cloudflare's cf-connecting-ip.
    const trustProxy = process.env.TRUST_PROXY === 'true';
    const configuredEdgeSecret = process.env.EDGE_AUTH_SECRET;
    if (trustProxy && configuredEdgeSecret) {
      const incomingEdgeSecret = req.headers.get('x-edge-secret') || req.headers.get('x-origin-verify');
      if (safeCompareSecret(incomingEdgeSecret, configuredEdgeSecret)) {
        const cfIp = req.headers.get('cf-connecting-ip');
        if (cfIp && isValidIp(cfIp.trim())) {
          return cfIp.trim();
        }
      }
    }

    // Authoritative Vercel platform-forwarded header (first entry is the client IP)
    const vercelForwarded = req.headers.get('x-vercel-forwarded-for');
    if (vercelForwarded) {
      const rawIp = vercelForwarded.split(',')[0].trim();
      const cleanIp = rawIp.replace(/:\d+$/, '');
      if (isValidIp(cleanIp)) {
        return cleanIp;
      }
    }

    // Vercel real IP header
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      const cleanIp = realIp.trim().replace(/:\d+$/, '');
      if (isValidIp(cleanIp)) {
        return cleanIp;
      }
    }

    // NextRequest platform IP injected by Next.js on Vercel
    const reqWithIp = req as unknown as { ip?: string };
    if (reqWithIp.ip && isValidIp(reqWithIp.ip.trim())) {
      return reqWithIp.ip.trim();
    }
  }

  // 3. Verified Reverse Proxy Ingress (Cloudflare / Edge Load Balancer in non-Vercel deployments)
  // CRITICAL SECURITY: Presence of CF-Ray or CF-Connecting-IP alone is NOT proof of trusted ingress,
  // because direct-access clients can forge those headers. Ingress is verified ONLY if:
  // a) TRUST_PROXY is enabled, AND
  // b) An authentic Edge Secret is configured AND matches via timing-safe comparison.
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const configuredEdgeSecret = process.env.EDGE_AUTH_SECRET;

  if (trustProxy && configuredEdgeSecret) {
    const incomingEdgeSecret = req.headers.get('x-edge-secret') || req.headers.get('x-origin-verify');
    const isVerifiedIngress = safeCompareSecret(incomingEdgeSecret, configuredEdgeSecret);

    if (isVerifiedIngress) {
      // Authoritative Cloudflare edge header from verified proxy
      const cfIp = req.headers.get('cf-connecting-ip');
      if (cfIp && isValidIp(cfIp.trim())) {
        return cfIp.trim();
      }

      // Upstream trusted reverse proxy header
      const realIp = req.headers.get('x-real-ip');
      if (realIp && isValidIp(realIp.trim())) {
        return realIp.trim();
      }

      // Leftmost entry in verified forwarded chain
      const forwarded = req.headers.get('x-forwarded-for');
      if (forwarded) {
        const rawIp = forwarded.split(',')[0].trim();
        const cleanIp = rawIp.replace(/:\d+$/, '');
        if (isValidIp(cleanIp)) {
          return cleanIp;
        }
      }
    }
  }

  // 4. Direct socket connection or unverified ingress:
  // Strictly ignore client-supplied spoofable headers (CF-Ray, CF-Connecting-IP, X-Forwarded-For)
  const reqWithSocket = req as unknown as { ip?: string; socket?: { remoteAddress?: string } };
  const socketIp = reqWithSocket.ip || reqWithSocket.socket?.remoteAddress;
  if (socketIp && isValidIp(socketIp.trim())) {
    return socketIp.trim();
  }

  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check and Consume Rate Limit atomically across application instances.
 * 
 * ALGORITHM SPECIFICATIONS:
 * -------------------------
 * 1. PostgreSQL Engine (Active Shared Staging/Prod Backend):
 *    - Algorithm: Fixed-Window Quantization with Atomic Unique Slot Reservation.
 *    - Quantization: Time is partitioned into discrete fixed-size buckets:
 *        windowBucket = Math.floor(now / (windowSeconds * 1000))
 *    - Atomicity: Concurrent cluster instances claim deterministic slots:
 *        event_id = "rl:${key}:${windowBucket}:${slot}"
 *      PostgreSQL's native UNIQUE constraint on event_id enforces slot ownership.
 *      Losers receive code 23505 and advance to the next slot until limit is reached.
 *    - Retention & Isolation: Expired slot cleanup is strictly scoped to
 *      gateway='rate_limit' AND event_type=key. A short-window policy NEVER deletes
 *      active reservations of a longer-window policy or genuine payment webhooks.
 * 
 * 2. Redis Engine (Optional Distributed Backend):
 *    - Algorithm: Sliding-Window Log via Atomic Server-Side Lua Script.
 *    - Storage: Redis Sorted Set (ZSET) keyed by `ratelimit:${key}`.
 *    - Execution: Atomically executes ZREMRANGEBYSCORE to prune timestamps older than
 *      now - (windowSeconds * 1000), checks ZCARD < limit, and records ZADD.
 *    - Precision: Sub-second sliding window log precision.
 * 
 * 3. In-Memory Store (Local Fallback):
 *    - Algorithm: In-Memory Sliding Window Log for local development and non-sensitive
 *      fail-open public search operations during database degradation.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds, isSensitive = false } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // ── 1. Check for Redis distributed backend in environment ──
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `ratelimit:${key}`;
      // Atomic Lua script executed on Redis server
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local clearBefore = now - (window * 1000)

        redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
        local current = redis.call('ZCARD', key)

        if current < limit then
            redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
            redis.call('EXPIRE', key, window)
            return {1, limit - current - 1, window}
        else
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            local retryAfter = 1
            if #oldest > 0 then
                local oldestTime = tonumber(oldest[2])
                local diff = math.ceil(((oldestTime + (window * 1000)) - now) / 1000)
                if diff > 0 then retryAfter = diff end
            end
            return {0, 0, retryAfter}
        end
      `;

      const evalRes = await fetch(`${upstashUrl}/eval`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: luaScript,
          keys: [redisKey],
          args: [String(limit), String(windowSeconds), String(now)],
        }),
      });

      if (evalRes.ok) {
        const json = await evalRes.json();
        const [allowed, remaining, retryAfter] = json.result || [1, limit - 1, windowSeconds];
        const success = allowed === 1;

        return {
          success,
          limit,
          remaining: Math.max(0, remaining),
          reset: retryAfter || windowSeconds,
          retryAfter: success ? undefined : retryAfter,
        };
      }
    } catch (err) {
      console.warn('Redis rate limit error, falling back to shared DB:', err);
    }
  }

  // ── 2. Shared Multi-Instance Database Engine (PostgreSQL via Supabase) ──
  // Dedicated rate-limit storage for sensitive operations (financial, auth, mutations).
  // High-frequency public read traffic (isSensitive: false) routes to in-memory sliding window
  // to avoid redundant database roundtrips and connection pool exhaustion under load.
  const supabase = isSensitive ? getSharedSupabaseClient() : null;

  if (supabase) {
    try {
      const windowBucket = Math.floor(now / windowMs);
      const windowStartIso = new Date(windowBucket * windowMs).toISOString();
      const windowEndMs = (windowBucket + 1) * windowMs;
      const windowEndIso = new Date(windowEndMs).toISOString();
      const retryAfter = Math.max(1, Math.ceil((windowEndMs - now) / 1000));

      // Query existing claimed slots within current window bucket
      const { count, error: countErr } = await supabase
        .from('ebook_webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('gateway', 'rate_limit')
        .eq('event_type', key)
        .eq('status', 'processed')
        .gte('created_at', windowStartIso);

      if (countErr) {
        throw countErr;
      }

      const currentCount = count || 0;

      // If already at or above limit, immediately block without inserting
      if (currentCount >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: retryAfter,
          retryAfter,
        };
      }

      // Atomically claim the next slot in this window bucket.
      // If concurrent processes race to claim the same slot, PostgreSQL's
      // UNIQUE constraint on event_id enforces that only one succeeds;
      // losers catch code 23505 and increment to the next slot until limit is reached.
      let claimed = false;
      let claimedSlot = 0;
      const startSlot = currentCount + 1;

      for (let slot = startSlot; slot <= limit; slot++) {
        const slotEventId = `rl:${key}:${windowBucket}:${slot}`;
        const { error: insErr } = await supabase
          .from('ebook_webhook_events')
          .insert({
            event_id: slotEventId,
            event_type: key,
            gateway: 'rate_limit',
            status: 'processed',
            payload: { slot, limit, windowSeconds, bucket: windowBucket, expires_at: windowEndIso },
          });

        if (!insErr) {
          claimed = true;
          claimedSlot = slot;
          break;
        }

        // Unique constraint violation (23505) -> slot was claimed by another instance concurrently
        if (insErr.code === '23505' || insErr.message?.includes('unique') || insErr.message?.includes('duplicate')) {
          continue; // Try next slot
        }

        // Unexpected database error
        throw insErr;
      }

      if (claimed) {
        const remaining = Math.max(0, limit - claimedSlot);

        // Bounded retention: Scoped cleanup strictly restricted to THIS key and window.
        // Critical: Must NEVER delete still-active quota reservations for longer-window policies
        // or other keys. Scoping by event_type=key and gateway='rate_limit' guarantees
        // cross-policy isolation and leaves genuine payment webhooks ('razorpay') 100% untouched.
        const pruneBeforeIso = new Date(now - (windowMs * 2)).toISOString();
        supabase
          .from('ebook_webhook_events')
          .delete()
          .eq('gateway', 'rate_limit')
          .eq('event_type', key)
          .lt('created_at', pruneBeforeIso)
          .then(() => {}, () => {}); // Fire and forget cleanup

        return {
          success: true,
          limit,
          remaining,
          reset: retryAfter,
        };
      }

      // All slots up to limit are occupied
      return {
        success: false,
        limit,
        remaining: 0,
        reset: retryAfter,
        retryAfter,
      };
    } catch (dbErr) {
      console.error('Shared database rate limiter error:', dbErr);

      // Handle limiter outages explicitly:
      // Sensitive operations MUST fail closed with outage: true
      if (isSensitive) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: 30,
          retryAfter: 30,
          outage: true,
        };
      }
      // Non-sensitive operations continue via local fallback (fail-open)
    }
  }

  // ── 3. In-Memory Sliding Window Engine (Local Dev / Non-sensitive Fallback) ──
  if (isSensitive && !supabase && !upstashUrl) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: 30,
        retryAfter: 30,
        outage: true,
      };
    }
  }

  cleanupMemoryStore();

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(key, bucket);
  }

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
 * Standard Response Builder:
 * - Quota exhausted: Returns HTTP 429 Too Many Requests with Retry-After and rate limit headers.
 * - Limiter outage: Returns HTTP 503 Service Unavailable, preserving payment recoverability and webhook retries.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = result.retryAfter || 30;

  if (result.outage) {
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable. Rate limiter service is unreachable. Sensitive operations are safely protected. Please retry shortly.',
        code: 'LIMITER_UNAVAILABLE',
        retryAfter: retryAfterSec,
      },
      {
        status: 503, // Truthful Service Unavailable on limiter backend outage
        headers: {
          'Retry-After': String(retryAfterSec),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return NextResponse.json(
    {
      error: `Too many requests. Please slow down and try again in ${retryAfterSec} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfterSec,
    },
    {
      status: 429, // Quota exhausted
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
 * Centralized Predefined Rate Limiting Policies for all 18 actions
 */
export const RATE_LIMIT_POLICIES = {
  // Authentication & Verification Flows (Sensitive Security Operations, fail-closed)
  AUTH_REGISTER: { limit: 10, windowSeconds: 300, isSensitive: true },
  AUTH_VERIFY_OTP: { limit: 10, windowSeconds: 300, isSensitive: true },
  AUTH_RESEND_OTP: { limit: 5, windowSeconds: 300, isSensitive: true },
  AUTH_LOGIN: { limit: 15, windowSeconds: 300, isSensitive: true },

  // Public Search & Catalogue (Non-sensitive, fail-open)
  CATALOGUE_SEARCH: { limit: 240, windowSeconds: 60, isSensitive: false },
  CART_VALIDATE: { limit: 60, windowSeconds: 60, isSensitive: false },

  // Orders, Upgrades & Payments (Sensitive Financial Operations, fail-closed)
  ORDER_CREATE: { limit: 10, windowSeconds: 300, isSensitive: true },
  PAYMENT_CREATE: { limit: 15, windowSeconds: 300, isSensitive: true },
  EBOOK_UPGRADE: { limit: 10, windowSeconds: 300, isSensitive: true },
  PAYMENT_VERIFY: { limit: 20, windowSeconds: 300, isSensitive: true },
  STATUS_RECOVERY: { limit: 30, windowSeconds: 60, isSensitive: true },

  // PDF Download Link Issuance (Sensitive Asset Token Issuance, fail-closed)
  EBOOK_DOWNLOAD: { limit: 15, windowSeconds: 60, isSensitive: true },

  // Reader Search & Persistence Writes (Keeps autosaves usable, non-sensitive)
  READER_SEARCH: { limit: 30, windowSeconds: 60, isSensitive: false },
  READER_PERSIST: { limit: 60, windowSeconds: 60, isSensitive: false },
  READER_BOOKMARK: { limit: 30, windowSeconds: 60, isSensitive: false },

  // Admin Mutations (Sensitive Administrative Operations, fail-closed)
  ADMIN_PRICING_MUTATION: { limit: 30, windowSeconds: 60, isSensitive: true },
  ADMIN_HOMEPAGE_MUTATION: { limit: 30, windowSeconds: 60, isSensitive: true },
  ADMIN_ACCESS_MUTATION: { limit: 30, windowSeconds: 60, isSensitive: true },
  ADMIN_UPLOAD: { limit: 10, windowSeconds: 300, isSensitive: true },
  ADMIN_EXPORT: { limit: 10, windowSeconds: 300, isSensitive: true },
  ADMIN_SETTINGS: { limit: 30, windowSeconds: 60, isSensitive: true },
  ADMIN_BULK_IMPORT: { limit: 15, windowSeconds: 300, isSensitive: true },

  // Refunds (Sensitive Financial Reversals, fail-closed)
  REFUND_INITIATE: { limit: 10, windowSeconds: 300, isSensitive: true },
  REFUND_RECONCILE: { limit: 20, windowSeconds: 60, isSensitive: true },

  // Payment Webhook (High throughput provider callback, fail-closed to 503 for provider retry)
  PAYMENT_WEBHOOK: { limit: 120, windowSeconds: 60, isSensitive: true },

  // Legacy & Auxiliaries
  AI_MOCK_START: { limit: 10, windowSeconds: 300, isSensitive: true },
  AI_MOCK_SUBMIT: { limit: 60, windowSeconds: 60, isSensitive: false },
  AI_MOCK_EVALUATE: { limit: 30, windowSeconds: 60, isSensitive: false },
  AI_MOCK_COMPLETE: { limit: 30, windowSeconds: 60, isSensitive: false },
  SPEECH_TO_TEXT: { limit: 30, windowSeconds: 60, isSensitive: false },
  CAREER_PROGRESS: { limit: 60, windowSeconds: 60, isSensitive: false },
  AI_CAREER_PLAN: { limit: 10, windowSeconds: 300, isSensitive: true },
  TASK_UPDATE: { limit: 60, windowSeconds: 60, isSensitive: false },
  CONTACT_SUBMIT: { limit: 10, windowSeconds: 300, isSensitive: false },
  TEST_SUBMIT: { limit: 30, windowSeconds: 60, isSensitive: false },
} as const;

/**
 * Safely prune expired rate-limit records without ever affecting:
 * - Active reservations of longer-window policies
 * - Genuine payment webhook records (gateway='razorpay')
 * - Business audit history (ebook_audit_logs is completely separate)
 * 
 * Uses per-record expiry metadata (payload->>expires_at) or appropriately scoped
 * event_type filtering so that short-window cleanups never delete active long-window quotas.
 */
export async function pruneRateLimitRecords(options?: {
  key?: string;
  olderThanMs?: number;
}): Promise<{ deletedCount?: number }> {
  const supabase = getSharedSupabaseClient();
  if (!supabase) return {};

  const nowIso = new Date().toISOString();
  let query = supabase
    .from('ebook_webhook_events')
    .delete()
    .eq('gateway', 'rate_limit');

  if (options?.key) {
    query = query.eq('event_type', options.key);
    if (options.olderThanMs !== undefined) {
      const pruneBeforeIso = new Date(Date.now() - options.olderThanMs).toISOString();
      query = query.lt('created_at', pruneBeforeIso);
    } else {
      query = query.lt('payload->>expires_at', nowIso);
    }
  } else {
    // Unscoped/global cleanup: strictly enforce per-record expiry check
    // Active reservations for longer-window policies (expires_at in the future) are preserved
    query = query.lt('payload->>expires_at', nowIso);
  }

  const { data } = await query.select('id');
  return { deletedCount: data?.length || 0 };
}
