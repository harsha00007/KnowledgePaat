export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'interview' | 'readiness' | 'profile' | 'practice';
  icon: string;
  targetValue: number;
  currentValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercent: number;
}

export interface StudentStatsForAchievements {
  completedInterviewsCount: number;
  highestInterviewScore: number;
  averageInterviewScore: number;
  careerReadinessScore: number;
  hasResume: boolean;
  isProfileComplete: boolean;
  completedTasksCount: number;
}

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first_interview',
    title: 'First Step',
    description: 'Complete your first AI mock interview session.',
    category: 'interview' as const,
    icon: 'Bot',
    targetValue: 1,
    getValue: (s: StudentStatsForAchievements) => s.completedInterviewsCount
  },
  {
    id: 'interview_explorer',
    title: 'Interview Explorer',
    description: 'Complete 5 AI mock interview sessions.',
    category: 'interview' as const,
    icon: 'Layers',
    targetValue: 5,
    getValue: (s: StudentStatsForAchievements) => s.completedInterviewsCount
  },
  {
    id: 'interview_master',
    title: 'Interview Master',
    description: 'Achieve a score of 90% or higher in any mock interview.',
    category: 'interview' as const,
    icon: 'Award',
    targetValue: 90,
    getValue: (s: StudentStatsForAchievements) => s.highestInterviewScore
  },
  {
    id: 'profile_master',
    title: 'Profile Complete',
    description: 'Complete your profile with education, phone, and technical skills.',
    category: 'profile' as const,
    icon: 'UserCheck',
    targetValue: 1,
    getValue: (s: StudentStatsForAchievements) => (s.isProfileComplete ? 1 : 0)
  },
  {
    id: 'resume_ready',
    title: 'Resume Ready',
    description: 'Upload and verify your resume for job applications.',
    category: 'profile' as const,
    icon: 'FileText',
    targetValue: 1,
    getValue: (s: StudentStatsForAchievements) => (s.hasResume ? 1 : 0)
  },
  {
    id: 'career_builder',
    title: 'Career Builder',
    description: 'Reach a Career Readiness Score of 70 points.',
    category: 'readiness' as const,
    icon: 'TrendingUp',
    targetValue: 70,
    getValue: (s: StudentStatsForAchievements) => s.careerReadinessScore
  },
  {
    id: 'job_ready',
    title: 'Job Ready Candidate',
    description: 'Reach a Career Readiness Score of 80+ points.',
    category: 'readiness' as const,
    icon: 'ShieldCheck',
    targetValue: 80,
    getValue: (s: StudentStatsForAchievements) => s.careerReadinessScore
  },
  {
    id: 'task_finisher',
    title: 'Active Learner',
    description: 'Complete 5 daily improvement roadmap tasks.',
    category: 'practice' as const,
    icon: 'CheckCircle2',
    targetValue: 5,
    getValue: (s: StudentStatsForAchievements) => s.completedTasksCount
  }
];

export function evaluateStudentAchievements(stats: StudentStatsForAchievements): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map(def => {
    const rawVal = def.getValue(stats);
    const isUnlocked = rawVal >= def.targetValue;
    const progress = Math.min(100, Math.round((rawVal / def.targetValue) * 100));

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      icon: def.icon,
      targetValue: def.targetValue,
      currentValue: rawVal,
      isUnlocked,
      progressPercent: progress
    };
  });
}
