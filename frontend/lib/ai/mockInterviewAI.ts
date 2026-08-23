import { InterviewType } from '@/lib/mockInterview';
import { 
  ExperienceLevel, 
  InterviewDifficulty, 
  NextStepAIResponse, 
  AnswerAnalysisResult, 
  FinalReportAIResponse 
} from '@/lib/ai/mockInterviewTypes';
import { 
  getInterviewerSystemPrompt, 
  getAdaptiveNextStepPrompt, 
  getEvaluationAndReportPrompt 
} from '@/lib/ai/mockInterviewPrompts';
import { 
  InterviewContext, 
  AdaptiveDecision, 
  generateAdaptiveDecision, 
  computeInterviewMomentum, 
  updateTopicPerformance,
  ROLE_TOPICS_MAP,
  TopicPerformance
} from '@/lib/adaptiveInterview';
import { callAIProvider } from '@/lib/ai/config';

export interface SessionConfig {
  interviewType: InterviewType;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  difficulty: InterviewDifficulty;
  totalQuestions: number;
}

/**
 * Clean and parse JSON response from LLM safely
 */
function parseJSONSafely<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error('Failed to parse AI JSON response:', err);
    return fallback;
  }
}

/**
 * Calls the configured LLM provider.
 * Provider resolution is handled by the centralized lib/ai/config.ts.
 * Returns null if no provider is configured — callers use built-in fallback.
 */
async function callLLMProvider(systemPrompt: string, userPrompt: string): Promise<string | null> {
  return callAIProvider(systemPrompt, userPrompt, { temperature: 0.7, responseFormat: 'json_object' });
}

/**
 * 1. Start AI Interview: Generate Welcome + First Adaptive Question
 */
export async function startAIInterview(config: SessionConfig): Promise<{
  introduction: string;
  firstQuestion: string;
  helperTip: string;
  initialTopic: string;
}> {
  const roleTopics = ROLE_TOPICS_MAP[config.targetRole] || ROLE_TOPICS_MAP['General'];
  const initialTopic = roleTopics[0];

  const systemPrompt = getInterviewerSystemPrompt(
    config.interviewType,
    config.targetRole,
    config.experienceLevel,
    config.difficulty,
    config.totalQuestions
  );

  const userPrompt = `Start the adaptive mock interview for a ${config.experienceLevel} ${config.targetRole} (${config.interviewType} track).
Starting Topic: "${initialTopic}" (${config.difficulty} difficulty).

Return JSON:
{
  "introduction": "Welcome message (2-3 sentences)",
  "firstQuestion": "Question 1 string focusing on ${initialTopic}",
  "helperTip": "A concise tip for structuring the answer"
}`;

  const raw = await callLLMProvider(systemPrompt, userPrompt);
  if (raw) {
    const parsed = parseJSONSafely(raw, null as any);
    if (parsed?.firstQuestion) {
      return {
        introduction: parsed.introduction || `Welcome to your KnowledgePaat Adaptive AI Interview for ${config.targetRole}. Let us begin.`,
        firstQuestion: parsed.firstQuestion,
        helperTip: parsed.helperTip || 'Provide a structured answer with clear examples.',
        initialTopic
      };
    }
  }

  // Fallback initial question based on role & track
  const intro = `Hello! Welcome to your KnowledgePaat Adaptive AI Mock Interview for the ${config.targetRole} role (${config.experienceLevel} level). The interview will adapt dynamically in difficulty based on your answers. Let's begin with ${initialTopic}.`;
  
  let q1 = `Tell me about your background with ${config.targetRole} and walk me through a core architecture or project in ${initialTopic} that you designed or worked on.`;
  let tip = 'Structure your response: Introduction -> Problem & Tools -> Solution Architecture -> Measurable Result.';

  if (config.interviewType === 'technical') {
    q1 = `In ${initialTopic}, what are the fundamental concepts and best practices you apply to ensure reliability and performance? Give a concrete example.`;
    tip = 'Highlight architecture choices, data flow, and trade-offs.';
  } else if (config.interviewType === 'managerial') {
    q1 = `Walk me through a project in ${initialTopic} where you took ownership from conception to delivery. How did you plan milestones and manage cross-functional priorities?`;
    tip = 'Emphasize ownership, stakeholder communication, and how you balanced trade-offs.';
  }

  return { introduction: intro, firstQuestion: q1, helperTip: tip, initialTopic };
}

