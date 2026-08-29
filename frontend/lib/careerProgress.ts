import { SupabaseClient } from '@supabase/supabase-js';
import { evaluateStudentAchievements, Achievement, StudentStatsForAchievements } from '@/config/achievements';
import { TopicPerformance } from '@/lib/adaptiveInterview';

export type CareerStageId = 
  | 'getting_started'
  | 'building_foundation'
  | 'developing'
  | 'job_ready'
  | 'highly_prepared';

export interface CareerStageInfo {
  id: CareerStageId;
  title: string;
  description: string;
  recommendedFocus: string;
  nextStage: string;
  pointsNeeded: number;
  badgeColor: string;
}

export interface ScoreBreakdown {
  profileScore: number;       // Max 15
  resumeScore: number;        // Max 15
  interviewScore: number;     // Max 25
  practiceScore: number;      // Max 15
  skillScore: number;         // Max 15
  engagementScore: number;    // Max 10
  totalScore: number;         // Max 100
}

export interface SkillPerformanceItem {
  skill: string;
  score: number;
  trend: 'improving' | 'stable' | 'needs_attention';
  trendDelta?: number;
  status: string;
}

export interface InterviewPerformanceStats {
  totalCompleted: number;
  averageScore: number;
  bestScore: number;
  latestScore: number;
  improvementDelta: number;
  hrAverage: number | null;
  technicalAverage: number | null;
  managerialAverage: number | null;
  strongestArea: string;
  needsImprovementArea: string;
}

export interface ImprovementPriority {
  id: string;
  title: string;
  currentLevel: string;
  recommendedAction: string;
  estimatedImpactPoints: number;
  actionUrl: string;
  buttonText: string;
}

export interface ProgressTimelinePoint {
  date: string;
  score: number;
  interviewScore?: number;
  label?: string;
}

export interface MonthlyActivitySummary {
  mockInterviewsCount: number;
  tasksCompletedCount: number;
  questionsCompletedCount: number;
  notesAccessedCount: number;
}

export interface CareerProgressData {
  readinessScore: number;
  monthlyDelta: number;
  stage: CareerStageInfo;
  breakdown: ScoreBreakdown;
  skills: SkillPerformanceItem[];
  interviewPerformance: InterviewPerformanceStats;
  timeline: ProgressTimelinePoint[];
  priorities: ImprovementPriority[];
  nextBestAction: {
    title: string;
    why: string;
    expectedImpact: string;
    buttonText: string;
    actionUrl: string;
  };
  monthlyActivity: MonthlyActivitySummary;
  achievements: Achievement[];
  hasInterviewData: boolean;
}

/**
 * 1. Calculate Career Stage from 0-100 Score
 */
export function getCareerStage(score: number): CareerStageInfo {
  if (score >= 85) {
    return {
      id: 'highly_prepared',
      title: 'Highly Prepared',
      description: 'You are performing exceptionally well across technical, behavioral, and communication benchmarks. You are ready for top-tier hiring rounds.',
      recommendedFocus: 'Target senior problem solving, salary negotiations, and company-specific architectures.',
      nextStage: 'Maximum Career Readiness Achieved',
      pointsNeeded: 0,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    };
  }
  if (score >= 70) {
    return {
      id: 'job_ready',
      title: 'Job Ready',
      description: 'You have demonstrated solid competence and structured reasoning. You meet the requirements for fresher and associate engineering roles.',
      recommendedFocus: 'Refine system design nuances and complete high-difficulty technical mock interviews.',
      nextStage: 'Highly Prepared (85 pts)',
      pointsNeeded: Math.max(1, 85 - score),
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-300'
    };
  }
  if (score >= 50) {
    return {
      id: 'developing',
      title: 'Developing',
      description: 'You have built a solid foundation. Focus on interview consistency and technical preparation to move closer to Job Ready.',
      recommendedFocus: 'Practice STAR behavioral framework and strengthen weak curriculum areas in mock interviews.',
      nextStage: 'Job Ready (70 pts)',
      pointsNeeded: Math.max(1, 70 - score),
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-300'
    };
  }
  if (score >= 30) {
    return {
      id: 'building_foundation',
      title: 'Building Foundation',
      description: 'You are establishing core technical and profile benchmarks. Regular practice will accelerate your readiness quickly.',
      recommendedFocus: 'Complete revision notes and attend your first full AI mock interview.',
      nextStage: 'Developing (50 pts)',
      pointsNeeded: Math.max(1, 50 - score),
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-300'
    };
  }
  return {
    id: 'getting_started',
    title: 'Getting Started',
    description: 'Welcome to your career preparation journey! Complete your profile and take your initial mock interview to unlock tailored growth recommendations.',
    recommendedFocus: 'Complete your profile details, upload your resume, and try a practice interview track.',
    nextStage: 'Building Foundation (30 pts)',
    pointsNeeded: Math.max(1, 30 - score),
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300'
  };
}

