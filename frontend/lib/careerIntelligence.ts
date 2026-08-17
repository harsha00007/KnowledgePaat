import { TopicPerformance } from '@/lib/adaptiveInterview';

export type ConfidenceLevel = 'low' | 'moderate' | 'high';

export type SkillImportance = 'critical' | 'important' | 'recommended';
export type SkillLevel = 'missing' | 'beginner' | 'developing' | 'strong';

export type TaskCategory = 
  | 'technical' 
  | 'interview' 
  | 'communication' 
  | 'resume' 
  | 'profile' 
  | 'job_preparation' 
  | 'aptitude' 
  | 'hr_preparation';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface CareerReadiness {
  overallScore: number;
  profileStrength: number;
  technicalSkills: number;
  interviewPerformance: number;
  communication: number;
  preparationConsistency: number;
  confidence: ConfidenceLevel;
  dataCompleteness: number;
  missingDataItems: string[];
}

export interface SkillGap {
  skill: string;
  importance: SkillImportance;
  studentLevel: SkillLevel;
  gapScore: number; // 0-100 (higher means bigger gap)
  recommendation: string;
  resourceUrl?: string;
}

export interface CareerTask {
  id?: string;
  dayNumber: number;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedMinutes: number;
  relatedSkill: string;
  reason: string;
  resourceUrl: string;
  resourceTitle?: string;
  status?: TaskStatus;
}

export interface NextBestAction {
  title: string;
  reason: string;
  actionUrl: string;
  buttonText: string;
  category: TaskCategory;
}

export interface CareerInsight {
  summary: string;
  topStrength: string;
  biggestOpportunity: string;
  nextBestAction: NextBestAction;
}

export interface GeneratedPlanResult {
  readiness: CareerReadiness;
  insight: CareerInsight;
  skillGaps: SkillGap[];
  tasks: CareerTask[];
  planDuration: number;
  targetRole: string;
}

/**
 * Standard industry skills expected per target role
 */
export const ROLE_SKILL_REQUIREMENTS: Record<string, {
  critical: string[];
  important: string[];
  recommended: string[];
}> = {
  'Software Engineer': {
    critical: ['Data Structures & Algorithms', 'System Architecture', 'Clean Code & OOP'],
    important: ['Database Query Optimization', 'API Integration', 'Debugging & Testing'],
    recommended: ['Git & Version Control', 'CI/CD Basics', 'Agile Principles']
  },
  'Frontend Developer': {
    critical: ['React & Component Architecture', 'JavaScript / TypeScript', 'CSS & Responsive Design'],
    important: ['State Management', 'Web Performance Optimization', 'REST API Integration'],
    recommended: ['Web Accessibility (a11y)', 'Unit Testing with Jest', 'Next.js']
  },
  'Backend Developer': {
    critical: ['REST API Design', 'Database Modeling & SQL', 'Authentication & Security'],
    important: ['Caching & Concurrency', 'Microservices Basics', 'Error Handling & Logging'],
    recommended: ['Docker / Containerization', 'Message Queues', 'ORM Frameworks']
  },
  'Full Stack Developer': {
    critical: ['Frontend UI Development', 'Backend API Architecture', 'Database Management'],
    important: ['Authentication Workflows', 'Server-Side Rendering', 'State Synchronization'],
    recommended: ['Deployment & Cloud Basics', 'DevOps Fundamentals', 'GraphQL']
  },
  'Python Developer': {
    critical: ['Python Core & OOP', 'Django / FastAPI Frameworks', 'Data Structures in Python'],
    important: ['Database ORM & SQL Queries', 'AsyncIO & Concurrency', 'API Development'],
    recommended: ['Unit Testing with PyTest', 'Generators & Decorators', 'Data Wrangling with Pandas']
  },
  'Data Analyst': {
    critical: ['SQL Queries & Aggregations', 'Data Cleaning & Transformation', 'Excel & Spreadsheets'],
    important: ['Python for Data Analysis', 'Tableau / PowerBI Dashboards', 'Statistical Modeling'],
    recommended: ['ETL Pipeline Basics', 'Business Problem Framing', 'Data Storytelling']
  },
  'QA / Automation Engineer': {
    critical: ['Test Automation Frameworks', 'API Testing & Postman', 'Defect Tracking & Lifecycle'],
    important: ['Selenium / Playwright', 'CI/CD Pipeline Integration', 'Boundary & Edge Case Analysis'],
    recommended: ['Performance & Load Testing', 'SQL for Data Verification', 'Security Testing Basics']
  },
  'General': {
    critical: ['Core Problem Solving', 'Communication & Articulation', 'Technical Fundamentals'],
    important: ['System Architecture', 'Debugging & Reasoning', 'Project Ownership'],
    recommended: ['Version Control with Git', 'Collaboration & Agility', 'Testing Principles']
  }
};

