/**
 * KnowledgePaat Client Query Cache & Stale-While-Revalidate (SWR) Engine
 * Zero-dependency, lightweight, high-performance in-memory cache for client components.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  inFlightPromise?: Promise<T>;
}

const clientStore = new Map<string, CacheEntry<any>>();

export interface SWROptions<T> {
  staleTimeMs?: number;      // How long cached data is considered completely fresh (default: 60,000ms = 1m)
  onRevalidate?: (freshData: T) => void; // Callback when background revalidation completes with new data
  forceRefresh?: boolean;
}

/**
 * Fetch data with Stale-While-Revalidate semantics & concurrent request deduplication
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SWROptions<T> = {}
): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
  const { staleTimeMs = 60000, onRevalidate, forceRefresh = false } = options;
  const now = Date.now();
  const entry = clientStore.get(key);

  // 1. If fresh cached data exists and not force refreshed, return immediately
  if (!forceRefresh && entry && entry.data !== undefined) {
    const age = now - entry.timestamp;
    const isStale = age > staleTimeMs;

    if (!isStale) {
      return { data: entry.data, fromCache: true, isStale: false };
    }

    // Cached data is stale: Trigger background revalidation if no in-flight promise
    if (!entry.inFlightPromise) {
      entry.inFlightPromise = (async () => {
        try {
          const fresh = await fetcher();
          entry.data = fresh;
          entry.timestamp = Date.now();
          if (onRevalidate) {
            onRevalidate(fresh);
          }
          return fresh;
        } catch (err) {
          console.warn(`[SWR] Background revalidation failed for ${key}:`, err);
          return entry.data;
        } finally {
          entry.inFlightPromise = undefined;
        }
      })();
    }

    // Return stale data immediately so the UI renders with zero lag
    return { data: entry.data, fromCache: true, isStale: true };
  }

  // 2. If identical request is already in-flight, reuse the same Promise (Deduplication)
  if (entry && entry.inFlightPromise) {
    const data = await entry.inFlightPromise;
    return { data, fromCache: true, isStale: false };
  }

  // 3. Cold fetch (Initial request)
  const inFlight = (async () => {
    try {
      const fresh = await fetcher();
      clientStore.set(key, {
        data: fresh,
        timestamp: Date.now(),
      });
      return fresh;
    } finally {
      const e = clientStore.get(key);
      if (e) e.inFlightPromise = undefined;
    }
  })();

  clientStore.set(key, {
    data: entry?.data,
    timestamp: entry?.timestamp || now,
    inFlightPromise: inFlight,
  });

  const freshData = await inFlight;
  return { data: freshData, fromCache: false, isStale: false };
}

/**
 * Get currently cached data synchronously without triggering fetch
 */
export function getCached<T>(key: string): T | undefined {
  return clientStore.get(key)?.data;
}

/**
 * Invalidate matching keys (e.g. after admin create/update/delete mutations)
 */
export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    clientStore.clear();
    return;
  }
  for (const key of clientStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      clientStore.delete(key);
    }
  }
}

/**
 * Clear all cache entries on user logout or session termination
 */
export function clearClientCache(): void {
  clientStore.clear();
}
