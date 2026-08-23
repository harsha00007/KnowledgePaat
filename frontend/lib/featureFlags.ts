export type FeatureKey =
  | 'student_portal'              // Master switch
  | 'student_dashboard'
  | 'student_profile'
  | 'student_resume'
  | 'student_jobs'
  | 'student_career_progress'
  | 'student_career_intelligence'
  | 'student_interview_prep'
  | 'student_mock_interviews'
  | 'student_notes'
  | 'student_store'
  | 'student_purchases'
  | 'student_subscription'
  | 'student_login'
  | 'student_registration'
  | 'blur_homepage_pricing';

export type FeatureCategory = 'core' | 'tools' | 'prep' | 'store' | 'auth';

export interface FeatureFlagMeta {
  key: FeatureKey;
  label: string;
  category: FeatureCategory;
  description: string;
  routePrefix: string;
  defaultEnabled: boolean;
}

export const FEATURE_METADATA: FeatureFlagMeta[] = [
  // Core Modules
  {
    key: 'student_portal',
    label: 'Student Portal (Master Switch)',
    category: 'core',
    description: 'Master toggle: Controls access to the entire Student Portal and all its sub-modules.',
    routePrefix: '/student',
    defaultEnabled: true,
  },
  {
    key: 'student_dashboard',
    label: 'Student Dashboard',
    category: 'core',
    description: 'Overview dashboard with performance metrics, quick actions, and recent activity.',
    routePrefix: '/student/dashboard',
    defaultEnabled: true,
  },
  {
    key: 'student_profile',
    label: 'My Profile',
    category: 'core',
    description: 'Student personal information, education, career preferences, and social links.',
    routePrefix: '/student/profile',
    defaultEnabled: true,
  },
  {
    key: 'student_resume',
    label: 'Resume Builder & Studio',
    category: 'core',
    description: 'ATS resume builder, live scoring analysis, and downloadable CV studio.',
    routePrefix: '/student/resume',
    defaultEnabled: true,
  },

  // Career Tools
  {
    key: 'student_jobs',
    label: 'Job Opportunities & Board',
    category: 'tools',
    description: 'Curated fresher and associate job listings with direct application tracking.',
    routePrefix: '/student/jobs',
    defaultEnabled: true,
  },
  {
    key: 'student_career_progress',
    label: 'Career Progress & Readiness',
    category: 'tools',
    description: 'Skill assessments, readiness score milestones, and preparation roadmap.',
    routePrefix: '/student/career-progress',
    defaultEnabled: true,
  },
  {
    key: 'student_career_intelligence',
    label: 'AI Career Intelligence',
    category: 'tools',
    description: 'AI-driven custom career roadmaps, skill gap analysis, and recommended action steps.',
    routePrefix: '/student/career-intelligence',
    defaultEnabled: true,
  },

  // Preparation
  {
    key: 'student_interview_prep',
    label: 'Interview Preparation & Practice',
    category: 'prep',
    description: 'Categorized practice question bank, descriptive solutions, and timed MCQ test assessments.',
    routePrefix: '/student/interview-preparation',
    defaultEnabled: true,
  },
  {
    key: 'student_mock_interviews',
    label: 'AI Mock Interviews',
    category: 'prep',
    description: 'Interactive AI voice & chat interview simulations with behavioral scoring.',
    routePrefix: '/student/mock-interview',
    defaultEnabled: true,
  },
  {
    key: 'student_notes',
    label: 'Study Notes & Guides',
    category: 'prep',
    description: 'High-yield revision cheatsheets, aptitude formula booklets, and technical interview guides.',
    routePrefix: '/student/notes',
    defaultEnabled: true,
  },

  // Store & Purchases
  {
    key: 'student_store',
    label: 'KnowledgePaat Digital Store',
    category: 'store',
    description: 'Digital storefront for curated interview packs, master bundles, and individual guides.',
    routePrefix: '/student/store',
    defaultEnabled: true,
  },
  {
    key: 'student_purchases',
    label: 'My Purchases & Owned Assets',
    category: 'store',
    description: 'Student repository for permanently owned question packs and study guide downloads.',
    routePrefix: '/student/purchases',
    defaultEnabled: true,
  },
  {
    key: 'student_subscription',
    label: 'Subscription & Membership Plans',
    category: 'store',
    description: 'Tiered plan upgrade options (Starter, Pro, Premium) and billing overview.',
    routePrefix: '/student/subscription',
    defaultEnabled: true,
  },
  {
    key: 'blur_homepage_pricing',
    label: 'Blur Homepage Pricing Amounts',
    category: 'store',
    description: 'When enabled, obscures and blurs all subscription plan amounts (₹0, ₹49, ₹99, ₹149) on the homepage. Toggle to display or hide pricing.',
    routePrefix: '/#pricing',
    defaultEnabled: true,
  },

  // Public Gateway / Auth
  {
    key: 'student_login',
    label: 'Student Login Gateway',
    category: 'auth',
    description: 'Allows students to sign in to their KnowledgePaat accounts via the public login page.',
    routePrefix: '/login',
    defaultEnabled: true,
  },
  {
    key: 'student_registration',
    label: 'Student Registration Gateway',
    category: 'auth',
    description: 'Allows new students to create accounts on KnowledgePaat via the public register page.',
    routePrefix: '/register',
    defaultEnabled: true,
  },
];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  student_portal: true,
  student_dashboard: true,
  student_profile: true,
  student_resume: true,
  student_jobs: true,
  student_career_progress: true,
  student_career_intelligence: true,
  student_interview_prep: true,
  student_mock_interviews: true,
  student_notes: true,
  student_store: true,
  student_purchases: true,
  student_subscription: true,
  student_login: true,
  student_registration: true,
  blur_homepage_pricing: true,
};