/**
 * 2. Adaptive Step Generator: Evaluates Answer & Selects Next Question
 */
export async function evaluateAndGenerateAdaptiveNextStep(
  context: InterviewContext,
  lastQuestion: string,
  lastAnswer: string,
  lastTopic: string
): Promise<{
  analysis: AnswerAnalysisResult;
  adaptiveDecision: AdaptiveDecision;
  nextStep: NextStepAIResponse;
  updatedTopicPerformance: TopicPerformance[];
}> {
  const words = (lastAnswer || '').trim().split(/\s+/).filter(Boolean).length;
  const length = (lastAnswer || '').trim().length;

  let baseScore = length === 0 ? 0 : words < 20 ? 52 : words < 50 ? 74 : words < 120 ? 86 : 94;
  const commScore = Math.min(95, Math.max(30, baseScore + (words > 40 ? 5 : -5)));
  const techScore = Math.min(95, Math.max(30, baseScore + (context.interviewType === 'technical' ? 4 : 0)));
  const confScore = Math.min(95, Math.max(30, baseScore));

  const analysis: AnswerAnalysisResult = {
    score: baseScore,
    communication_score: commScore,
    technical_score: techScore,
    confidence_score: confScore,
    relevance_score: Math.min(95, baseScore + 3),
    clarity_score: commScore,
    feedback: words < 25 
      ? 'Answer is concise. Expand with more concrete technical specifics or project metrics.'
      : 'Well-articulated response with solid context and reasoning.'
  };

  // Run Adaptive Decision Algorithm
  const adaptiveDecision = generateAdaptiveDecision(context, baseScore, lastAnswer, lastTopic);
  const updatedTopicPerformance = updateTopicPerformance(context.topicPerformance, lastTopic || adaptiveDecision.recommendedTopic, baseScore);

  const isLastQuestion = context.questionsAsked >= context.questionsRemaining + context.questionsAsked && !adaptiveDecision.followUpRequired;

  if (isLastQuestion) {
    return {
      analysis,
      adaptiveDecision,
      updatedTopicPerformance,
      nextStep: {
        action: 'complete',
        question_type: 'main',
        question: 'Thank you! You have completed all questions in this mock interview session.',
        should_follow_up: false,
        question_number: context.questionsAsked,
        total_questions: context.questionsAsked + context.questionsRemaining,
        interviewer_remarks: 'All interview responses have been recorded.'
      }
    };
  }

  const systemPrompt = getInterviewerSystemPrompt(
    context.interviewType as InterviewType,
    context.role,
    'Fresher' as ExperienceLevel,
    adaptiveDecision.nextDifficulty,
    context.questionsAsked + context.questionsRemaining
  );

  const nextStepPrompt = getAdaptiveNextStepPrompt(
    context.role,
    context.interviewType as InterviewType,
    context.questionsAsked + 1,
    context.questionsAsked + context.questionsRemaining,
    adaptiveDecision,
    context.interviewMomentum,
    lastQuestion,
    lastAnswer
  );

  const raw = await callLLMProvider(systemPrompt, nextStepPrompt);
  if (raw) {
    const parsed = parseJSONSafely<NextStepAIResponse>(raw, null as any);
    if (parsed?.question) {
      return { analysis, adaptiveDecision, nextStep: parsed, updatedTopicPerformance };
    }
  }

  // Fallback intelligent adaptive questions
  let qText = `In ${adaptiveDecision.recommendedTopic}, how do you approach designing for performance and maintainability? Give a practical example.`;
  let tipText = 'Discuss design decisions, edge cases, and testing strategies.';

  if (adaptiveDecision.questionType === 'scenario') {
    qText = `Suppose a high-volume service in ${adaptiveDecision.recommendedTopic} experiences sudden latency spikes under peak load. How would you diagnose, isolate, and remediate the bottleneck?`;
    tipText = 'Walk through monitoring metrics, logs, query profiling, and remediation steps.';
  } else if (adaptiveDecision.questionType === 'deep_dive') {
    qText = `Let us dive deeper into ${adaptiveDecision.recommendedTopic}: what are the internal mechanisms and trade-offs between different implementation approaches at scale?`;
    tipText = 'Contrast time/space complexities and architectural compromises.';
  } else if (adaptiveDecision.questionType === 'clarification') {
    qText = `Could you clarify the core mechanics of ${adaptiveDecision.recommendedTopic} and walk through a simple code or workflow example?`;
    tipText = 'Start with a clear definition, followed by step-by-step mechanics.';
  }

  const nextQNumber = adaptiveDecision.followUpRequired ? context.questionsAsked : context.questionsAsked + 1;

  return {
    analysis,
    adaptiveDecision,
    updatedTopicPerformance,
    nextStep: {
      action: adaptiveDecision.followUpRequired ? 'follow_up' : 'question',
      question_type: adaptiveDecision.followUpRequired ? 'follow_up' : 'main',
      question: qText,
      helper_tip: tipText,
      should_follow_up: adaptiveDecision.followUpRequired,
      question_number: nextQNumber,
      total_questions: context.questionsAsked + context.questionsRemaining,
      interviewer_remarks: adaptiveDecision.reasoning
    }
  };
}