/**
 * 2. Calculate Strict Score Breakdown (100 Points Model)
 */
export function calculateScoreBreakdown(
  profile: any,
  interviewSessions: any[],
  completedTasksCount: number = 0
): ScoreBreakdown {
  // A. Profile Completion (15 pts)
  let pScore = 0;
  if (profile?.full_name) pScore += 3;
  if (profile?.email) pScore += 3;
  if (profile?.phone) pScore += 3;
  if (profile?.preferred_role || profile?.target_role) pScore += 3;
  if (profile?.skills && profile.skills.length > 0) pScore += 3;
  const profileScore = Math.min(15, pScore);

  // B. Resume Quality (15 pts)
  let rScore = 0;
  if (profile?.resume_url) rScore += 10;
  if (profile?.resume_filename) rScore += 5;
  const resumeScore = Math.min(15, rScore);

  // C. Interview Performance (25 pts)
  const completedSessions = (interviewSessions || []).filter(s => s.status === 'completed');
  let interviewScore = 0;
  if (completedSessions.length > 0) {
    const avgScore = completedSessions.reduce((sum, s) => sum + (Number(s.overall_score) || 0), 0) / completedSessions.length;
    // Scale 0-100% into 0-25 points
    interviewScore = Math.round((avgScore / 100) * 25);
  } else {
    // If no interviews completed yet, baseline is 0
    interviewScore = 0;
  }

  // D. Interview Practice (15 pts)
  // Up to 3 interviews -> 9 pts, completed roadmap tasks -> up to 6 pts
  const interviewPracticePts = Math.min(9, completedSessions.length * 3);
  const taskPracticePts = Math.min(6, completedTasksCount * 1);
  const practiceScore = Math.min(15, interviewPracticePts + taskPracticePts);

  // E. Skill Development (15 pts)
  const skillsCount = profile?.skills?.length || 0;
  let skillScore = Math.min(10, skillsCount * 2);
  if (completedSessions.length > 0) skillScore += 5; // Verified in live practice
  skillScore = Math.min(15, skillScore);

  // F. Platform Engagement (10 pts)
  let engScore = 3; // Basic login/access
  if (completedSessions.length >= 1) engScore += 3;
  if (completedTasksCount >= 2) engScore += 4;
  const engagementScore = Math.min(10, engScore);

  const totalScore = Math.min(100, Math.round(profileScore + resumeScore + interviewScore + practiceScore + skillScore + engagementScore));

  return {
    profileScore,
    resumeScore,
    interviewScore,
    practiceScore,
    skillScore,
    engagementScore,
    totalScore
  };
}

/**
 * 3. Fetch Full Career Progress Aggregation Data
 */
