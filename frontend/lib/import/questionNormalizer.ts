import { normalizePlanId, PlanId } from '@/config/plans';

/**
 * Normalizes difficulty value to 'Easy' | 'Medium' | 'Hard'
 */
export function normalizeDifficulty(diff?: string | null): 'Easy' | 'Medium' | 'Hard' {
  if (!diff) return 'Medium';
  const clean = diff.trim().toLowerCase();
  if (clean.includes('easy') || clean === 'beginner' || clean === '1') return 'Easy';
  if (clean.includes('hard') || clean === 'advanced' || clean === 'expert' || clean === '3') return 'Hard';
  return 'Medium';
}

/**
 * Normalizes status value to 'Active' | 'Inactive'
 */
export function normalizeStatus(status?: string | null): 'Active' | 'Inactive' {
  if (!status) return 'Active';
  const clean = status.trim().toLowerCase();
  if (clean === 'inactive' || clean === 'disabled' || clean === 'draft' || clean === 'false') {
    return 'Inactive';
  }
  return 'Active';
}

/**
 * Normalizes tags from comma/pipe/newline separated strings or arrays
 */
export function normalizeTags(input?: string | string[] | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map(t => String(t).trim()).filter(Boolean)));
  }

  // Split by commas, pipes, or semicolons
  return Array.from(
    new Set(
      String(input)
        .split(/[,|;\n]/)
        .map(t => t.trim())
        .filter(t => t.length > 0)
    )
  );
}

/**
 * Normalizes text content (trims, removes excess empty lines)
 */
export function cleanText(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalizes question title for strict / fuzzy duplicate detection
 */
export function normalizeQuestionTitle(title?: string | null): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/^(q\d*[\.:\-\)\s]+|question\s*\d*[\.:\-\)\s]+)/i, '') // Remove Q1. or Question 1:
    .replace(/[^\w\s]/g, '') // Remove punctuation for matching
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes minimum plan
 */
export function normalizeMinimumPlan(plan?: string | null): 'free' | 'starter' | 'pro' | 'premium' {
  return normalizePlanId(plan || 'free') as 'free' | 'starter' | 'pro' | 'premium';
}
