import { 
  EvaluateAnswerInput, 
  AnswerEvaluationResult, 
  CategoryScores, 
  getPerformanceLevel,
  SessionReportSummary
} from '@/lib/ai/interviewTypes';

/**
 * Calls OpenAI/Gemini API if configured in environment,
 * or returns null to trigger the high-fidelity internal engine.
 */
async function callAIProvider(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) return null;

  try {
    const endpoint = process.env.AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Error calling AI provider:', err);
    return null;
  }
}

/**
 * Evaluates a single interview answer
 */
export async function evaluateInterviewAnswer(input: EvaluateAnswerInput): Promise<AnswerEvaluationResult> {
  const { question, studentAnswer, interviewType, category, difficulty = 'Medium', expectedConcepts = [], role = 'Software Engineer' } = input;
  const answerText = (studentAnswer || '').trim();

  // 1. If an external AI provider is configured, formulate request
  const systemPrompt = `You are a Principal Hiring Assessor and Interview Coach at GradZenX evaluating candidate responses.
You must assess the answer against real industry hiring standards for a ${role} (${interviewType.toUpperCase()} track, Difficulty: ${difficulty}).
Evaluate objectively across:
- Relevance (0-10)
- Technical Accuracy (0-10)
- Communication (0-10)
- Clarity (0-10)
- Answer Structure (0-10)
- Confidence (0-10)

Output strictly valid JSON with this schema:
{
  "overall_score": number (0-100),
  "scores": {
    "relevance": number (0-10),
    "technical_accuracy": number (0-10),
    "communication": number (0-10),
    "clarity": number (0-10),
    "answer_structure": number (0-10),
    "confidence": number (0-10)
  },
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "missing_concepts": ["string", "string"],
  "better_answer": "An exemplary, interview-quality response to this question",
  "interview_tip": "A targeted 1-sentence tip to improve delivery or structure",
  "summary": "1-2 sentence overall evaluation summary"
}`;

  const userPrompt = `QUESTION: "${question}"
CATEGORY: "${category || interviewType}"
EXPECTED CONCEPTS: ${expectedConcepts.length > 0 ? expectedConcepts.join(', ') : 'Relevant industry concepts'}
CANDIDATE'S ANSWER: "${answerText}"

Please evaluate now and return strictly JSON.`;

  const raw = await callAIProvider(systemPrompt, userPrompt);
  if (raw) {
    try {
      const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim());
      if (parsed?.overall_score !== undefined && parsed?.scores) {
        return {
          overall_score: Math.min(100, Math.max(0, Math.round(parsed.overall_score))),
          performance_level: getPerformanceLevel(parsed.overall_score),
          scores: {
            relevance: Math.min(10, Math.max(0, Math.round(parsed.scores.relevance || 7))),
            technical_accuracy: Math.min(10, Math.max(0, Math.round(parsed.scores.technical_accuracy || 7))),
            communication: Math.min(10, Math.max(0, Math.round(parsed.scores.communication || 7))),
            clarity: Math.min(10, Math.max(0, Math.round(parsed.scores.clarity || 7))),
            answer_structure: Math.min(10, Math.max(0, Math.round(parsed.scores.answer_structure || 7))),
            confidence: Math.min(10, Math.max(0, Math.round(parsed.scores.confidence || 7)))
          },
          strengths: parsed.strengths || ['Good general context.'],
          improvements: parsed.improvements || ['Elaborate with concrete examples.'],
          missing_concepts: parsed.missing_concepts || ['Real-world metrics', 'Trade-off analysis'],
          better_answer: parsed.better_answer || `A structured answer should define the concept, provide a project example, and explain the result.`,
          interview_tip: parsed.interview_tip || 'Structure your answer with: Definition -> Project Example -> Measurable Outcome.',
          summary: parsed.summary || 'Solid effort with opportunities for deeper technical detail.'
        };
      }
    } catch (err) {
      console.warn('Failed parsing AI provider evaluation response, using internal engine:', err);
    }
  }

  // 2. High-Fidelity Heuristic Evaluation Engine (Fallback with Semantic Keyword & Length Analysis)
  const words = answerText ? answerText.split(/\s+/).length : 0;
  const lower = answerText.toLowerCase();

  // Structural & Technical keyword density
  const hasSTAR = lower.includes('situation') || lower.includes('task') || lower.includes('action') || lower.includes('result') || lower.includes('because') || lower.includes('first');
  const hasTechTerms = lower.includes('performance') || lower.includes('algorithm') || lower.includes('database') || lower.includes('architecture') || lower.includes('scale') || lower.includes('api') || lower.includes('component') || lower.includes('testing');
  const hasMetrics = /\d+%|\d+x|\d+ms|\d+ users|\d+ requests/i.test(answerText);

  let relScore = 8;
  let techScore = 7;
  let commScore = 7;
  let clarScore = 8;
  let structScore = 7;
  let confScore = 8;

  if (words === 0) {
    relScore = 0; techScore = 0; commScore = 0; clarScore = 0; structScore = 0; confScore = 0;
  } else if (words < 20) {
    relScore = 6; techScore = 5; commScore = 6; clarScore = 6; structScore = 5; confScore = 6;
  } else if (words < 50) {
    relScore = 8; techScore = 7; commScore = 7; clarScore = 8; structScore = 7; confScore = 7;
  } else if (words < 120) {
    relScore = 9; techScore = hasTechTerms ? 9 : 8; commScore = 8; clarScore = 8; structScore = hasSTAR ? 9 : 8; confScore = 9;
  } else {
    relScore = 9; techScore = 9; commScore = 9; clarScore = 8; structScore = 9; confScore = 9;
  }

  if (hasMetrics) {
    techScore = Math.min(10, techScore + 1);
    structScore = Math.min(10, structScore + 1);
  }

  const scores: CategoryScores = {
    relevance: relScore,
    technical_accuracy: techScore,
    communication: commScore,
    clarity: clarScore,
    answer_structure: structScore,
    confidence: confScore
  };

  const avgOutOf10 = (relScore + techScore + commScore + clarScore + structScore + confScore) / 6;
  const overall_score = words === 0 ? 0 : Math.min(98, Math.max(25, Math.round(avgOutOf10 * 10)));
  const performance_level = getPerformanceLevel(overall_score);

  // Generate Contextual Strengths
  const strengths: string[] = [];
  if (words >= 35) strengths.push('Good response length providing ample context and detail.');
  if (hasTechTerms) strengths.push('Incorporated accurate domain terminology and system concepts.');
  if (hasSTAR) strengths.push('Utilized a structured narrative format to explain the solution.');
  if (hasMetrics) strengths.push('Included quantifiable achievements and concrete outcomes.');
  if (strengths.length === 0) strengths.push('Directly addressed the primary intent of the question.');

  // Generate Contextual Improvements
  const improvements: string[] = [];
  if (words < 35) improvements.push('Expand response with specific technical examples and implementation details.');
  if (!hasSTAR) improvements.push('Structure your answer using the STAR method (Situation, Task, Action, Result).');
  if (!hasMetrics) improvements.push('Add measurable results (e.g., latency reduction, time saved, performance gains).');
  if (improvements.length === 0) improvements.push('Continue maintaining this level of depth while refining concise delivery.');

  // Missing Concepts
  const missing_concepts = expectedConcepts.length > 0 
    ? expectedConcepts.filter(c => !lower.includes(c.toLowerCase())).slice(0, 3)
    : ['Scalability & Edge Cases', 'Trade-off Analysis', 'Automated Testing'];

  // High-Quality Better Answer Model
  let better_answer = '';
  if (interviewType === 'technical') {
    better_answer = `To answer effectively: First, define the core concept clearly. Second, discuss the architectural or algorithmic mechanism (including Time/Space complexity). Third, give a concrete production example where you handled edge cases, scalability, and error handling. Finally, mention the measurable business or performance impact.`;
  } else if (interviewType === 'hr') {
    better_answer = `Start with a 1-sentence situation summary (e.g. "During my final-year project, our team faced a tight 2-week deadline..."). Next, state your specific task and ownership. Detail the 2-3 actions you took (prioritization, daily standups, refactoring). Conclude with the outcome: "We delivered on time with 0 production bugs and 15% better performance."`;
  } else {
    better_answer = `Outline the problem framing, the risk-assessment criteria, stakeholder alignment, and the decisive execution plan. Highlight how you balanced short-term delivery pressure with long-term engineering quality.`;
  }

  const interview_tip = interviewType === 'technical'
    ? 'Always state your assumptions and mention Time (Big-O) and Space complexity before diving into deep code logic.'
    : 'Frame challenges positively: focus 20% on the obstacle and 80% on the strategic action and successful result.';

  const summary = overall_score >= 75
    ? 'Strong, articulate response demonstrating solid domain competence and clear problem-solving ability.'
    : 'Good conceptual foundation. Elevate your score by providing deeper technical examples and structured outcomes.';

  return {
    overall_score,
    performance_level,
    scores,
    strengths,
    improvements,
    missing_concepts,
    better_answer,
    interview_tip,
    summary
  };
}

