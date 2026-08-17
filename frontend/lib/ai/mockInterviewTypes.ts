import { InterviewType } from '@/lib/mockInterview';

export type ExperienceLevel = 'Fresher' | '0–1 Years' | '1–3 Years' | '3+ Years';
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface AIMessage {
  id?: string;
  session_id: string;
  role: 'system' | 'interviewer' | 'student';
  message: string;
  message_type?: 'introduction' | 'question' | 'follow_up' | 'answer' | 'feedback';
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface NextStepAIResponse {
  action: 'question' | 'follow_up' | 'complete';
  question_type: 'main' | 'follow_up';
  question: string;
  helper_tip?: string;
  should_follow_up: boolean;
  question_number: number;
  total_questions: number;
  interviewer_remarks?: string;
}

export interface AnswerAnalysisResult {
  score: number;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  relevance_score: number;
  clarity_score: number;
  feedback: string;
  key_points_covered?: string[];
  missed_points?: string[];
}

export interface FinalReportRecommendation {
  type: 'interview' | 'notes' | 'skill';
  title: string;
  link?: string;
  description: string;
}

export interface FinalReportAIResponse {
  overall_score: number;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  relevance_score: number;
  clarity_score: number;
  strengths: string[];
  improvements: string[];
  recommendations: FinalReportRecommendation[];
  overall_feedback: string;
}
