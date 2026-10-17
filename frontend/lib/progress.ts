/**
 * KnowledgePaat — Career Roadmap Engine
 * Phase 3 — Learner Roadmap Progress Layer
 *
 * Provides progress calculation, persistence, and local-to-account merge logic.
 * Used exclusively in API routes and Server Components.
 */

import { createClient } from '@/utils/supabase/server';
import { isCatalogId, readCatalogRows, readCatalogRowsByIds, requireDatabaseResult } from './catalogIntegrity';
import type {
  TopicProgressStatus,
  ValidTopicStatus,
  RoadmapProgressStats,
  RoadmapProgressMergeItem,
  CareerUserRoadmapProgress,
  RoadmapCard,
} from '@/types/roadmap';
import { getPublicRoadmapCards } from './roadmap';

import {
  calculateRoadmapProgress,
  isValidTopicStatus,
  VALID_TOPIC_STATUSES,
} from './progressCalculations';
import { getCatalogRoadmapBySlug } from '@/content/roadmaps/catalog';

export {
  calculateRoadmapProgress,
  isValidTopicStatus,
  VALID_TOPIC_STATUSES,
};

/**
 * Fetch authenticated user's progress for a specific roadmap slug or all roadmaps.
 */
export async function getUserRoadmapProgress(
  userId: string,
  roadmapSlug?: string
): Promise<Record<string, ValidTopicStatus>> {
  if (!userId) return {};
  const supabase = await createClient();

  if (roadmapSlug) {
    // 1. Resolve roadmap ID
    const { data: roadmap, error: roadmapError } = await supabase
      .from('career_roadmaps')
      .select('id')
      .eq('slug', roadmapSlug)
      .eq('is_active', true)
      .maybeSingle();
    requireDatabaseResult(roadmapError, 'Roadmap progress lookup');

    if (!roadmap) return {};

    // 2. Fetch progress joined to active sections & nodes belonging to this roadmap
    const records = await readCatalogRows((from, to) => supabase
      .from('career_user_roadmap_progress')
      .select(`
        node_id,
        status,
        career_roadmap_nodes!inner(
          id,
          is_active,
          career_roadmap_sections!inner(
            roadmap_id,
            is_active
          )
        )
      `)
      .eq('user_id', userId)
      .eq('career_roadmap_nodes.is_active', true)
      .eq('career_roadmap_nodes.career_roadmap_sections.is_active', true)
      .eq('career_roadmap_nodes.career_roadmap_sections.roadmap_id', roadmap.id).order('node_id').range(from,to));

    const progressMap: Record<string, ValidTopicStatus> = {};
    for (const row of records) {
      if (isValidTopicStatus(row.status)) {
        progressMap[row.node_id] = row.status;
      }
    }
    return progressMap;
  }

  // Fetch all user progress
  const allRecords = await readCatalogRows((from, to) => supabase
    .from('career_user_roadmap_progress')
    .select('node_id, status')
    .eq('user_id', userId).order('node_id').range(from,to));

  const map: Record<string, ValidTopicStatus> = {};
  for (const row of allRecords) {
    if (isValidTopicStatus(row.status)) {
      map[row.node_id] = row.status;
    }
  }
  return map;
}

/**
 * Validate that a node exists, is active, and belongs to an active section & roadmap.
 */
export async function validateNodeForLearner(
  nodeId: string
): Promise<{ isValid: boolean; roadmapSlug?: string; error?: string }> {
  const supabase = await createClient();

  const { data: node, error } = await supabase
    .from('career_roadmap_nodes')
    .select(`
      id,
      is_active,
      career_roadmap_sections!inner(
        id,
        is_active,
        career_roadmaps!inner(
          id,
          slug,
          is_active
        )
      )
    `)
    .eq('id', nodeId)
    .maybeSingle();

  if (error || !node) {
    return { isValid: false, error: 'Roadmap node not found.' };
  }

  const section = (node as any).career_roadmap_sections;
  const roadmap = section?.career_roadmaps;

  if (!node.is_active || !section?.is_active || !roadmap?.is_active) {
    return { isValid: false, error: 'The requested roadmap node is inactive or draft.' };
  }

  return { isValid: true, roadmapSlug: roadmap.slug };
}