/**
 * 1. Calculate Grounded Career Readiness Score & Missing Data
 */
export function calculateCareerReadiness(
  profile: any,
  studentSkills: string[],
  interviewSessions: any[],
  studyActivityCount: number = 0
): CareerReadiness {
  const missingItems: string[] = [];

  // A. Profile Strength (20%)
  let profileScore = 0;
  if (profile?.full_name) profileScore += 20;
  if (profile?.email) profileScore += 10;
  if (profile?.phone) profileScore += 10;
  if (profile?.preferred_role || profile?.target_role) profileScore += 25;
  else missingItems.push('Add your target job role in your profile');

  if (studentSkills && studentSkills.length > 0) {
    profileScore += Math.min(35, studentSkills.length * 7);
  } else {
    missingItems.push('Add your technical skills in your profile');
  }

  // B. Mock Interview Performance (25%) & Communication (15%)
  let interviewScore = 0;
  let communicationScore = 0;
  let technicalScore = 0;

  const completedInterviews = (interviewSessions || []).filter(s => s.status === 'completed');

  if (completedInterviews.length > 0) {
    const avgOverall = completedInterviews.reduce((sum, s) => sum + (Number(s.overall_score) || 0), 0) / completedInterviews.length;
    const avgComm = completedInterviews.reduce((sum, s) => sum + (Number(s.communication_score) || avgOverall), 0) / completedInterviews.length;
    const avgTech = completedInterviews.reduce((sum, s) => sum + (Number(s.technical_score) || avgOverall), 0) / completedInterviews.length;

    interviewScore = Math.round(avgOverall);
    communicationScore = Math.round(avgComm);
    technicalScore = Math.round(avgTech);
  } else {
    missingItems.push('Complete at least one AI Mock Interview to measure live performance');
    // Grounded baseline based on self-reported skills
    technicalScore = studentSkills.length > 0 ? Math.min(70, studentSkills.length * 15) : 35;
    interviewScore = 40;
    communicationScore = 45;
  }

  // C. Preparation Consistency (15%)
  let consistencyScore = 40;
  if (completedInterviews.length >= 3) consistencyScore += 30;
  else if (completedInterviews.length >= 1) consistencyScore += 15;

  if (studyActivityCount >= 5) consistencyScore += 30;
  else if (studyActivityCount >= 1) consistencyScore += 15;
  consistencyScore = Math.min(100, consistencyScore);

  // Calculate Data Completeness
  let completeness = 0;
  if (profile?.full_name && profile?.email) completeness += 25;
  if (profile?.preferred_role || profile?.target_role) completeness += 25;
  if (studentSkills && studentSkills.length >= 3) completeness += 25;
  if (completedInterviews.length >= 1) completeness += 25;

  // Calculate Weighted Overall Score
  const overall = Math.round(
    (profileScore * 0.20) +
    (technicalScore * 0.25) +
    (interviewScore * 0.25) +
    (communicationScore * 0.15) +
    (consistencyScore * 0.15)
  );

  const confidence: ConfidenceLevel = 
    completeness >= 80 ? 'high' : 
    completeness >= 50 ? 'moderate' : 'low';

  return {
    overallScore: Math.min(100, Math.max(10, overall)),
    profileStrength: Math.min(100, profileScore),
    technicalSkills: Math.min(100, technicalScore),
    interviewPerformance: Math.min(100, interviewScore),
    communication: Math.min(100, communicationScore),
    preparationConsistency: Math.min(100, consistencyScore),
    confidence,
    dataCompleteness: completeness,
    missingDataItems: missingItems
  };
}

/**
 * 2. Perform Target Role Skill Gap Analysis
 */
