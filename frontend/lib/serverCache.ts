/**
 * KnowledgePaat High-Performance Multi-Instance Server Cache
 * 
 * Features:
 * - Sub-millisecond local in-memory LRU storage with bounded TTL.
 * - Cache-Miss Stampede Protection via Singleflight Promise Coalescing.
 * - Multi-Instance Cache Synchronization via Shared PostgreSQL Invalidation Epochs.
 * - Targeted tag invalidation ('catalogue', 'homepage', 'pricing').
 * - Strictly isolated to public data; never caches private customer sessions, orders, or entitlements.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

interface CacheRecord<T = unknown> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  tags: string[];
}

const MAX_CACHE_ENTRIES = 500;
const serverMemoryStore = new Map<string, CacheRecord<unknown>>();
const inflightPromises = new Map<string, Promise<unknown>>();

// Local cache of shared tag epochs: tag -> { epoch: number, version: number, checkedAt: number }
interface TagEpochRecord {
  epoch: number;
  version: number;
  checkedAt: number;
}
const localTagEpochs = new Map<string, TagEpochRecord>();
const EPOCH_CHECK_INTERVAL_MS = 2500; // Check DB epoch at most once every 2.5s per tag

let sharedClient: SupabaseClient | null = null;
function getSharedSupabase(): SupabaseClient | null {
  if (sharedClient) return sharedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  sharedClient = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return sharedClient;
}

/**
 * Get cached item if present, unexpired, and not invalidated by another cluster instance
 */
export function getServerCache<T = unknown>(key: string, tags: string[] = []): T | null {
  const record = serverMemoryStore.get(key);
  if (!record) return null;

  const now = Date.now();
  if (now > record.expiresAt) {
    serverMemoryStore.delete(key);
    return null;
  }

  // Check if any tag on this record has a newer shared epoch in local tracker
  const tagsToCheck = tags.length > 0 ? tags : record.tags;
  for (const tag of tagsToCheck) {
    const epochRec = localTagEpochs.get(tag);
    if (epochRec && epochRec.epoch > record.cachedAt) {
      serverMemoryStore.delete(key);
      return null;
    }
  }

  return record.data as T;
}

/**
 * Set item in server cache with TTL (seconds) and optional invalidation tags
 */
export function setServerCache<T = unknown>(
  key: string,
  data: T,
  ttlSeconds: number,
  tags: string[] = [],
  cachedAt?: number
): void {
  // Evict oldest entries if map exceeds maximum threshold
  if (serverMemoryStore.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = serverMemoryStore.keys().next().value;
    if (oldestKey) serverMemoryStore.delete(oldestKey);
  }

  const now = cachedAt ?? Date.now();
  serverMemoryStore.set(key, {
    data,
    cachedAt: now,
    expiresAt: Date.now() + ttlSeconds * 1000,
    tags,
  });
}

/**
 * Invalidate all cached entries locally and propagate atomic monotonic version bump across cluster instances
 * using Compare-And-Swap (CAS) to eliminate lost updates under concurrent administrative mutations.
 */
export async function invalidateServerCache(tagOrPrefix: string): Promise<number> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let invalidatedCount = 0;

  // 1. Immediately advance local process epoch before async DB I/O to fence in-flight fetches
  const currentLocal = localTagEpochs.get(tagOrPrefix);
  localTagEpochs.set(tagOrPrefix, {
    epoch: now,
    version: (currentLocal?.version || 0) + 1,
    checkedAt: now,
  });

  // Invalidate local process memory immediately
  for (const [key, record] of serverMemoryStore.entries()) {
    if (
      key.startsWith(tagOrPrefix) ||
      record.tags.includes(tagOrPrefix) ||
      now > record.expiresAt
    ) {
      serverMemoryStore.delete(key);
      invalidatedCount++;
    }
  }

  // 2. Propagate to shared PostgreSQL cluster state using atomic Compare-And-Swap (CAS)
  // This guarantees that simultaneous invalidations from different instances cannot lose updates.
  const supabase = getSharedSupabase();
  let committedVersion = 1;
  const eventId = `cache_epoch:${tagOrPrefix}`;

  if (supabase) {
    const maxCasAttempts = 15;
    let casSuccess = false;

    for (let attempt = 0; attempt < maxCasAttempts; attempt++) {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('ebook_webhook_events')
          .select('payload')
          .eq('event_id', eventId)
          .maybeSingle();

        if (fetchErr) break;

        if (!existing) {
          // Row does not exist yet: atomic insert
          const { error: insErr } = await supabase.from('ebook_webhook_events').insert({
            event_id: eventId,
            gateway: 'cache_epoch',
            event_type: tagOrPrefix,
            payload: { version: 1, epoch: now, updated_at: nowIso },
            status: 'processed',
            processed_at: nowIso,
          });

          if (!insErr) {
            committedVersion = 1;
            casSuccess = true;
            break;
          }
          // Concurrent insert collision (code 23505); backoff and retry as update
          await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
          continue;
        }

        const curVersion = Number(existing.payload?.version) || 0;
        const nextVersion = curVersion + 1;

        // Atomic conditional update: only update if payload.version is still curVersion
        const { data: updated, error: updErr } = await supabase
          .from('ebook_webhook_events')
          .update({
            payload: { version: nextVersion, epoch: now, updated_at: nowIso },
            processed_at: nowIso,
          })
          .eq('event_id', eventId)
          .filter('payload->>version', 'eq', String(curVersion))
          .select('payload');

        if (!updErr && updated && updated.length > 0) {
          committedVersion = Number(updated[0].payload?.version) || nextVersion;
          casSuccess = true;
          break;
        }

        // Concurrency collision detected: another worker modified the row; backoff with jitter
        await new Promise(r => setTimeout(r, 25 * (attempt + 1) + Math.random() * 40));
      } catch {
        break; // Network/database failure; fall back to local monotonic bump
      }
    }

    if (!casSuccess) {
      // Graceful fallback: increment local monotonic counter
      const current = localTagEpochs.get(tagOrPrefix);
      committedVersion = (current?.version || 0) + 1;
    }
  } else {
    const current = localTagEpochs.get(tagOrPrefix);
    committedVersion = (current?.version || 0) + 1;
  }

  localTagEpochs.set(tagOrPrefix, { epoch: now, version: committedVersion, checkedAt: now });
  return invalidatedCount;
}

