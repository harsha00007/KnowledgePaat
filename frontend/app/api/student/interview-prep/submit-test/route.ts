import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface QuestionAnswerSubmission {
  questionId: string;
  selectedOption: string; // 'A' | 'B' | 'C' | 'D' or 'mastered' | 'review' | 'skipped'
  timeSpentSeconds?: number;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated student user (or demo fallback)
    const { data: { user } } = await supabase.auth.getUser();
    let studentId = user?.id;

    if (!studentId) {
      // In guest or testing mode, fetch the first student profile or use a fallback
      const { data: fallbackUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .limit(1)
        .maybeSingle();

      studentId = fallbackUser?.id || '00000000-0000-0000-0000-000000000000';
    }

    const body = await req.json();
    const {
      testConfigId,
      title,
      mode = 'timed_test',
      difficulty = 'Medium',
      categoryId = null,
      timeSpentSeconds = 0,
      answers = []
    } = body as {
      testConfigId?: string;
      title: string;
      mode: string;
      difficulty: string;
      categoryId?: string | null;
      timeSpentSeconds: number;
      answers: QuestionAnswerSubmission[];
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'No answers provided for evaluation.' }, { status: 400 });
    }

    // 2. Fetch the actual questions from DB to evaluate server-side
    const questionIds = answers.map(a => a.questionId);
    const { data: dbQuestions, error: fetchErr } = await supabase
      .from('interview_questions')
      .select(`
        id,
        category_id,
        title,
        question_type,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        correct_option_index,
        explanation,
        answer,
        tips,
        common_mistakes,
        difficulty,
        interview_categories(name)
      `)
      .in('id', questionIds);

    if (fetchErr) {
      console.error("Error fetching questions for evaluation:", fetchErr);
    }

    const dbMap = new Map<string, any>();
    (dbQuestions || []).forEach((q: any) => {
      dbMap.set(q.id, q);
    });

    // 3. Evaluate answers securely
    let correctCount = 0;
    const totalCount = answers.length;
    const topicStats: Record<string, { name: string; total: number; correct: number }> = {};
    const questionReviews: any[] = [];

    answers.forEach((ans, idx) => {
      const q = dbMap.get(ans.questionId);
      const catName = q?.interview_categories?.name || 'General';
      const catId = q?.category_id || 'unknown';

      if (!topicStats[catId]) {
        topicStats[catId] = { name: catName, total: 0, correct: 0 };
      }
      topicStats[catId].total += 1;

      let isCorrect = false;
      const cleanSelected = (ans.selectedOption || '').toUpperCase().trim();
      const cleanCorrect = (q?.correct_option || '').toUpperCase().trim();

      if (q?.question_type === 'mcq' || q?.option_a) {
        // MCQ Evaluation
        if (cleanSelected && cleanCorrect && cleanSelected === cleanCorrect) {
          isCorrect = true;
          correctCount++;
          topicStats[catId].correct += 1;
        } else if (cleanSelected && cleanCorrect && cleanSelected === (cleanCorrect === 'A' ? '1' : cleanCorrect === 'B' ? '2' : cleanCorrect === 'C' ? '3' : '4')) {
          isCorrect = true;
          correctCount++;
          topicStats[catId].correct += 1;
        }
      } else {
        // Descriptive Evaluation
        if (ans.selectedOption === 'mastered') {
          isCorrect = true;
          correctCount++;
          topicStats[catId].correct += 1;
        }
      }

      // Get option text for user and correct answer
      let userOptionText = '';
      if (cleanSelected === 'A') userOptionText = q?.option_a || 'Option A';
      else if (cleanSelected === 'B') userOptionText = q?.option_b || 'Option B';
      else if (cleanSelected === 'C') userOptionText = q?.option_c || 'Option C';
      else if (cleanSelected === 'D') userOptionText = q?.option_d || 'Option D';
      else userOptionText = ans.selectedOption || 'Skipped';

      let correctOptionText = '';
      if (cleanCorrect === 'A') correctOptionText = q?.option_a || 'Option A';
      else if (cleanCorrect === 'B') correctOptionText = q?.option_b || 'Option B';
      else if (cleanCorrect === 'C') correctOptionText = q?.option_c || 'Option C';
      else if (cleanCorrect === 'D') correctOptionText = q?.option_d || 'Option D';
      else correctOptionText = q?.answer || 'Correct Answer';

      questionReviews.push({
        questionIndex: idx + 1,
        questionId: ans.questionId,
        title: q?.title || `Question ${idx + 1}`,
        question_type: q?.question_type || 'mcq',
        difficulty: q?.difficulty || difficulty,
        categoryName: catName,
        option_a: q?.option_a || null,
        option_b: q?.option_b || null,
        option_c: q?.option_c || null,
        option_d: q?.option_d || null,
        userSelectedOption: cleanSelected || 'Skipped',
        userSelectedText: userOptionText,
        correctOption: cleanCorrect,
        correctOptionText: correctOptionText,
        isCorrect,
        explanation: q?.explanation || q?.answer || 'Review the core concept to solidify understanding.',
        tips: q?.tips || null,
        common_mistakes: q?.common_mistakes || null,
        timeSpentSeconds: ans.timeSpentSeconds || 0
      });
    });

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const isPassed = scorePercentage >= 70;

    // Build Topic Breakdown
    const topicBreakdown = Object.entries(topicStats).map(([id, stat]) => ({
      categoryId: id,
      categoryName: stat.name,
      total: stat.total,
      correct: stat.correct,
      percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
    }));

    // 4. Save Attempt to student_test_attempts table
    let attemptId = crypto.randomUUID();
    try {
      const { data: savedAttempt, error: saveErr } = await supabase
        .from('student_test_attempts')
        .insert({
          id: attemptId,
          student_id: studentId,
          test_config_id: testConfigId || null,
          category_id: categoryId || null,
          title: title || 'Interview Assessment Test',
          mode: mode,
          difficulty: difficulty,
          total_questions: totalCount,
          correct_answers: correctCount,
          score_percentage: scorePercentage,
          time_spent_seconds: timeSpentSeconds,
          status: 'completed',
          answers_payload: {
            scorePercentage,
            correctCount,
            totalCount,
            timeSpentSeconds,
            topicBreakdown,
            questionReviews
          }
        })
        .select('id')
        .maybeSingle();

      if (savedAttempt) {
        attemptId = savedAttempt.id;
      }
      if (saveErr) {
        console.warn("Could not persist student_test_attempt:", saveErr.message);
      }
    } catch (saveException) {
      console.warn("Exception saving test attempt:", saveException);
    }

    return NextResponse.json({
      success: true,
      attemptId,
      title,
      mode,
      difficulty,
      scorePercentage,
      correctCount,
      incorrectCount: totalCount - correctCount,
      totalCount,
      timeSpentSeconds,
      isPassed,
      topicBreakdown,
      questionReviews
    });

  } catch (err: any) {
    console.error("Fatal error in test submission API:", err);
    return NextResponse.json({
      error: err.message || 'An unexpected error occurred during test evaluation.'
    }, { status: 500 });
  }
}