export function analyzeSkillGaps(
  targetRole: string,
  studentSkills: string[],
  topicPerformanceList: TopicPerformance[] = []
): SkillGap[] {
  const roleReqs = ROLE_SKILL_REQUIREMENTS[targetRole] || ROLE_SKILL_REQUIREMENTS['General'];
  const userSkillsLower = new Set((studentSkills || []).map(s => s.toLowerCase().trim()));
  const testedTopics = new Map<string, TopicPerformance>();

  topicPerformanceList.forEach(tp => {
    testedTopics.set(tp.topic.toLowerCase(), tp);
  });

  const gaps: SkillGap[] = [];

  const evaluateSkill = (skill: string, importance: SkillImportance) => {
    const sLower = skill.toLowerCase();
    const isDeclared = userSkillsLower.has(sLower) || Array.from(userSkillsLower).some(us => us.includes(sLower) || sLower.includes(us));
    
    // Check if tested in mock interviews
    let matchingTopic: TopicPerformance | undefined;
    for (const [tName, tp] of testedTopics.entries()) {
      if (tName.includes(sLower) || sLower.includes(tName)) {
        matchingTopic = tp;
        break;
      }
    }

    let studentLevel: SkillLevel = 'missing';
    let gapScore = 75;
    let recommendation = `Learn core concepts in ${skill} and practice technical questions.`;

    if (matchingTopic) {
      if (matchingTopic.strength === 'expert') {
        studentLevel = 'strong';
        gapScore = 15;
        recommendation = `Strong proficiency verified in mock interview (${matchingTopic.averageScore}%). Ready for senior-level questions.`;
      } else if (matchingTopic.strength === 'strong') {
        studentLevel = 'strong';
        gapScore = 30;
        recommendation = `Solid foundation verified (${matchingTopic.averageScore}%). Practice advanced edge cases.`;
      } else if (matchingTopic.strength === 'developing') {
        studentLevel = 'developing';
        gapScore = 55;
        recommendation = `Developing proficiency (${matchingTopic.averageScore}%). Review practice notes and revise common interview patterns.`;
      } else {
        studentLevel = 'beginner';
        gapScore = 85;
        recommendation = `Recent interview performance was lower in ${skill} (${matchingTopic.averageScore}%). Prioritize fundamental revision.`;
      }
    } else if (isDeclared) {
      studentLevel = 'developing';
      gapScore = 45;
      recommendation = `Skill listed on profile. Take a mock interview to assess depth and live problem solving.`;
    } else {
      studentLevel = 'missing';
      gapScore = importance === 'critical' ? 90 : importance === 'important' ? 70 : 50;
      recommendation = `Required for ${targetRole}. Study foundational concepts and add to your portfolio.`;
    }

    gaps.push({
      skill,
      importance,
      studentLevel,
      gapScore,
      recommendation,
      resourceUrl: '/student/interview-preparation'
    });
  };

  roleReqs.critical.forEach(s => evaluateSkill(s, 'critical'));
  roleReqs.important.forEach(s => evaluateSkill(s, 'important'));
  roleReqs.recommended.forEach(s => evaluateSkill(s, 'recommended'));

  return gaps;
}

/**
 * 3. Generate Next Best Action & AI Career Insight
 */
