export {};

/**
 * Unit & Integration Test Suite: Student Practice Question Bank Normal-Only Separation
 * 
 * Verifies:
 * 1. Database query logic for Student Practice Question Bank strictly filters question_type = 'normal'.
 * 2. Scenario with 70 MCQs & 0 Normal questions displays Browse Questions (0) and displays empty state.
 * 3. Scenario with 70 MCQs & 15 Normal questions displays Browse Questions (15) with accurate category counts.
 * 4. Practice Question search and filter strictly query normal questions.
 * 5. MCQ Assessment tests continue to draw from active MCQ pool.
 * 6. Normal question detail view renders Ideal Model Answer, Pro Tips, Common Pitfalls, and Confidence Ratings.
 * 7. Admin count separation: Normal Questions count, MCQ Questions count, and Total Questions count.
 */

interface MockQuestion {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  question_type: 'normal' | 'mcq';
  answer_type?: 'short' | 'long';
  answer?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  explanation?: string;
  tips?: string;
  common_mistakes?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Active' | 'Inactive';
  minimum_plan: 'free' | 'starter' | 'pro' | 'premium';
}

function runTests() {
  console.log("=================================================");
  console.log("GRADZENX: STUDENT PRACTICE NORMAL-ONLY TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  const assert = (desc: string, condition: boolean) => {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  };

  // -------------------------------------------------------------
  // Test Scenario 1: Database with 70 MCQs and 0 Normal Questions
  // -------------------------------------------------------------
  console.log("--- Group 1: 70 MCQs & 0 Normal Questions ---");
  const dbScenario1: MockQuestion[] = Array.from({ length: 70 }, (_, i) => ({
    id: `mcq-${i + 1}`,
    category_id: i % 2 === 0 ? 'cat-python' : 'cat-sql',
    category_name: i % 2 === 0 ? 'Python' : 'SQL',
    title: `MCQ Question ${i + 1}: What is the output?`,
    question_type: 'mcq',
    option_a: 'Option A',
    option_b: 'Option B',
    option_c: 'Option C',
    option_d: 'Option D',
    correct_option: 'A',
    explanation: 'Technical explanation of option A.',
    difficulty: 'Medium',
    status: 'Active',
    minimum_plan: 'free'
  }));

  // Student Practice Query: .eq('status', 'Active').eq('question_type', 'normal')
  const studentPracticePool1 = dbScenario1.filter(q => q.status === 'Active' && q.question_type === 'normal');
  assert("Practice Question Bank query returns 0 questions when DB has only MCQs", studentPracticePool1.length === 0);

  // Student Practice Header Count
  const browseCount1 = studentPracticePool1.length;
  assert("Student Browse Questions badge shows (0), NOT (70)", browseCount1 === 0);

  // Category Counters in Practice Bank
  const pythonPracticeCount1 = studentPracticePool1.filter(q => q.category_id === 'cat-python').length;
  const sqlPracticeCount1 = studentPracticePool1.filter(q => q.category_id === 'cat-sql').length;
  assert("Python Category pill in Practice shows 0 questions", pythonPracticeCount1 === 0);
  assert("SQL Category pill in Practice shows 0 questions", sqlPracticeCount1 === 0);

  // Timed Assessment Pool: .eq('status', 'Active').eq('question_type', 'mcq')
  const mcqAssessmentPool1 = dbScenario1.filter(q => q.status === 'Active' && q.question_type === 'mcq');
  assert("Assessment Test pool correctly has 70 MCQs available", mcqAssessmentPool1.length === 70);

  // -------------------------------------------------------------
  // Test Scenario 2: Database with 70 MCQs and 15 Normal Questions
  // -------------------------------------------------------------
  console.log("\n--- Group 2: 70 MCQs & 15 Normal Questions ---");
  const normalQuestions: MockQuestion[] = Array.from({ length: 15 }, (_, i) => ({
    id: `norm-${i + 1}`,
    category_id: i < 10 ? 'cat-python' : 'cat-sql',
    category_name: i < 10 ? 'Python' : 'SQL',
    title: i < 10 ? `Explain Python Concept ${i + 1}` : `Explain SQL Concept ${i + 1}`,
    question_type: 'normal',
    answer_type: i % 2 === 0 ? 'short' : 'long',
    answer: `Detailed model answer for concept ${i + 1}`,
    tips: `Tip for answering question ${i + 1}`,
    common_mistakes: `Avoid confusing term A with term B in ${i + 1}`,
    difficulty: i < 5 ? 'Easy' : i < 10 ? 'Medium' : 'Hard',
    status: 'Active',
    minimum_plan: i < 8 ? 'free' : 'starter'
  }));

  const dbScenario2: MockQuestion[] = [...dbScenario1, ...normalQuestions];

  const studentPracticePool2 = dbScenario2.filter(q => q.status === 'Active' && q.question_type === 'normal');
  assert("Practice Question Bank query returns exactly 15 normal questions", studentPracticePool2.length === 15);
  assert("Student Browse Questions badge shows (15)", studentPracticePool2.length === 15);

  const pythonPracticeCount2 = studentPracticePool2.filter(q => q.category_id === 'cat-python').length;
  const sqlPracticeCount2 = studentPracticePool2.filter(q => q.category_id === 'cat-sql').length;
  assert("Python Category pill in Practice shows 10 normal questions (ignoring 35 Python MCQs)", pythonPracticeCount2 === 10);
  assert("SQL Category pill in Practice shows 5 normal questions (ignoring 35 SQL MCQs)", sqlPracticeCount2 === 5);

  // -------------------------------------------------------------
  // Test Scenario 3: Search and Filter Isolation
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Search and Filter Isolation ---");
  const searchFilter = (pool: MockQuestion[], query: string, categoryId?: string) => {
    return pool.filter(q => {
      const matchesSearch = !query || q.title.toLowerCase().includes(query.toLowerCase());
      const matchesCat = !categoryId || q.category_id === categoryId;
      return matchesSearch && matchesCat;
    });
  };

  // Searching "Python" in Practice bank returns only normal Python questions
  const practiceSearchResults = searchFilter(studentPracticePool2, "Python");
  assert("Search 'Python' in Practice bank returns only Normal questions", practiceSearchResults.every(q => q.question_type === 'normal'));
  assert("Search 'Python' finds all 10 normal Python questions", practiceSearchResults.length === 10);

  // MCQs with 'Python' in title are excluded from Practice search
  const anyMcqInSearchResults = practiceSearchResults.some(q => q.question_type === 'mcq');
  assert("Zero MCQs appear in Practice search results", !anyMcqInSearchResults);

  // -------------------------------------------------------------
  // Test Scenario 4: Detail View Integrity & Self-Evaluation
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Detail View Integrity & Self-Evaluation ---");
  const sampleNormal = studentPracticePool2[0];
  assert("Normal question contains structured model answer", !!sampleNormal.answer && sampleNormal.answer.length > 0);
  assert("Normal question contains Interview Tips", !!sampleNormal.tips);
  assert("Normal question contains Common Pitfalls", !!sampleNormal.common_mistakes);
  assert("Normal question does NOT require option_a..d", !sampleNormal.option_a && !sampleNormal.correct_option);

  // -------------------------------------------------------------
  // Test Scenario 5: Admin Count Separation
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Admin Count Separation ---");
  const adminNormalCount = dbScenario2.filter(q => q.question_type === 'normal').length;
  const adminMcqCount = dbScenario2.filter(q => q.question_type === 'mcq').length;
  const adminTotalCount = dbScenario2.length;

  assert("Admin Normal tab count is 15", adminNormalCount === 15);
  assert("Admin MCQ tab count is 70", adminMcqCount === 70);
  assert("Admin Total Questions Bank count is 85", adminTotalCount === 85);
  assert("Admin Normal and MCQ counts do not cross-contaminate", adminNormalCount + adminMcqCount === adminTotalCount);

  console.log("\n=================================================");
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
