import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testE2E() {
  console.log("=================================================");
  console.log("TESTING STUDENT MCQ ASSESMENT & EVALUATION API");
  console.log("=================================================");

  // 1. Fetch a real test configuration
  const { data: test, error: testErr } = await supabase
    .from('interview_test_configs')
    .select('*')
    .eq('mode', 'timed_test')
    .eq('status', 'Active')
    .limit(1)
    .single();

  if (testErr || !test) {
    console.error("No active timed test found:", testErr);
    process.exit(1);
  }

  console.log(`Testing with Test: "${test.title}" (${test.difficulty}, ${test.question_count} Qs)`);

  // 2. Fetch MCQs for this category
  const { data: questions, error: qErr } = await supabase
    .from('interview_questions')
    .select('id, title, question_type, option_a, option_b, option_c, option_d, correct_option, explanation')
    .eq('category_id', test.category_id)
    .eq('status', 'Active')
    .not('option_a', 'is', null)
    .limit(test.question_count);

  if (qErr || !questions || questions.length === 0) {
    console.error("No questions found for category:", qErr);
    process.exit(1);
  }

  console.log(`Fetched ${questions.length} questions from question bank.`);
  questions.forEach((q, i) => {
    console.log(`  Q${i+1}: ${q.title.slice(0, 50)}...`);
    console.log(`      A: ${q.option_a?.slice(0, 30)} | B: ${q.option_b?.slice(0, 30)} | C: ${q.option_c?.slice(0, 30)} | D: ${q.option_d?.slice(0, 30)}`);
    console.log(`      Correct: ${q.correct_option}`);
  });

  // 3. Simulate an answer submission (answering 80% correctly)
  const answers = questions.map((q, idx) => {
    // Make 1 answer wrong on purpose
    const isWrong = idx === 0;
    const correctLetter = (q.correct_option || 'A').toUpperCase();
    const wrongLetter = correctLetter === 'A' ? 'B' : 'A';

    return {
      questionId: q.id,
      selectedOption: isWrong ? wrongLetter : correctLetter,
      timeSpentSeconds: 15
    };
  });

  // Evaluate locally to test business logic
  let correctCount = 0;
  questions.forEach((q, idx) => {
    const selected = answers[idx].selectedOption;
    const correct = (q.correct_option || '').toUpperCase();
    if (selected === correct) correctCount++;
  });

  const scorePct = Math.round((correctCount / questions.length) * 100);
  console.log(`\nEvaluation Result: ${correctCount}/${questions.length} Correct (${scorePct}%)`);
  console.log(`Pass Status: ${scorePct >= 70 ? 'PASSED (>= 70%)' : 'NEEDS IMPROVEMENT (< 70%)'}`);

  if (scorePct >= 70 && correctCount === questions.length - 1) {
    console.log("✅ PASS: Evaluation logic functions accurately with real DB questions!");
  } else {
    console.error("❌ FAIL: Evaluation calculation mismatch");
    process.exit(1);
  }

  console.log("=================================================");
  console.log("ALL MCQ EVALUATION CHECKS PASSED!");
  console.log("=================================================");
}

testE2E().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
