import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithSWR, SWROptions, getCached } from '@/lib/clientQueryCache';

export function useClientQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: SWROptions<T> & { enabled?: boolean } = {}
) {
  const { enabled = true, staleTimeMs = 60000 } = options;
  const initialCached = key ? getCached<T>(key) : undefined;

  const [data, setData] = useState<T | undefined>(initialCached);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCached && enabled);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async (forceRefresh = false) => {
    if (!key || !enabled) return;

    const cached = getCached<T>(key);
    if (!cached || forceRefresh) {
      setIsLoading(true);
    } else {
      setIsRevalidating(true);
    }

    try {
      const result = await fetchWithSWR<T>(
        key,
        () => fetcherRef.current(),
        {
          staleTimeMs,
          forceRefresh,
          onRevalidate: (fresh) => {
            setData(fresh);
            setIsRevalidating(false);
          },
        }
      );

      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [key, enabled, staleTimeMs]);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    isLoading,
    isRevalidating,
    error,
    refetch: () => execute(true),
  };
}