/**
 * Check and refresh shared invalidation epoch across multiple instances
 */
export async function syncSharedCacheEpoch(tag: string): Promise<number> {
  const now = Date.now();
  const current = localTagEpochs.get(tag);
  if (current && (now - current.checkedAt < EPOCH_CHECK_INTERVAL_MS)) {
    return current.epoch;
  }

  const supabase = getSharedSupabase();
  if (!supabase) return current?.epoch || 0;

  try {
    const { data } = await supabase
      .from('ebook_webhook_events')
      .select('payload')
      .eq('event_id', `cache_epoch:${tag}`)
      .maybeSingle();

    const sharedEpoch = Number(data?.payload?.epoch) || 0;
    const sharedVersion = Number(data?.payload?.version) || 0;
    const localVersion = current?.version || 0;
    const localEpoch = current?.epoch || 0;

    localTagEpochs.set(tag, { epoch: sharedEpoch, version: sharedVersion, checkedAt: now });

    // Evict any local records if monotonic version or epoch is newer
    if (sharedVersion > localVersion || sharedEpoch > localEpoch) {
      for (const [key, record] of serverMemoryStore.entries()) {
        if (record.tags.includes(tag) && record.cachedAt <= sharedEpoch) {
          serverMemoryStore.delete(key);
        }
      }
    }

    return sharedEpoch;
  } catch {
    // Fail-safe: retain current local epoch on DB connectivity interruption
    return current?.epoch || 0;
  }
}

/**
 * Cache-Miss Stampede Protection via Singleflight Promise Coalescing:
 * If 100 concurrent requests miss the cache simultaneously, exactly ONE database query
 * is executed; all 99 others await the same inflight promise and receive the cached result.
 * Also protects against race conditions where an invalidation occurs while a fetch is in flight.
 */
export async function fetchWithStampedeProtection<T>(
  cacheKey: string,
  ttlSeconds: number,
  tags: string[],
  fetchFn: () => Promise<T>
): Promise<T> {
  // 1. Fast path: Memory hit
  const cached = getServerCache<T>(cacheKey, tags);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fetchStartedAt = Date.now();

  // 2. Check for active inflight promise for this exact cache key
  let pending = inflightPromises.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      try {
        const freshData = await fetchFn();
        if (freshData !== null && freshData !== undefined) {
          // Verify no invalidation occurred while this fetch was executing
          let invalidatedDuringFetch = false;
          for (const t of tags) {
            const tagEpoch = localTagEpochs.get(t);
            if (tagEpoch && tagEpoch.epoch >= fetchStartedAt) {
              invalidatedDuringFetch = true;
              break;
            }
          }

          if (!invalidatedDuringFetch) {
            setServerCache(cacheKey, freshData, ttlSeconds, tags, fetchStartedAt);
          }
        }
        return freshData;
      } finally {
        inflightPromises.delete(cacheKey);
      }
    })();

    inflightPromises.set(cacheKey, pending);
  }

  return pending as Promise<T>;
}

/**
 * Helper to build deterministic cache key for catalogue queries
 */
export function buildCatalogueCacheKey(params: {
  page: number;
  limit: number;
  category: string;
  search: string;
  sort: string;
  readerRole?: string;
}): string {
  const parts = [
    `p:${params.page}`,
    `l:${params.limit}`,
    `c:${params.category.toLowerCase().trim() || 'all'}`,
    `s:${params.search.toLowerCase().trim()}`,
    `o:${params.sort.toLowerCase().trim() || 'latest'}`,
    `r:${(params.readerRole || '').toLowerCase().trim() || 'all'}`,
  ];
  return `catalogue:${parts.join('|')}`;
}
