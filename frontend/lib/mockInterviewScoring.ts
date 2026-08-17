import { InterviewType } from '@/lib/mockInterview';

export interface AnswerEvaluationInput {
  questionText: string;
  answerText: string | null;
}

export interface EvaluationResult {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  questionScores: {
    questionText: string;
    score: number;
    feedback: string;
  }[];
}

/**
 * Isolated Rule-Based Scoring Engine for Phase G4.2
 * Designed to be seamlessly replaced with AI evaluation in Phase G4.3
 */
export function evaluateMockInterview(
  interviewType: InterviewType,
  answers: AnswerEvaluationInput[]
): EvaluationResult {
  const totalQuestions = answers.length || 10;
  let totalLength = 0;
  let answeredCount = 0;
  let structuralKeywordsCount = 0;
  let technicalKeywordsCount = 0;

  const structuralKeywords = ['situation', 'task', 'action', 'result', 'because', 'first', 'second', 'finally', 'learned', 'impact', 'resolved', 'lead', 'managed'];
  const techKeywords = ['algorithm', 'complexity', 'database', 'optimization', 'api', 'system', 'architecture', 'scalability', 'performance', 'query', 'async', 'component', 'state'];

  const questionScores = answers.map((item) => {
    const text = (item.answerText || '').trim();
    const length = text.length;
    const words = text ? text.split(/\s+/).length : 0;

    let qScore = 0;
    let qFeedback = '';

    if (length === 0) {
      qScore = 0;
      qFeedback = 'Question was left unanswered. Make sure to provide at least a brief conceptual summary.';
    } else if (words < 15) {
      qScore = 40;
      qFeedback = 'Answer is very brief. Expand with concrete technical details and real-world examples.';
    } else if (words < 40) {
      qScore = 65;
      qFeedback = 'Good concise response. Consider adding measurable results or project trade-offs.';
    } else if (words < 120) {
      qScore = 85;
      qFeedback = 'Strong, well-structured answer with good depth and clarity.';
    } else {
      qScore = 92;
      qFeedback = 'Extremely comprehensive and detailed explanation covering all major aspects.';
    }

    if (length > 0) {
      answeredCount++;
      totalLength += length;

      const lower = text.toLowerCase();
      structuralKeywords.forEach(k => {
        if (lower.includes(k)) structuralKeywordsCount++;
      });
      techKeywords.forEach(k => {
        if (lower.includes(k)) technicalKeywordsCount++;
      });
    }

    return {
      questionText: item.questionText,
      score: qScore,
      feedback: qFeedback
    };
  });

  const completionRatio = answeredCount / totalQuestions;
  const avgWordsPerAnswer = answeredCount > 0 ? (totalLength / answeredCount) / 5 : 0;

  // Compute Component Scores
  const rawComm = Math.min(95, Math.max(30, Math.round(
    (completionRatio * 45) + (Math.min(avgWordsPerAnswer, 80) / 80 * 35) + (Math.min(structuralKeywordsCount, 10) * 1.5)
  )));

  const rawTech = Math.min(95, Math.max(30, Math.round(
    (completionRatio * 40) + (Math.min(avgWordsPerAnswer, 90) / 90 * 30) + (Math.min(technicalKeywordsCount, 12) * 2.1)
  )));

  const rawConf = Math.min(95, Math.max(30, Math.round(
    (completionRatio * 50) + (Math.min(avgWordsPerAnswer, 70) / 70 * 40) + 5
  )));

  // If no questions were answered, drop scores
  const communicationScore = answeredCount === 0 ? 0 : rawComm;
  const technicalScore = answeredCount === 0 ? 0 : rawTech;
  const confidenceScore = answeredCount === 0 ? 0 : rawConf;

  const overallScore = answeredCount === 0 
    ? 0 
    : Math.round((communicationScore * 0.35) + (technicalScore * 0.40) + (confidenceScore * 0.25));

  // Determine Dynamic Strengths
  const strengths: string[] = [];
  if (answeredCount >= 8) strengths.push('High response completion rate across all interview questions.');
  if (avgWordsPerAnswer >= 45) strengths.push('Detailed, descriptive answers demonstrating depth of knowledge.');
  if (structuralKeywordsCount >= 5) strengths.push('Strong structured thinking and situational framing in explanations.');
  if (technicalKeywordsCount >= 4) strengths.push('Good usage of relevant technical terminology and system concepts.');
  if (strengths.length === 0) strengths.push('Attempted interview track with positive baseline engagement.');

  // Determine Dynamic Improvement Areas
  const improvements: string[] = [];
  if (answeredCount < totalQuestions) improvements.push(`Answer all ${totalQuestions} questions to maximize your evaluation rating.`);
  if (avgWordsPerAnswer < 35) improvements.push('Expand your answers with specific metrics, project outcomes, and concrete trade-offs.');
  if (structuralKeywordsCount < 3) improvements.push('Apply the STAR framework (Situation, Task, Action, Result) more consistently.');
  if (technicalKeywordsCount < 3 && interviewType === 'technical') improvements.push('Incorporate deeper algorithmic complexity (Big-O) and architectural trade-offs.');
  if (improvements.length === 0) improvements.push('Continue refining concise time-management under rapid-fire questions.');

  // Generate Qualitative Summary Feedback
  let feedback = '';
  if (overallScore >= 80) {
    feedback = `Outstanding performance on the ${interviewType.toUpperCase()} track! You demonstrated clear articulation, structured problem-solving, and solid domain expertise. Review the few minor optimization pointers below to polish your delivery for final on-site hiring loops.`;
  } else if (overallScore >= 60) {
    feedback = `Solid effort on your ${interviewType.toUpperCase()} mock interview. Your fundamentals are evident, though several responses would benefit from deeper elaboration, quantified project impacts, and sharper structural framing.`;
  } else {
    feedback = `Good initial practice session. To substantially elevate your score, aim to answer all questions comprehensively and structure your responses with real-world project examples and measurable outcomes.`;
  }

  return {
    overallScore,
    communicationScore,
    technicalScore,
    confidenceScore,
    strengths,
    improvements,
    feedback,
    questionScores
  };
}