export function generateCareerInsight(
  readiness: CareerReadiness,
  skillGaps: SkillGap[],
  targetRole: string
): CareerInsight {
  const criticalGaps = skillGaps.filter(g => g.importance === 'critical' && (g.studentLevel === 'missing' || g.studentLevel === 'beginner'));
  const developingGaps = skillGaps.filter(g => g.studentLevel === 'developing' || g.studentLevel === 'beginner');
  const strongSkills = skillGaps.filter(g => g.studentLevel === 'strong');

  const topStrength = strongSkills.length > 0 
    ? strongSkills[0].skill 
    : 'Clear interest and motivation in ' + targetRole;

  let biggestOpportunity = 'System Architecture & Problem Solving';
  if (criticalGaps.length > 0) {
    biggestOpportunity = `${criticalGaps[0].skill} Fundamentals`;
  } else if (developingGaps.length > 0) {
    biggestOpportunity = `${developingGaps[0].skill} Optimization & Practice`;
  }

  let nextAction: NextBestAction;

  if (readiness.dataCompleteness < 50 && readiness.missingDataItems.length > 0) {
    nextAction = {
      title: 'Complete Your Profile & Target Role',
      reason: 'Your Career Readiness Score is currently estimated. Adding your role and skills unlocks accurate recommendations.',
      actionUrl: '/student/profile',
      buttonText: 'Update Profile',
      category: 'profile'
    };
  } else if (readiness.interviewPerformance < 60 || readiness.dataCompleteness < 75) {
    nextAction = {
      title: `Take a ${targetRole} Technical Mock Interview`,
      reason: `Validate your skills in real-time conversation and receive AI feedback on strengths and blind spots.`,
      actionUrl: '/student/mock-interview',
      buttonText: 'Start Mock Interview',
      category: 'interview'
    };
  } else if (criticalGaps.length > 0) {
    nextAction = {
      title: `Master ${criticalGaps[0].skill}`,
      reason: `${criticalGaps[0].skill} is a critical requirement for ${targetRole} roles where your score indicates a gap.`,
      actionUrl: '/student/notes',
      buttonText: 'Study Revision Notes',
      category: 'technical'
    };
  } else {
    nextAction = {
      title: `Practice Advanced Technical Scenarios in ${targetRole}`,
      reason: `You have demonstrated strong foundations across core areas. Focus on real-world system design questions.`,
      actionUrl: '/student/interview-preparation',
      buttonText: 'Practice Questions',
      category: 'technical'
    };
  }

  const summary = `Your strongest area is ${topStrength}. To maximize your placement readiness for ${targetRole}, focus immediate preparation on ${biggestOpportunity}. Completing targeted practice will raise your Career Readiness from ${readiness.overallScore}% towards top candidate benchmarks.`;

  return {
    summary,
    topStrength,
    biggestOpportunity,
    nextBestAction: nextAction
  };
}

/**
 * 4. Generate Structured Multi-Day Tasks Roadmap (7, 14, or 30 Days)
 */