export async function getCareerProgressData(
  supabase: SupabaseClient,
  studentId: string
): Promise<CareerProgressData> {
  // Parallel fetch: Profile, Mock Sessions, Completed Tasks, Active Plan, Snapshots
  const [
    { data: profile },
    { data: interviewSessions },
    { data: completedTasks },
    { data: activePlan },
    { data: snapshots }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', studentId).single(),
    supabase.from('mock_interview_sessions').select('*').eq('student_id', studentId).order('started_at', { ascending: true }),
    supabase.from('career_plan_tasks').select('*').eq('student_id', studentId).eq('status', 'completed'),
    supabase.from('career_improvement_plans').select('*').eq('student_id', studentId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('career_progress_snapshots').select('*').eq('student_id', studentId).order('snapshot_date', { ascending: true })
  ]);

  const sessions = interviewSessions || [];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const hasInterviewData = completedSessions.length > 0;
  const tasksCount = (completedTasks || []).length;

  // 6. Calculate Score Breakdown & Career Stage
  const breakdown = calculateScoreBreakdown(profile, sessions, tasksCount);
  const readinessScore = breakdown.totalScore;
  const stage = getCareerStage(readinessScore);

  // 7. Calculate Interview Performance Metrics
  let avgScore = 0;
  let bestScore = 0;
  let latestScore = 0;
  let delta = 0;
  let hrAvg: number | null = null;
  let techAvg: number | null = null;
  let mgrAvg: number | null = null;

  if (completedSessions.length > 0) {
    const scores = completedSessions.map(s => Number(s.overall_score) || 0);
    avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    bestScore = Math.max(...scores);
    latestScore = scores[scores.length - 1];

    if (scores.length >= 2) {
      delta = latestScore - scores[0];
    }

    const hrSessions = completedSessions.filter(s => s.interview_type === 'hr');
    const techSessions = completedSessions.filter(s => s.interview_type === 'technical');
    const mgrSessions = completedSessions.filter(s => s.interview_type === 'managerial');

    if (hrSessions.length > 0) {
      hrAvg = Math.round(hrSessions.reduce((sum, s) => sum + (Number(s.overall_score) || 0), 0) / hrSessions.length);
    }
    if (techSessions.length > 0) {
      techAvg = Math.round(techSessions.reduce((sum, s) => sum + (Number(s.overall_score) || 0), 0) / techSessions.length);
    }
    if (mgrSessions.length > 0) {
      mgrAvg = Math.round(mgrSessions.reduce((sum, s) => sum + (Number(s.overall_score) || 0), 0) / mgrSessions.length);
    }
  }

  // 8. Calculate Skill Performance Items
  const skillsList: SkillPerformanceItem[] = [
    {
      skill: 'Technical & System Design',
      score: techAvg || (profile?.skills?.length ? Math.min(75, profile.skills.length * 15) : 40),
      trend: techAvg && techAvg >= 70 ? 'improving' : 'needs_attention',
      trendDelta: delta !== 0 ? delta : undefined,
      status: techAvg && techAvg >= 75 ? 'Strong' : 'Developing'
    },
    {
      skill: 'Communication Clarity',
      score: hrAvg || (hasInterviewData ? Math.round(avgScore * 0.95) : 55),
      trend: 'improving',
      status: (hrAvg || 65) >= 75 ? 'Strong' : 'Developing'
    },
    {
      skill: 'Problem Solving & Logic',
      score: Math.min(95, Math.max(35, Math.round((techAvg || 60) * 0.9 + (avgScore ? 10 : 0)))),
      trend: avgScore >= 70 ? 'improving' : 'stable',
      status: avgScore >= 75 ? 'Strong' : 'Developing'
    },
    {
      skill: 'Interview Composure & Confidence',
      score: Math.min(95, Math.max(40, avgScore ? Math.round(avgScore * 0.92) : 50)),
      trend: completedSessions.length >= 2 ? 'improving' : 'stable',
      status: completedSessions.length >= 2 ? 'Verified' : 'Needs Assessment'
    }
  ];

  // 9. Timeline Points Construction
  let timelinePoints: ProgressTimelinePoint[] = [];
  if (snapshots && snapshots.length > 0) {
    timelinePoints = snapshots.map(s => ({
      date: new Date(s.snapshot_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Number(s.career_readiness_score) || 0,
      interviewScore: Number(s.interview_score) || 0
    }));
  } else {
    // Current point as baseline
    timelinePoints = [
      {
        date: 'Today',
        score: readinessScore,
        interviewScore: breakdown.interviewScore
      }
    ];
  }

  // 10. Top 3 AI Improvement Priorities
  const priorities: ImprovementPriority[] = [];
  if (activePlan?.ai_insight?.nextBestAction) {
    priorities.push({
      id: 'priority-1',
      title: activePlan.ai_insight.nextBestAction.title,
      currentLevel: 'Highest Priority',
      recommendedAction: activePlan.ai_insight.nextBestAction.reason,
      estimatedImpactPoints: 8,
      actionUrl: activePlan.ai_insight.nextBestAction.actionUrl || '/student/mock-interview',
      buttonText: activePlan.ai_insight.nextBestAction.buttonText || 'Start Practice'
    });
  } else if (!hasInterviewData) {
    priorities.push({
      id: 'priority-1',
      title: 'Complete Your First AI Mock Interview',
      currentLevel: 'Pending Assessment',
      recommendedAction: 'Take a technical mock interview to evaluate your response structure and unlock live insights.',
      estimatedImpactPoints: 12,
      actionUrl: '/student/mock-interview',
      buttonText: 'Start Mock Interview'
    });
  } else {
    priorities.push({
      id: 'priority-1',
      title: 'Advance Technical Problem Solving',
      currentLevel: 'Developing',
      recommendedAction: 'Practice high-difficulty scenario questions to raise technical accuracy scores.',
      estimatedImpactPoints: 7,
      actionUrl: '/student/interview-preparation',
      buttonText: 'Practice Questions'
    });
  }

  if (!profile?.resume_url) {
    priorities.push({
      id: 'priority-2',
      title: 'Upload & Optimize Your Resume',
      currentLevel: 'Missing',
      recommendedAction: 'Upload your verified resume to enable 1-click job applications and unlock full resume score points.',
      estimatedImpactPoints: 10,
      actionUrl: '/student/resume',
      buttonText: 'Upload Resume'
    });
  } else {
    priorities.push({
      id: 'priority-2',
      title: 'STAR Behavioral Framework Mastery',
      currentLevel: 'Intermediate',
      recommendedAction: 'Refine structured storytelling around challenge resolution and ownership.',
      estimatedImpactPoints: 5,
      actionUrl: '/student/interview-preparation',
      buttonText: 'Review Framework'
    });
  }

  priorities.push({
    id: 'priority-3',
    title: 'Daily Curriculum Roadmap Consistency',
    currentLevel: `${tasksCount} Tasks Done`,
    recommendedAction: 'Complete remaining daily improvement tasks in your personalized career plan.',
    estimatedImpactPoints: 4,
    actionUrl: '/student/career-intelligence',
    buttonText: 'View Daily Tasks'
  });

  // 11. Next Best Action Card Details
  let nextBestAction = {
    title: 'Start an Adaptive AI Mock Interview',
    why: 'Live interview performance represents 25% of your Career Readiness Score.',
    expectedImpact: 'Gain up to 10 Career Readiness points',
    buttonText: 'Start Mock Interview',
    actionUrl: '/student/mock-interview'
  };

  if (!profile?.full_name || !profile?.preferred_role) {
    nextBestAction = {
      title: 'Complete Your Career Profile',
      why: 'Adding your target role and technical skills provides the foundation for accurate evaluations.',
      expectedImpact: 'Gain 6 Career Readiness points immediately',
      buttonText: 'Update Profile',
      actionUrl: '/student/profile'
    };
  } else if (!profile?.resume_url) {
    nextBestAction = {
      title: 'Upload Your Resume',
      why: 'Having a verified resume unlocks direct applications and adds 10 points to your readiness score.',
      expectedImpact: 'Gain 10 Career Readiness points',
      buttonText: 'Upload Resume',
      actionUrl: '/student/resume'
    };
  } else if (hasInterviewData && techAvg && techAvg < 70) {
    nextBestAction = {
      title: 'Strengthen Technical Fundamentals',
      why: 'Your technical score is currently lower than behavioral communication.',
      expectedImpact: 'Gain up to 8 Career Readiness points',
      buttonText: 'Review Technical Notes',
      actionUrl: '/student/notes'
    };
  }

  // 12. Evaluate Achievements
  const statsForAchievements: StudentStatsForAchievements = {
    completedInterviewsCount: completedSessions.length,
    highestInterviewScore: bestScore,
    averageInterviewScore: avgScore,
    careerReadinessScore: readinessScore,
    hasResume: Boolean(profile?.resume_url),
    isProfileComplete: Boolean(profile?.full_name && profile?.email && profile?.phone && profile?.skills?.length),
    completedTasksCount: tasksCount
  };

  const achievements = evaluateStudentAchievements(statsForAchievements);

  // 13. Monthly Improvement Delta Calculation
  let monthlyDelta = 0;
  if (snapshots && snapshots.length >= 2) {
    const firstScore = Number(snapshots[0].career_readiness_score) || 0;
    const latestSnapshotScore = Number(snapshots[snapshots.length - 1].career_readiness_score) || readinessScore;
    monthlyDelta = latestSnapshotScore - firstScore;
  } else if (completedSessions.length > 0) {
    monthlyDelta = Math.min(15, completedSessions.length * 4);
  }

  return {
    readinessScore,
    monthlyDelta,
    stage,
    breakdown,
    skills: skillsList,
    interviewPerformance: {
      totalCompleted: completedSessions.length,
      averageScore: avgScore,
      bestScore,
      latestScore,
      improvementDelta: delta,
      hrAverage: hrAvg,
      technicalAverage: techAvg,
      managerialAverage: mgrAvg,
      strongestArea: (hrAvg && techAvg && hrAvg > techAvg) ? 'HR & Behavioral Articulation' : 'Technical & API Concepts',
      needsImprovementArea: (techAvg && hrAvg && techAvg < hrAvg) ? 'Technical Edge Cases & Architecture' : 'Scenario-based Problem Solving'
    },
    timeline: timelinePoints,
    priorities: priorities.slice(0, 3),
    nextBestAction,
    monthlyActivity: {
      mockInterviewsCount: completedSessions.length,
      tasksCompletedCount: tasksCount,
      questionsCompletedCount: completedSessions.length * 8 + tasksCount * 2,
      notesAccessedCount: Math.min(15, tasksCount * 2 + (completedSessions.length > 0 ? 4 : 0))
    },
    achievements,
    hasInterviewData
  };
}