export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  core: 'Core Portal Modules',
  tools: 'Career Tools & Intelligence',
  prep: 'Interview & Prep Resources',
  store: 'Store & Subscriptions',
  auth: 'Public Access & Gateway',
};

/**
 * Check if a specific student feature is active and not blocked by the master portal toggle
 */
export function isStudentModuleEnabled(
  flags: Record<FeatureKey, boolean> | null | undefined,
  moduleKey: FeatureKey
): boolean {
  if (!flags) return DEFAULT_FEATURE_FLAGS[moduleKey] ?? true;

  // Master switch check
  if (moduleKey !== 'student_login' && moduleKey !== 'student_registration' && moduleKey !== 'blur_homepage_pricing') {
    if (flags.student_portal === false) {
      return false;
    }
  }

  return flags[moduleKey] ?? DEFAULT_FEATURE_FLAGS[moduleKey] ?? true;
}


/**
 * Match a URL path to its corresponding FeatureKey
 */
export function getFeatureKeyForPath(pathname: string): FeatureKey | null {
  if (pathname === '/login') return 'student_login';
  if (pathname === '/register') return 'student_registration';
  if (pathname === '/student/dashboard') return 'student_dashboard';
  if (pathname.startsWith('/student/profile')) return 'student_profile';
  if (pathname.startsWith('/student/resume')) return 'student_resume';
  if (pathname.startsWith('/student/jobs')) return 'student_jobs';
  if (pathname.startsWith('/student/career-progress')) return 'student_career_progress';
  if (pathname.startsWith('/student/career-intelligence')) return 'student_career_intelligence';
  if (pathname.startsWith('/student/interview-preparation')) return 'student_interview_prep';
  if (pathname.startsWith('/student/mock-interview') || pathname.startsWith('/student/mock-interviews')) return 'student_mock_interviews';
  if (pathname.startsWith('/student/notes')) return 'student_notes';
  if (pathname.startsWith('/student/store') || pathname.startsWith('/student/cart') || pathname.startsWith('/student/checkout')) return 'student_store';
  if (pathname.startsWith('/student/purchases')) return 'student_purchases';
  if (pathname.startsWith('/student/subscription')) return 'student_subscription';
  if (pathname.startsWith('/student')) return 'student_portal';
  return null;
}

/**
 * Fetch feature flags from the server API with safe fallback
 */
export async function fetchFeatureFlags(): Promise<{
  flags: Record<FeatureKey, boolean>;
  updatedAt?: string | null;
  updatedBy?: string | null;
}> {
  try {
    const res = await fetch('/api/feature-flags', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return {
        flags: { ...DEFAULT_FEATURE_FLAGS, ...data.flags },
        updatedAt: data.updated_at || null,
        updatedBy: data.updated_by || null,
      };
    }
  } catch (err) {
    console.warn('Could not fetch feature flags, using defaults:', err);
  }
  return { flags: DEFAULT_FEATURE_FLAGS };
}

/**
 * Save updated feature flags to the server (Admin only)
 */
export async function saveFeatureFlags(
  flags: Record<FeatureKey, boolean>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to save feature flags.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error saving feature flags.' };
  }
}