/**
 * 3. Generate Final Comprehensive Adaptive AI Evaluation Report
 */
export async function generateFinalAIReport(
  config: SessionConfig,
  conversationHistory: { role: string; message: string; message_type?: string }[]
): Promise<FinalReportAIResponse> {
  const systemPrompt = getInterviewerSystemPrompt(
    config.interviewType,
    config.targetRole,
    config.experienceLevel,
    config.difficulty,
    config.totalQuestions
  );

  const reportPrompt = getEvaluationAndReportPrompt(
    config.interviewType,
    config.targetRole,
    config.experienceLevel,
    config.difficulty,
    conversationHistory
  );

  const raw = await callLLMProvider(systemPrompt, reportPrompt);
  if (raw) {
    const parsed = parseJSONSafely<FinalReportAIResponse>(raw, null as any);
    if (parsed?.overall_score !== undefined) {
      return parsed;
    }
  }

  // Built-in evaluation calculation
  const studentMessages = conversationHistory.filter(m => m.role === 'student');
  const totalLength = studentMessages.reduce((sum, m) => sum + (m.message || '').length, 0);
  const avgWords = studentMessages.length > 0 ? (totalLength / studentMessages.length) / 5 : 0;

  const rawComm = Math.min(96, Math.max(50, Math.round(55 + (Math.min(avgWords, 70) / 70 * 35))));
  const rawTech = Math.min(95, Math.max(50, Math.round(50 + (Math.min(avgWords, 80) / 80 * 40))));
  const rawConf = Math.min(94, Math.max(50, Math.round(60 + (Math.min(avgWords, 60) / 60 * 30))));
  const rawRelev = Math.min(98, Math.max(55, Math.round(rawTech + 2)));
  const rawClarity = Math.min(96, Math.max(55, Math.round(rawComm + 1)));

  const overall = Math.round((rawComm * 0.25) + (rawTech * 0.35) + (rawConf * 0.15) + (rawRelev * 0.15) + (rawClarity * 0.10));

  return {
    overall_score: overall,
    communication_score: rawComm,
    technical_score: rawTech,
    confidence_score: rawConf,
    relevance_score: rawRelev,
    clarity_score: rawClarity,
    strengths: [
      `Demonstrated clear technical vocabulary relevant to ${config.targetRole} role.`,
      `Structured responses with logical context and step-by-step problem breakdown.`,
      `Handled adaptive difficulty shifts with professional composure and relevant project context.`
    ],
    improvements: [
      `Incorporate more quantifiable metrics when discussing project outcomes.`,
      `State architectural trade-offs explicitly before settling on a particular technology choice.`,
      `Use the STAR method consistently to frame challenges and outcomes concisely.`
    ],
    recommendations: [
      {
        type: 'interview',
        title: `${config.targetRole} Advanced Practice Pack`,
        link: '/student/interview-preparation',
        description: `Practice adaptive question sets in core architectural patterns.`
      },
      {
        type: 'notes',
        title: `Core Architecture & System Design Revision Notes`,
        link: '/student/notes',
        description: `Review concise study notes on scalable API design and database optimizations.`
      },
      {
        type: 'skill',
        title: `STAR Behavioral Framework Practice`,
        link: '/student/interview-preparation',
        description: `Refine situational leadership and obstacle resolution narratives.`
      }
    ],
    overall_feedback: `You demonstrated a strong foundational understanding for the ${config.targetRole} role (${config.experienceLevel} level). Your responses showed solid technical awareness and articulation. Incorporating more measurable project impacts will position you strongly in final hiring rounds.`
  };
}
