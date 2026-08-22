import { validateImportRows, CategoryOption } from '../lib/import/questionValidator';
import { RawImportRow, ImportDefaults } from '../lib/import/types';

function runTests() {
  console.log("=================================================");
  console.log("GRADZENX: NORMAL VS MCQ SEPARATION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const mockCategories: CategoryOption[] = [
    { id: "cat-1", name: "Databases" },
    { id: "cat-2", name: "Data Structures" },
    { id: "cat-3", name: "OOP" },
    { id: "cat-4", name: "Networking" },
    { id: "cat-5", name: "Algorithms" },
    { id: "cat-6", name: "Aptitude" }
  ];

  const defaultSettings: ImportDefaults = {
    defaultCategoryId: "cat-1",
    defaultDifficulty: "Medium",
    defaultMinimumPlan: "free",
    defaultStatus: "Active"
  };

  // 1. Normal Question Validation
  console.log("--- Group 1: Normal Question Validation ---");
  const validNormalRow: RawImportRow = {
    rowNumber: 1,
    title: "Explain the ACID properties in database systems.",
    category: "Databases",
    difficulty: "Medium",
    question_type: "normal",
    answer_type: "long",
    answer: "ACID stands for Atomicity, Consistency, Isolation, and Durability...",
    tips: "Mention real-world examples like bank transfers.",
    common_mistakes: "Confusing isolation with durability.",
    minimum_plan: "free"
  };

  const normalSummary = validateImportRows([validNormalRow], mockCategories, new Set(), defaultSettings);
  assert(normalSummary.validCount === 1, "Valid Normal Question is accepted without option errors");
  assert(normalSummary.validatedRows[0].question_type === 'normal', "Question type correctly recorded as normal");
  assert(normalSummary.validatedRows[0].answer_type === 'long', "Answer type correctly recorded as long");
  assert(normalSummary.validatedRows[0].errors.length === 0, "No errors on valid normal question");

  const invalidNormalRow: RawImportRow = {
    rowNumber: 2,
    title: "What is polymorphism?",
    category: "OOP",
    difficulty: "Easy",
    question_type: "normal",
    answer: "" // Missing answer
  };
  const invalidNormalSummary = validateImportRows([invalidNormalRow], mockCategories, new Set(), defaultSettings);
  assert(invalidNormalSummary.errorCount === 1, "Normal question without ideal answer is rejected");
  assert(invalidNormalSummary.validatedRows[0].errors.some(e => e.includes('Ideal Model Answer')), "Error specifically targets missing model answer");

  // 2. MCQ Question Validation
  console.log("\n--- Group 2: MCQ Question Validation ---");
  const validMcqRow: RawImportRow = {
    rowNumber: 3,
    title: "What is the worst-case time complexity of Merge Sort?",
    category: "Data Structures",
    difficulty: "Medium",
    question_type: "mcq",
    option_a: "O(n^2)",
    option_b: "O(n log n)",
    option_c: "O(n)",
    option_d: "O(log n)",
    correct_option: "B",
    explanation: "Merge sort divides the array in half log n times and merges in linear time O(n)."
  };

  const mcqSummary = validateImportRows([validMcqRow], mockCategories, new Set(), defaultSettings);
  assert(mcqSummary.validCount === 1, "Valid MCQ Question is accepted");
  assert(mcqSummary.validatedRows[0].question_type === 'mcq', "MCQ question type correctly recorded");
  assert(mcqSummary.validatedRows[0].correct_option === 'B', "Correct option B correctly parsed");

  const mcqMissingOpt: RawImportRow = {
    rowNumber: 4,
    title: "Which data structure uses LIFO?",
    category: "Data Structures",
    difficulty: "Easy",
    question_type: "mcq",
    option_a: "Queue",
    option_b: "Stack",
    option_c: "Tree",
    option_d: "", // Missing Option D
    correct_option: "B",
    explanation: "Stack is Last-In-First-Out."
  };
  const mcqMissingSummary = validateImportRows([mcqMissingOpt], mockCategories, new Set(), defaultSettings);
  assert(mcqMissingSummary.errorCount === 1, "MCQ with missing option D is rejected");

  const mcqDuplicateOpts: RawImportRow = {
    rowNumber: 5,
    title: "What is 2 + 2?",
    category: "Aptitude",
    difficulty: "Easy",
    question_type: "mcq",
    option_a: "4",
    option_b: "4", // Duplicate
    option_c: "5",
    option_d: "6",
    correct_option: "A",
    explanation: "2+2=4"
  };
  const mcqDupSummary = validateImportRows([mcqDuplicateOpts], mockCategories, new Set(), defaultSettings);
  assert(mcqDupSummary.errorCount === 1, "MCQ with duplicate choices is rejected");

  const mcqInvalidKey: RawImportRow = {
    rowNumber: 6,
    title: "Which protocol is connection-oriented?",
    category: "Networking",
    difficulty: "Easy",
    question_type: "mcq",
    option_a: "UDP",
    option_b: "TCP",
    option_c: "ICMP",
    option_d: "IP",
    correct_option: "Z", // Invalid key
    explanation: "TCP is connection-oriented."
  };
  const mcqKeySummary = validateImportRows([mcqInvalidKey], mockCategories, new Set(), defaultSettings);
  assert(mcqKeySummary.errorCount === 1, "MCQ with invalid correct_option key 'Z' is rejected");

  // 3. Independent Duplication Signatures
  console.log("\n--- Group 3: Duplicate Signature Separation ---");
  const mixedSameTitleRows: RawImportRow[] = [
    {
      rowNumber: 7,
      title: "Binary Search Tree Complexity",
      category: "Algorithms",
      difficulty: "Medium",
      question_type: "normal",
      answer: "In the average case, searching a BST takes O(log n) time..."
    },
    {
      rowNumber: 8,
      title: "Binary Search Tree Complexity",
      category: "Algorithms",
      difficulty: "Medium",
      question_type: "mcq",
      option_a: "O(1)",
      option_b: "O(log n)",
      option_c: "O(n)",
      option_d: "O(n^2)",
      correct_option: "B",
      explanation: "Average lookup is O(log n)."
    }
  ];

  const mixedSummary = validateImportRows(mixedSameTitleRows, mockCategories, new Set(), defaultSettings);
  assert(mixedSummary.validCount === 2, "Normal and MCQ question with same title do NOT conflict as duplicates");

  const trueDuplicateRows: RawImportRow[] = [
    {
      rowNumber: 9,
      title: "Explain QuickSort",
      category: "Algorithms",
      difficulty: "Hard",
      question_type: "normal",
      answer: "QuickSort is a divide and conquer algorithm..."
    },
    {
      rowNumber: 10,
      title: "Explain QuickSort",
      category: "Algorithms",
      difficulty: "Hard",
      question_type: "normal",
      answer: "QuickSort divides the array around a pivot..."
    }
  ];

  const trueDupSummary = validateImportRows(trueDuplicateRows, mockCategories, new Set(), defaultSettings);
  assert(trueDupSummary.duplicateCount === 1, "Two identical normal questions in same batch are flagged as duplicate");

  // 4. Test Config Pool Filtering Logic
  console.log("\n--- Group 4: Timed Test MCQ Pool Gating ---");
  const mockDbQuestions = [
    { id: "1", title: "Norm 1", category_id: "cat-1", difficulty: "Medium", status: "Active", question_type: "normal", answer: "A" },
    { id: "2", title: "Norm 2", category_id: "cat-1", difficulty: "Medium", status: "Active", question_type: "normal", answer: "B" },
    { id: "3", title: "MCQ 1", category_id: "cat-1", difficulty: "Medium", status: "Active", question_type: "mcq", option_a: "A", option_b: "B", option_c: "C", option_d: "D", correct_option: "A" },
    { id: "4", title: "MCQ 2", category_id: "cat-1", difficulty: "Medium", status: "Active", question_type: "mcq", option_a: "A", option_b: "B", option_c: "C", option_d: "D", correct_option: "B" },
    { id: "5", title: "MCQ Inactive", category_id: "cat-1", difficulty: "Medium", status: "Inactive", question_type: "mcq", option_a: "A", option_b: "B", option_c: "C", option_d: "D", correct_option: "C" }
  ];

  function getTimedPool(catId: string, diff: string, mode: string) {
    let pool = mockDbQuestions.filter(q => q.status === 'Active');
    if (catId) pool = pool.filter(q => q.category_id === catId);
    if (diff && diff !== 'Mixed') pool = pool.filter(q => q.difficulty === diff);
    if (mode === 'timed_test') {
      pool = pool.filter(q => q.question_type === 'mcq' || !!(q.option_a && q.option_b && q.option_c && q.option_d && q.correct_option));
    }
    return pool.length;
  }

  assert(getTimedPool("cat-1", "Medium", "timed_test") === 2, "Timed Test pool strictly filters 2 active MCQs (ignoring 2 normal and 1 inactive MCQ)");

  console.log("\n=================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