export function generateImprovementTasks(
  planDuration: number,
  targetRole: string,
  skillGaps: SkillGap[],
  readiness: CareerReadiness
): CareerTask[] {
  const tasks: CareerTask[] = [];
  const totalDays = planDuration === 30 ? 30 : planDuration === 14 ? 14 : 7;
  
  const sortedGaps = [...skillGaps].sort((a, b) => b.gapScore - a.gapScore);
  const primaryGap = sortedGaps[0] || { skill: 'Core Technical Concepts', recommendation: 'Review fundamentals' };
  const secondaryGap = sortedGaps[1] || { skill: 'System Architecture', recommendation: 'Review design patterns' };

  // Generate day-by-day progression
  for (let day = 1; day <= totalDays; day++) {
    if (day === 1) {
      tasks.push({
        dayNumber: 1,
        title: `Master ${primaryGap.skill} Core Fundamentals`,
        description: `Review key syntax, design patterns, and foundational mechanics for ${primaryGap.skill}.`,
        category: 'technical',
        priority: 'high',
        estimatedMinutes: 35,
        relatedSkill: primaryGap.skill,
        reason: primaryGap.recommendation,
        resourceUrl: '/student/notes',
        resourceTitle: `${primaryGap.skill} Revision Notes`,
        status: 'pending'
      });
      tasks.push({
        dayNumber: 1,
        title: `Solve 3 ${primaryGap.skill} Practice Questions`,
        description: `Work through beginner-to-intermediate questions and verify solution approaches.`,
        category: 'technical',
        priority: 'medium',
        estimatedMinutes: 30,
        relatedSkill: primaryGap.skill,
        reason: 'Reinforce theoretical knowledge with active problem solving.',
        resourceUrl: '/student/interview-preparation',
        resourceTitle: `${primaryGap.skill} Question Pack`,
        status: 'pending'
      });
    } else if (day === 2) {
      tasks.push({
        dayNumber: 2,
        title: `Study ${secondaryGap.skill} & Practical Scenarios`,
        description: `Explore production trade-offs and common architectural questions in ${secondaryGap.skill}.`,
        category: 'technical',
        priority: 'high',
        estimatedMinutes: 40,
        relatedSkill: secondaryGap.skill,
        reason: secondaryGap.recommendation,
        resourceUrl: '/student/notes',
        resourceTitle: `${secondaryGap.skill} Deep Dive`,
        status: 'pending'
      });
      tasks.push({
        dayNumber: 2,
        title: `Refine STAR Behavioral Answers`,
        description: `Draft 2 structured answers covering past challenges, team conflict, and project ownership.`,
        category: 'communication',
        priority: 'medium',
        estimatedMinutes: 25,
        relatedSkill: 'Communication',
        reason: 'Behavioral rounds carry 20-30% weight in hiring decisions.',
        resourceUrl: '/student/interview-preparation',
        resourceTitle: 'STAR Behavioral Framework',
        status: 'pending'
      });
    } else if (day === 3) {
      tasks.push({
        dayNumber: 3,
        title: `Complete a ${targetRole} AI Mock Interview`,
        description: `Put your recent learnings into practice with a realistic voice/text mock interview.`,
        category: 'interview',
        priority: 'critical',
        estimatedMinutes: 20,
        relatedSkill: 'Interview Readiness',
        reason: 'Measure your difficulty adaptation and receive updated AI feedback.',
        resourceUrl: '/student/mock-interview',
        resourceTitle: 'GradZenX Adaptive Mock Interview',
        status: 'pending'
      });
      tasks.push({
        dayNumber: 3,
        title: `Review AI Performance Report & Weaknesses`,
        description: `Inspect category scores (Relevance, Technical, Communication) and read model answers.`,
        category: 'interview',
        priority: 'high',
        estimatedMinutes: 15,
        relatedSkill: 'Self-Correction',
        reason: 'Immediate review doubles concept retention and corrects misconceptions.',
        resourceUrl: '/student/mock-interview',
        resourceTitle: 'Interview Evaluation Report',
        status: 'pending'
      });
    } else if (day === 4) {
      tasks.push({
        dayNumber: 4,
        title: `Resume Alignment for ${targetRole}`,
        description: `Ensure your projects highlight measurable impacts, metrics, and relevant tools.`,
        category: 'resume',
        priority: 'medium',
        estimatedMinutes: 30,
        relatedSkill: 'Resume Impact',
        reason: 'Align bullet points with hiring manager keywords.',
        resourceUrl: '/student/resume',
        resourceTitle: 'Resume Builder & Analyzer',
        status: 'pending'
      });
    } else if (day === 5) {
      tasks.push({
        dayNumber: 5,
        title: `Advanced Edge Cases in ${primaryGap.skill}`,
        description: `Solve 5 scenario-based interview problems involving performance bottlenecks and concurrency.`,
        category: 'technical',
        priority: 'high',
        estimatedMinutes: 45,
        relatedSkill: primaryGap.skill,
        reason: 'Prepares you for Hard difficulty questions.',
        resourceUrl: '/student/interview-preparation',
        resourceTitle: 'Advanced Practice Pack',
        status: 'pending'
      });
    } else if (day === 6) {
      tasks.push({
        dayNumber: 6,
        title: `HR & Managerial Question Rehearsal`,
        description: `Practice answering salary expectations, conflict resolution, and 5-year career vision questions.`,
        category: 'hr_preparation',
        priority: 'medium',
        estimatedMinutes: 25,
        relatedSkill: 'HR Articulation',
        reason: 'Ensures composure in final round discussions.',
        resourceUrl: '/student/interview-preparation',
        resourceTitle: 'HR Master Question Pack',
        status: 'pending'
      });
    } else if (day === 7) {
      tasks.push({
        dayNumber: 7,
        title: `Final Evaluation Mock Interview`,
        description: `Complete a full mock interview session to benchmark your progress across the week.`,
        category: 'interview',
        priority: 'critical',
        estimatedMinutes: 25,
        relatedSkill: 'Comprehensive Placement Readiness',
        reason: 'Verify readiness and calculate your updated Career Readiness Score.',
        resourceUrl: '/student/mock-interview',
        resourceTitle: 'Final Mock Interview',
        status: 'pending'
      });
    } else {
      // For 14 and 30 day extensions
      const rotGap = sortedGaps[day % sortedGaps.length] || primaryGap;
      tasks.push({
        dayNumber: day,
        title: `Day ${day}: Deep Practice in ${rotGap.skill}`,
        description: `Review industry case studies and solve 3 advanced scenario questions in ${rotGap.skill}.`,
        category: day % 3 === 0 ? 'interview' : 'technical',
        priority: day % 3 === 0 ? 'high' : 'medium',
        estimatedMinutes: 30,
        relatedSkill: rotGap.skill,
        reason: rotGap.recommendation,
        resourceUrl: day % 3 === 0 ? '/student/mock-interview' : '/student/interview-preparation',
        resourceTitle: `${rotGap.skill} Module`,
        status: 'pending'
      });
    }
  }

  return tasks;
}
