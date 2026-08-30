import { SupabaseClient } from '@supabase/supabase-js';
import { 
  PlanId, 
  SubscriptionStatus, 
  PLAN_LEVELS, 
  PLANS, 
  normalizePlanId, 
  satisfiesPlanRequirement 
} from '@/config/plans';

export interface UserAccess {
  userId?: string;
  plan: PlanId;
  effectivePlan: PlanId;
  status: SubscriptionStatus;
  startDate: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  isSubscriptionActive: boolean;
  planLevel: number;
  mockInterviewsPerMonth: number;
  hasAccess: (requiredPlan: string | null | undefined) => boolean;
  // Backward-compatible flags
  hasPremiumAccess: boolean;
}

/**
 * Pure function to calculate full user access entitlement based on raw subscription record.
 * Handles automatic expiration validation:
 * If plan is a paid tier but expires_at < now, effective plan automatically downgrades to 'free'.
 */
export function calculateUserAccess(subscription: any | null): UserAccess {
  if (!subscription) {
    const freePlan = PLANS.free;
    return {
      plan: 'free',
      effectivePlan: 'free',
      status: 'active',
      startDate: null,
      expiresAt: null,
      isExpired: false,
      isSubscriptionActive: true,
      planLevel: freePlan.level,
      mockInterviewsPerMonth: freePlan.mockInterviewsPerMonth,
      hasAccess: (req) => satisfiesPlanRequirement('free', req),
      hasPremiumAccess: false,
    };
  }

  const rawPlan: string = subscription.plan || subscription.plan_id || 'free';
  const rawStatus: string = (subscription.status || 'active').toLowerCase();
  const endDate: string | null = subscription.end_date || subscription.expires_at || subscription.current_period_end || null;
  const startDate: string | null = subscription.start_date || subscription.created_at || subscription.current_period_start || null;

  const normalizedPlan = normalizePlanId(rawPlan);

  // Check expiration
  let isExpired = false;
  if (endDate) {
    const expiryTime = new Date(endDate).getTime();
    if (!isNaN(expiryTime) && expiryTime < Date.now()) {
      isExpired = true;
    }
  }

  let effectiveStatus: SubscriptionStatus = 'active';
  if (rawStatus === 'cancelled') {
    effectiveStatus = 'cancelled';
  } else if (isExpired || rawStatus === 'expired') {
    effectiveStatus = 'expired';
  }

  // A paid plan is active if status is active (or cancelled but not yet expired)
  const isPaid = normalizedPlan !== 'free';
  const isActivePaid = isPaid && (rawStatus === 'active' || rawStatus === 'cancelled') && !isExpired;

  // Effective plan drops to 'free' once expired
  const effectivePlan: PlanId = isActivePaid ? normalizedPlan : 'free';
  const planConfig = PLANS[effectivePlan];

  return {
    userId: subscription.student_id,
    plan: normalizedPlan,
    effectivePlan,
    status: effectiveStatus,
    startDate,
    expiresAt: endDate,
    isExpired,
    isSubscriptionActive: isActivePaid || normalizedPlan === 'free',
    planLevel: planConfig.level,
    mockInterviewsPerMonth: planConfig.mockInterviewsPerMonth,
    hasAccess: (requiredPlan) => satisfiesPlanRequirement(effectivePlan, requiredPlan),
    hasPremiumAccess: effectivePlan === 'premium',
  };
}

/**
 * Fetch and calculate user access directly via Supabase client.
 */
export async function getUserAccess(supabase: SupabaseClient, userId: string): Promise<UserAccess> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error querying subscription for user access:', error);
    }

    return calculateUserAccess(data);
  } catch (err) {
    console.error('Failed to calculate user access:', err);
    return calculateUserAccess(null);
  }
}

/**
 * Helper to check if a content item is accessible given user's access profile
 */
export function isContentAccessible(requiredPlan: string | null | undefined, userAccess: UserAccess): boolean {
  return userAccess.hasAccess(requiredPlan);
}

/**
 * Determines whether a student can view the real company name for a job.
 * Uses the student's effective plan level compared against the job's minimum required plan.
 * Returns true if student's effective plan level >= job's minimum required plan level.
 */
export function canViewCompanyName(
  studentAccessOrPlan: UserAccess | PlanId | string | null | undefined,
  jobMinimumPlan: string | null | undefined
): boolean {
  if (!studentAccessOrPlan) {
    return satisfiesPlanRequirement('free', jobMinimumPlan);
  }

  const effectivePlan: PlanId = typeof studentAccessOrPlan === 'object' && 'effectivePlan' in studentAccessOrPlan
    ? studentAccessOrPlan.effectivePlan
    : normalizePlanId(studentAccessOrPlan as string);

  return satisfiesPlanRequirement(effectivePlan, jobMinimumPlan);
}