/**
 * Update or clear a learner's status on a roadmap node.
 * If status is null, removes the record.
 */
export async function setUserNodeProgress(
  userId: string,
  nodeId: string,
  status: TopicProgressStatus
): Promise<{ success: boolean; status: TopicProgressStatus; error?: string }> {
  if (!userId) {
    return { success: false, status: null, error: 'Authentication required.' };
  }

  const validation = await validateNodeForLearner(nodeId);
  if (!validation.isValid) {
    return { success: false, status: null, error: validation.error || 'Invalid node.' };
  }

  const supabase = await createClient();

  // If status is null, remove the user's progress record
  if (status === null) {
    const { error } = await supabase
      .from('career_user_roadmap_progress')
      .delete()
      .eq('user_id', userId)
      .eq('node_id', nodeId);

    if (error) {
      console.error('[setUserNodeProgress] Delete error:', error);
      return { success: false, status: null, error: 'Failed to clear progress.' };
    }

    return { success: true, status: null };
  }

  if (!isValidTopicStatus(status)) {
    return { success: false, status: null, error: 'Invalid status. Must be learning, done, skip, or null.' };
  }

  // Upsert progress with updated_at timestamp
  const { error } = await supabase
    .from('career_user_roadmap_progress')
    .upsert(
      {
        user_id: userId,
        node_id: nodeId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,node_id' }
    );

  if (error) {
    console.error('[setUserNodeProgress] Upsert error:', error);
    return { success: false, status: null, error: 'Failed to save progress.' };
  }

  return { success: true, status };
}

/**
 * Deterministic local-to-account merge rule:
 *
 * For each local progress item:
 * 1. Verify node exists and is active.
 * 2. If server has existing progress for (userId, nodeId):
 *    - If local item has a valid ISO timestamp and local updatedAt > server updated_at:
 *      local replaces server.
 *    - Otherwise: server record wins (retained).
 * 3. If no server record exists:
 *    - Insert local progress.
 *
 * Idempotent: Subsequent calls with the same payload produce identical outcomes.
 */
export async function mergeLocalRoadmapProgress(
  userId: string,
  items: RoadmapProgressMergeItem[]
): Promise<{
  success: boolean;
  progress: Record<string, ValidTopicStatus>;
  mergedCount: number;
  error?: string;
}> {
  if (!userId) {
    return { success: false, progress: {}, mergedCount: 0, error: 'Authentication required.' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    const currentProgress = await getUserRoadmapProgress(userId);
    return { success: true, progress: currentProgress, mergedCount: 0 };
  }

  const supabase = await createClient();

  // 1. Filter valid items
  const validItems = items.filter(
    (item) => item && typeof item.nodeId === 'string' && isValidTopicStatus(item.status)
  );

  if (validItems.length === 0) {
    const currentProgress = await getUserRoadmapProgress(userId);
    return { success: true, progress: currentProgress, mergedCount: 0 };
  }

  const targetNodeIds = Array.from(new Set(validItems.map((i) => i.nodeId)));

  // 2. Fetch existing server records for these nodes
  const { data: serverRecords, error: fetchErr } = await supabase
    .from('career_user_roadmap_progress')
    .select('node_id, status, updated_at')
    .eq('user_id', userId)
    .in('node_id', targetNodeIds);

  if (fetchErr) {
    console.error('[mergeLocalRoadmapProgress] Fetch error:', fetchErr);
    return { success: false, progress: {}, mergedCount: 0, error: 'Failed to inspect server progress.' };
  }

  const serverMap = new Map<string, { status: ValidTopicStatus; updated_at: string }>();
  for (const rec of serverRecords ?? []) {
    if (isValidTopicStatus(rec.status)) {
      serverMap.set(rec.node_id, { status: rec.status, updated_at: rec.updated_at });
    }
  }

  // 3. Evaluate each item against merge rule
  const upsertRows: Array<{
    user_id: string;
    node_id: string;
    status: ValidTopicStatus;
    updated_at: string;
  }> = [];

  let mergedCount = 0;

  for (const item of validItems) {
    const serverRec = serverMap.get(item.nodeId);

    if (!serverRec) {
      // No server record: local wins
      upsertRows.push({
        user_id: userId,
        node_id: item.nodeId,
        status: item.status,
        updated_at: item.updatedAt || new Date().toISOString(),
      });
      mergedCount++;
    } else {
      // Server record exists: compare timestamps
      const localTime = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      const serverTime = new Date(serverRec.updated_at).getTime();

      if (localTime > serverTime) {
        // Local is strictly newer: replace server
        upsertRows.push({
          user_id: userId,
          node_id: item.nodeId,
          status: item.status,
          updated_at: item.updatedAt || new Date().toISOString(),
        });
        mergedCount++;
      }
      // Else: server wins, leave as is
    }
  }

  // 4. Batch upsert modified records
  if (upsertRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from('career_user_roadmap_progress')
      .upsert(upsertRows, { onConflict: 'user_id,node_id' });

    if (upsertErr) {
      console.error('[mergeLocalRoadmapProgress] Upsert error:', upsertErr);
      return { success: false, progress: {}, mergedCount: 0, error: 'Failed to merge progress records.' };
    }
  }

  // 5. Return fresh authoritative server state for the user
  const finalProgress = await getUserRoadmapProgress(userId);

  return {
    success: true,
    progress: finalProgress,
    mergedCount,
  };
}

/**
 * Fetch roadmap cards with calculated user progress for the directory page.
 * For logged-out users (userId === null), user_progress is null.
 */
export async function getRoadmapsWithUserProgress(
  userId: string | null,
  filters?: { search?: string; category?: string; difficulty?: string; type?: string }
): Promise<Array<RoadmapCard & { user_progress?: RoadmapProgressStats | null }>> {
  const cards = await getPublicRoadmapCards(filters);

  if (!userId || cards.length === 0) {
    return cards.map((c) => ({ ...c, user_progress: null }));
  }

  const supabase = await createClient();

  // Fetch all active nodes for all returned roadmaps
  const roadmapIds = cards.map((c) => c.id).filter(isCatalogId);
  const nodes = await readCatalogRowsByIds(roadmapIds, (batch, from, to) => supabase
    .from('career_roadmap_nodes')
    .select(`
      id,
      career_roadmap_sections!inner(
        roadmap_id,
        is_active
      )
    `)
    .eq('is_active', true)
    .eq('career_roadmap_sections.is_active', true)
    .in('career_roadmap_sections.roadmap_id', batch).order('id').range(from,to));

  const nodesByRoadmap: Record<string, string[]> = {};
  for (const n of nodes ?? []) {
    const rmId = (n as any).career_roadmap_sections?.roadmap_id;
    if (rmId) {
      if (!nodesByRoadmap[rmId]) nodesByRoadmap[rmId] = [];
      nodesByRoadmap[rmId].push(n.id);
    }
  }

  // Fetch all user progress records
  const userProgressMap = await getUserRoadmapProgress(userId);

  return cards.map((card) => {
    let eligibleNodeIds = nodesByRoadmap[card.id] ?? [];
    if (eligibleNodeIds.length === 0) {
      const catDef = getCatalogRoadmapBySlug(card.slug);
      if (catDef) {
        eligibleNodeIds = catDef.sections.flatMap((s) =>
          s.nodes.map((n) => `node-${catDef.slug}-${n.slug}`)
        );
      }
    }

    const stats = calculateRoadmapProgress(userProgressMap, eligibleNodeIds);
    return {
      ...card,
      user_progress: stats,
    };
  });
}
