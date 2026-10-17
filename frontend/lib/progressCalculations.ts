/**
 * KnowledgePaat — Career Roadmap Engine
 * Phase 3 — Pure Progress Calculations
 *
 * Safe for use in both Client Components and Server Components.
 * Does NOT import any server dependencies or next/headers.
 */

import type {
  TopicProgressStatus,
  ValidTopicStatus,
  RoadmapProgressStats,
} from '@/types/roadmap';

export const VALID_TOPIC_STATUSES = new Set<ValidTopicStatus>(['learning', 'done', 'skip']);

export function isValidTopicStatus(status: unknown): status is ValidTopicStatus {
  return typeof status === 'string' && VALID_TOPIC_STATUSES.has(status as ValidTopicStatus);
}

/**
 * Calculates deterministic roadmap progress statistics.
 *
 * FORMULA:
 *   progressPercent = ((done + skip) / totalEligibleTopics) * 100
 *
 * NOTE: 'learning' is tracked actively for student context but does NOT
 * count towards completed progress until marked 'done' or 'skip'.
 */
export function calculateRoadmapProgress(
  nodeStatuses: Record<string, TopicProgressStatus | undefined>,
  eligibleNodeIds: string[]
): RoadmapProgressStats {
  const totalTopics = eligibleNodeIds.length;

  if (totalTopics === 0) {
    return {
      totalTopics: 0,
      completedCount: 0,
      progressPercent: 0,
      learningCount: 0,
      doneCount: 0,
      skipCount: 0,
    };
  }

  let doneCount = 0;
  let skipCount = 0;
  let learningCount = 0;

  for (const id of eligibleNodeIds) {
    const status = nodeStatuses[id];
    if (status === 'done') {
      doneCount++;
    } else if (status === 'skip') {
      skipCount++;
    } else if (status === 'learning') {
      learningCount++;
    }
  }

  const completedCount = doneCount + skipCount;
  const progressPercent = Math.min(100, Math.round((completedCount / totalTopics) * 100));

  return {
    totalTopics,
    completedCount,
    progressPercent,
    learningCount,
    doneCount,
    skipCount,
  };
}
