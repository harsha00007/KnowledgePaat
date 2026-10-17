'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { calculateRoadmapProgress } from '@/lib/progressCalculations';
import type {
  TopicProgressStatus,
  ValidTopicStatus,
  RoadmapProgressStats,
  RoadmapProgressMergeItem,
} from '@/types/roadmap';

const LOCAL_STORAGE_KEY = 'knowledgepaat:roadmap-progress';

interface LocalNodeProgress {
  status: ValidTopicStatus;
  updatedAt: string;
}

type LocalStorageStore = Record<string, Record<string, LocalNodeProgress>>;

function getLocalStore(): LocalStorageStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalStore(store: LocalStorageStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('[saveLocalStore] Failed to write localStorage:', e);
  }
}

export function useRoadmapProgress(roadmapSlug: string, eligibleNodeIds: string[]) {
  const [statuses, setStatuses] = useState<Record<string, TopicProgressStatus>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Compute live progress statistics
  const stats = useMemo<RoadmapProgressStats>(() => {
    return calculateRoadmapProgress(statuses, eligibleNodeIds);
  }, [statuses, eligibleNodeIds]);

  // Initial load & sync
  useEffect(() => {
    let isMounted = true;

    async function initializeProgress() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (!isMounted) return;
          setIsLoggedIn(true);

          // 1. Check for unmerged local progress in localStorage
          const localStore = getLocalStore();
          const roadmapLocal = localStore[roadmapSlug] || {};
          const localEntries = Object.entries(roadmapLocal);

          if (localEntries.length > 0) {
            const items: RoadmapProgressMergeItem[] = localEntries.map(([nodeId, val]) => ({
              nodeId,
              status: val.status,
              updatedAt: val.updatedAt,
            }));

            try {
              const mergeRes = await fetch('/api/me/roadmap-progress/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
              });

              if (mergeRes.ok) {
                // Clear merged roadmap entries from localStorage
                delete localStore[roadmapSlug];
                saveLocalStore(localStore);
              }
            } catch (err) {
              console.warn('[useRoadmapProgress] Merge attempt failed:', err);
            }
          }

          // 2. Fetch authoritative server progress
          const res = await fetch(`/api/me/roadmap-progress?roadmap=${encodeURIComponent(roadmapSlug)}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setStatuses(data.progress || {});
              setIsLoaded(true);
            }
            return;
          }
        }

        // Logged-out fallback: load from localStorage
        if (isMounted) {
          setIsLoggedIn(false);
          const localStore = getLocalStore();
          const roadmapLocal = localStore[roadmapSlug] || {};
          const loadedStatuses: Record<string, TopicProgressStatus> = {};
          for (const [nodeId, item] of Object.entries(roadmapLocal)) {
            loadedStatuses[nodeId] = item.status;
          }
          setStatuses(loadedStatuses);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('[useRoadmapProgress] Initialization error:', err);
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initializeProgress();

    return () => {
      isMounted = false;
    };
  }, [roadmapSlug, supabase]);

  // Toggle status for a node with optimistic UI
  const toggleStatus = useCallback(
    async (nodeId: string, targetStatus: ValidTopicStatus) => {
      // Determine new status: clicking currently active status toggles it back to null
      const currentStatus = statuses[nodeId] || null;
      const nextStatus: TopicProgressStatus = currentStatus === targetStatus ? null : targetStatus;

      // 1. Optimistic update
      setStatuses((prev) => {
        const next = { ...prev };
        if (nextStatus === null) {
          delete next[nodeId];
        } else {
          next[nodeId] = nextStatus;
        }
        return next;
      });

      // Clear any prior error
      setErrorNotice(null);

      // 2. Logged-out: save directly to localStorage
      if (!isLoggedIn) {
        const localStore = getLocalStore();
        if (!localStore[roadmapSlug]) {
          localStore[roadmapSlug] = {};
        }

        if (nextStatus === null) {
          delete localStore[roadmapSlug][nodeId];
        } else {
          localStore[roadmapSlug][nodeId] = {
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        saveLocalStore(localStore);
        return;
      }

      // 3. Logged-in: persist to backend
      try {
        const res = await fetch(`/api/me/roadmap-progress/${encodeURIComponent(nodeId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!res.ok) {
          throw new Error('Failed to update progress on server.');
        }
      } catch (err) {
        console.error('[useRoadmapProgress] Status mutation failed:', err);
        // Rollback optimistic update
        setStatuses((prev) => {
          const rollback = { ...prev };
          if (currentStatus === null) {
            delete rollback[nodeId];
          } else {
            rollback[nodeId] = currentStatus;
          }
          return rollback;
        });
        setErrorNotice('Could not sync progress with your account. Rolled back.');
      }
    },
    [statuses, isLoggedIn, roadmapSlug]
  );

  return {
    statuses,
    stats,
    toggleStatus,
    isLoaded,
    isLoggedIn,
    errorNotice,
  };
}
