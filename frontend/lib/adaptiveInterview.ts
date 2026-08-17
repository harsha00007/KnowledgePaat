export type AdaptiveDifficulty = 'easy' | 'medium' | 'hard';

export type AdaptiveQuestionType = 
  | 'new_topic'
  | 'follow_up'
  | 'clarification'
  | 'scenario'
  | 'deep_dive';

export type InterviewMomentum = 
  | 'struggling'
  | 'stable'
  | 'performing_well'
  | 'excellent';

export type TopicStrength = 'weak' | 'developing' | 'strong' | 'expert';

export interface TopicPerformance {
  topic: string;
  attempts: number;
  averageScore: number;
  strength: TopicStrength;
}

export interface AdaptiveDecision {
  nextDifficulty: AdaptiveDifficulty;
  questionType: AdaptiveQuestionType;
  recommendedTopic: string;
  followUpRequired: boolean;
  reasoning: string;
  questionStrategy: string;
}

export interface InterviewContext {
  sessionId: string;
  role: string;
  interviewType: string;
  currentDifficulty: AdaptiveDifficulty;
  highestDifficultyReached: AdaptiveDifficulty;
  questionsAsked: number;
  questionsRemaining: number;
  strengths: string[];
  weaknesses: string[];
  topicPerformance: TopicPerformance[];
  previousQuestions: string[];
  previousAnswers: string[];
  interviewMomentum: InterviewMomentum;
}

/**
 * Standard topics by target role and track
 */
export const ROLE_TOPICS_MAP: Record<string, string[]> = {
  'Software Engineer': ['Data Structures & Algorithms', 'System Architecture', 'API Design & Integration', 'Database Optimization', 'Debugging & Testing', 'Clean Code Principles'],
  'Frontend Developer': ['React & State Management', 'DOM Performance & Rendering', 'CSS Architecture & Responsive Layouts', 'TypeScript & Type Safety', 'API Fetching & Caching', 'Web Accessibility (a11y)'],
  'Backend Developer': ['REST API & Microservices', 'Database Schema & Query Optimization', 'Authentication & Authorization', 'Concurrency & Caching', 'Error Handling & Logging', 'Scalability & System Design'],
  'Full Stack Developer': ['Frontend-Backend Integration', 'Full Stack Authentication', 'Database Indexing & Queries', 'Server-Side Rendering', 'Deployment & CI/CD', 'State Synchronization'],
  'Python Developer': ['Python OOP & Data Structures', 'Django / FastAPI Architecture', 'Generators & Decorators', 'Database ORM & Queries', 'AsyncIO & Concurrency', 'Unit Testing & Mocking'],
  'Data Analyst': ['SQL Queries & Aggregations', 'Data Cleaning & ETL Pipelines', 'Statistical Analysis', 'Business Intelligence & Dashboards', 'Data Modeling', 'Data Visualization Insights'],
  'QA / Automation Engineer': ['Test Automation Frameworks', 'API Testing & Validation', 'CI/CD Pipeline Integration', 'Edge Case & Boundary Analysis', 'Performance & Load Testing', 'Bug Tracking & Reporting'],
  'General': ['Core Technical Concepts', 'Problem Solving & Architecture', 'Debugging Strategies', 'Collaboration & Delivery', 'System Scalability']
};

/**
 * Map numerical strength into discrete category
 */
export function getTopicStrength(score: number): TopicStrength {
  if (score >= 90) return 'expert';
  if (score >= 75) return 'strong';
  if (score >= 55) return 'developing';
  return 'weak';
}

/**
 * Calculate interview momentum from rolling average scores
 */
export function computeInterviewMomentum(scores: number[]): InterviewMomentum {
  if (scores.length === 0) return 'stable';
  
  // Consider last 3 scores with higher weight on the most recent
  const recent = scores.slice(-3);
  const avg = recent.reduce((sum, s) => sum + s, 0) / recent.length;

  if (avg >= 90) return 'excellent';
  if (avg >= 75) return 'performing_well';
  if (avg >= 50) return 'stable';
  return 'struggling';
}

/**
 * Update rolling topic performance data
 */
export function updateTopicPerformance(
  currentList: TopicPerformance[],
  topic: string,
  score: number
): TopicPerformance[] {
  const existing = currentList.find(t => t.topic.toLowerCase() === topic.toLowerCase());

  if (existing) {
    const newAttempts = existing.attempts + 1;
    const newAvg = Math.round(((existing.averageScore * existing.attempts) + score) / newAttempts);
    return currentList.map(t => 
      t.topic.toLowerCase() === topic.toLowerCase()
        ? {
            topic: existing.topic,
            attempts: newAttempts,
            averageScore: newAvg,
            strength: getTopicStrength(newAvg)
          }
        : t
    );
  }

  return [
    ...currentList,
    {
      topic,
      attempts: 1,
      averageScore: Math.round(score),
      strength: getTopicStrength(score)
    }
  ];
}