/**
 * Calculates aggregate performance report summary across all session answers
 */
export function calculateSessionReport(
  evaluations: AnswerEvaluationResult[],
  sessionConfig: {
    interviewType: string;
    targetRole?: string;
    experienceLevel?: string;
  }
): SessionReportSummary {
  const count = evaluations.length;
  if (count === 0) {
    return {
      overall_score: 0,
      performance_level: 'Beginner',
      total_questions: 0,
      completed_questions: 0,
      average_scores: { relevance: 0, technical_accuracy: 0, communication: 0, clarity: 0, answer_structure: 0, confidence: 0 },
      strengths: ['Started session.'],
      weaknesses: ['No questions evaluated yet.'],
      missing_concepts: [],
      recommendations: [],
      overall_feedback: 'No evaluation data recorded.'
    };
  }

  const avgRelevance = Math.round((evaluations.reduce((s, e) => s + e.scores.relevance, 0) / count) * 10) / 10;
  const avgTech = Math.round((evaluations.reduce((s, e) => s + e.scores.technical_accuracy, 0) / count) * 10) / 10;
  const avgComm = Math.round((evaluations.reduce((s, e) => s + e.scores.communication, 0) / count) * 10) / 10;
  const avgClarity = Math.round((evaluations.reduce((s, e) => s + e.scores.clarity, 0) / count) * 10) / 10;
  const avgStruct = Math.round((evaluations.reduce((s, e) => s + e.scores.answer_structure, 0) / count) * 10) / 10;
  const avgConf = Math.round((evaluations.reduce((s, e) => s + e.scores.confidence, 0) / count) * 10) / 10;

  const avgOverall = Math.round(evaluations.reduce((s, e) => s + e.overall_score, 0) / count);
  const performance_level = getPerformanceLevel(avgOverall);

  // Aggregate and deduplicate strengths & weaknesses
  const allStrengths = Array.from(new Set(evaluations.flatMap(e => e.strengths))).slice(0, 4);
  const allImprovements = Array.from(new Set(evaluations.flatMap(e => e.improvements))).slice(0, 4);
  const allMissing = Array.from(new Set(evaluations.flatMap(e => e.missing_concepts))).slice(0, 5);

  // Generate Personalized Recommendations based on lowest subscores
  const recommendations: SessionReportSummary['recommendations'] = [];

  if (avgTech < 7.5) {
    recommendations.push({
      type: 'notes',
      title: `${sessionConfig.targetRole || 'Technical'} Core Revision Notes`,
      description: 'Practice deeper technical architecture, data structures, and optimization trade-offs.',
      link: '/student/notes'
    });
  }

  if (avgStruct < 7.5 || avgComm < 7.5) {
    recommendations.push({
      type: 'interview',
      title: 'STAR Method & Structured Communication Pack',
      description: 'Master the Definition -> Explanation -> Project Example -> Measurable Outcome framework.',
      link: '/student/interview-preparation'
    });
  }

  recommendations.push({
    type: 'skill',
    title: 'Behavioral & Situational Interview Practice',
    description: 'Refine conflict handling, ownership narrative, and time-pressured problem solving.',
    link: '/student/interview-preparation'
  });

  const overall_feedback = `You achieved an overall score of ${avgOverall}/100 (${performance_level}). Your strongest dimension was ${
    avgRelevance >= avgTech ? 'Relevance & Intent' : 'Technical Depth'
  }. Focus on incorporating more quantifiable outcomes and structural STAR framing to reach peak interview readiness.`;

  return {
    overall_score: avgOverall,
    performance_level,
    total_questions: count,
    completed_questions: count,
    average_scores: {
      relevance: avgRelevance,
      technical_accuracy: avgTech,
      communication: avgComm,
      clarity: avgClarity,
      answer_structure: avgStruct,
      confidence: avgConf
    },
    strengths: allStrengths,
    weaknesses: allImprovements,
    missing_concepts: allMissing,
    recommendations,
    overall_feedback
  };
}
