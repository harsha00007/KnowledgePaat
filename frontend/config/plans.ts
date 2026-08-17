export type PlanId = 'free' | 'starter' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  interval: string;
  level: number;
  mockInterviewsPerMonth: number;
  badgeColor: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLAN_LEVELS: Record<PlanId, number> = {
  free: 1,
  starter: 2,
  pro: 3,
  premium: 4,
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: '₹',
    interval: 'forever',
    level: 1,
    mockInterviewsPerMonth: 0,
    badgeColor: 'bg-slate-100',
    badgeTextColor: 'text-slate-700',
    badgeBorderColor: 'border-slate-200',
    description: 'Essential tools for fresh graduates starting their career search.',
    features: [
      'Browse all verified basic fresher job listings',
      'Direct links to official company career portals',
      'Standard introductory HR & Aptitude questions',
      'Basic study guides and formula cheatsheets',
      '0 Mock Interview Credits'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49,
    currency: '₹',
    interval: 'month',
    level: 2,
    mockInterviewsPerMonth: 1,
    badgeColor: 'bg-blue-50',
    badgeTextColor: 'text-blue-700',
    badgeBorderColor: 'border-blue-200',
    description: 'Affordable boost for focused preparation and entry-level tests.',
    features: [
      'All Free Plan features included',
      'Starter level verified job openings',
      'Detailed HR & Technical interview answers',
      'Core technical study notes & PDF downloads',
      '1 Mock Interview credit per month',
      'Standard email support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    currency: '₹',
    interval: 'month',
    level: 3,
    mockInterviewsPerMonth: 2,
    badgeColor: 'bg-indigo-50',
    badgeTextColor: 'text-indigo-700',
    badgeBorderColor: 'border-indigo-200',
    description: 'Comprehensive toolkit for technical rounds and placement drives.',
    popular: true,
    features: [
      'All Free & Starter features included',
      'Priority Pro fresher job postings',
      'Company-specific interview questions (TCS, Infosys, etc.)',
      'In-depth programming cheatsheets & DBMS notes',
      '2 Mock Interview credits per month',
      'Priority student support'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 149,
    currency: '₹',
    interval: 'month',
    level: 4,
    mockInterviewsPerMonth: 4,
    badgeColor: 'bg-purple-50',
    badgeTextColor: 'text-purple-700',
    badgeBorderColor: 'border-purple-200',
    description: 'Full unhindered access to all resources, expert answers, and maximum mock credits.',
    features: [
      'Unlimited access to ALL job tiers and exclusive listings',
      'Complete STAR interview model answers, pro tips & pitfalls',
      'All downloadable study notes, guides & revision packs',
      'Company-wise comprehensive question archive (Google, Amazon, etc.)',
      '4 Mock Interview credits per month',
      'Direct support & career updates'
    ]
  }
};

export const PLANS_LIST = [PLANS.free, PLANS.starter, PLANS.pro, PLANS.premium];

/**
 * Normalizes any legacy or case-variant plan string to standard PlanId
 */
export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (!plan) return 'free';
  const lower = plan.toLowerCase().trim();
  if (lower === 'starter') return 'starter';
  if (lower === 'pro') return 'pro';
  if (lower === 'premium') return 'premium';
  return 'free';
}

/**
 * Check if a user's effective plan satisfies the minimum required plan for a content item
 */
export function satisfiesPlanRequirement(userPlan: PlanId, requiredPlan: string | null | undefined): boolean {
  const req = normalizePlanId(requiredPlan);
  const userLevel = PLAN_LEVELS[userPlan] || 1;
  const reqLevel = PLAN_LEVELS[req] || 1;
  return userLevel >= reqLevel;
}