/**
 * Rank difficulty hierarchy
 */
const DIFFICULTY_RANKS: Record<AdaptiveDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

function getHighestDifficulty(d1: AdaptiveDifficulty, d2: AdaptiveDifficulty): AdaptiveDifficulty {
  return DIFFICULTY_RANKS[d1] >= DIFFICULTY_RANKS[d2] ? d1 : d2;
}

/**
 * Core Adaptive Decision Engine
 */
export function generateAdaptiveDecision(
  context: InterviewContext,
  lastAnswerScore: number,
  lastAnswerText: string,
  lastTopic?: string
): AdaptiveDecision {
  const words = (lastAnswerText || '').trim().split(/\s+/).filter(Boolean).length;
  const lowerAnswer = (lastAnswerText || '').toLowerCase();
  
  // 1. Difficulty Adaptation Rules
  let nextDifficulty: AdaptiveDifficulty = context.currentDifficulty;

  if (lastAnswerScore >= 85) {
    // High score -> Promote difficulty
    if (context.currentDifficulty === 'easy') nextDifficulty = 'medium';
    else if (context.currentDifficulty === 'medium') nextDifficulty = 'hard';
  } else if (lastAnswerScore < 60) {
    // Low score -> Reduce difficulty or provide foundational recovery
    if (context.currentDifficulty === 'hard') nextDifficulty = 'medium';
    else if (context.currentDifficulty === 'medium') nextDifficulty = 'easy';
  }

  const highestDifficultyReached = getHighestDifficulty(context.highestDifficultyReached, nextDifficulty);

  // 2. Follow-Up & Question Type Intelligence
  const isIncomplete = words < 25 && words > 0;
  const mentionsProject = lowerAnswer.includes('project') || lowerAnswer.includes('built') || lowerAnswer.includes('designed') || lowerAnswer.includes('implemented');
  
  let questionType: AdaptiveQuestionType = 'new_topic';
  let followUpRequired = false;
  let reasoning = 'Proceeding to evaluate the next core topic in the curriculum.';
  let strategy = 'Standard topic progression.';

  if (isIncomplete && context.questionsRemaining > 1) {
    questionType = 'clarification';
    followUpRequired = true;
    reasoning = 'Candidate response was concise; asking clarification to test depth.';
    strategy = 'Clarification on foundational mechanics.';
  } else if (lastAnswerScore >= 90 && mentionsProject && nextDifficulty === 'hard') {
    questionType = 'deep_dive';
    followUpRequired = true;
    reasoning = 'Candidate scored exceptionally high on practical implementation; triggering deep architecture dive.';
    strategy = 'Senior architectural trade-off inquiry.';
  } else if (lastAnswerScore >= 75 && nextDifficulty !== 'easy') {
    questionType = 'scenario';
    reasoning = 'Candidate demonstrates solid competence; presenting real-world production scenario.';
    strategy = 'Scenario-based application question.';
  } else if (lastAnswerScore < 50) {
    questionType = 'clarification';
    reasoning = 'Candidate struggled on this concept; switching to foundational principles for recovery.';
    strategy = 'Foundational concept reinforcement.';
  }

  // 3. Strategic Topic Selection
  const allRoleTopics = ROLE_TOPICS_MAP[context.role] || ROLE_TOPICS_MAP['General'];
  
  // Find topics that are either weak or haven't been tested yet
  const weakTopics = context.topicPerformance.filter(t => t.strength === 'weak' || t.strength === 'developing');
  const testedTopicNames = new Set(context.topicPerformance.map(t => t.topic.toLowerCase()));
  const untestedTopics = allRoleTopics.filter(t => !testedTopicNames.has(t.toLowerCase()));

  let recommendedTopic = allRoleTopics[0];

  if (followUpRequired && lastTopic) {
    recommendedTopic = lastTopic;
  } else if (untestedTopics.length > 0) {
    // Prioritize testing fresh curriculum areas
    recommendedTopic = untestedTopics[0];
  } else if (weakTopics.length > 0) {
    // Re-test weakest area with an alternate angle
    recommendedTopic = weakTopics[0].topic;
  } else {
    // Rotate topics
    const nextIdx = context.questionsAsked % allRoleTopics.length;
    recommendedTopic = allRoleTopics[nextIdx];
  }

  return {
    nextDifficulty,
    questionType,
    recommendedTopic,
    followUpRequired,
    reasoning,
    questionStrategy: strategy
  };
}
