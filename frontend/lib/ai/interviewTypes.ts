import { InterviewType } from '@/lib/mockInterview';
import { ExperienceLevel, InterviewDifficulty } from '@/lib/ai/mockInterviewTypes';

export type PerformanceLevel = 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement' | 'Beginner';

export interface CategoryScores {
  relevance: number;           // 0-10
  technical_accuracy: number;  // 0-10
  communication: number;       // 0-10
  clarity: number;             // 0-10
  answer_structure: number;    // 0-10
  confidence: number;          // 0-10
}

export interface EvaluateAnswerInput {
  question: string;
  studentAnswer: string;
  interviewType: InterviewType;
  category?: string;
  difficulty?: InterviewDifficulty | string;
  expectedConcepts?: string[];
  role?: string;
  experienceLevel?: ExperienceLevel | string;
}

export interface AnswerEvaluationResult {
  overall_score: number;       // 0-100
  performance_level: PerformanceLevel;
  scores: CategoryScores;
  strengths: string[];
  improvements: string[];
  missing_concepts: string[];
  better_answer: string;
  interview_tip: string;
  summary: string;
}

export interface SessionReportSummary {
  overall_score: number;
  performance_level: PerformanceLevel;
  total_questions: number;
  completed_questions: number;
  average_scores: CategoryScores;
  strengths: string[];
  weaknesses: string[];
  missing_concepts: string[];
  recommendations: {
    type: 'interview' | 'notes' | 'skill';
    title: string;
    description: string;
    link?: string;
  }[];
  overall_feedback: string;
}

/**
 * Calculates standardized Performance Level from percentage score
 */
export function getPerformanceLevel(score: number): PerformanceLevel {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  return 'Beginner';
}
