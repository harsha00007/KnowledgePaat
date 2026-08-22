import { parseCSV } from '../lib/import/csvParser';
import { validateImportRows } from '../lib/import/questionValidator';
import { ImportDefaults } from '../lib/import/types';

console.log("=================================================");
console.log("TESTING MCQ ASSESSMENT & VALIDATION SYSTEM");
console.log("=================================================");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

const mockCategories = [
  { id: 'cat-python', name: 'Python' },
  { id: 'cat-sql', name: 'SQL' },
  { id: 'cat-web', name: 'Web Development' }
];

const defaults: ImportDefaults = {
  defaultCategoryId: 'cat-python',
  defaultCategoryName: 'Python',
  defaultDifficulty: 'Medium',
  defaultMinimumPlan: 'free',
  defaultStatus: 'Active',
  defaultEstimatedTime: '2 mins'
};

async function runTests() {
  // Test 1: Valid MCQ CSV with 4 options and correct option
  const validCsv = `title,category,difficulty,question_type,option_a,option_b,option_c,option_d,correct_option,explanation,estimated_time
"What is the output of [x**2 for x in range(5) if x % 2 == 0]?","Python","Easy","mcq","[1, 9]","[0, 4, 16]","[0, 1, 4, 9, 16]","[4, 16]","B","Even numbers are 0, 2, 4 and their squares are 0, 4, 16.","2 mins"
"Which clause filters groups in SQL?","SQL","Medium","mcq","WHERE","ORDER BY","HAVING","FILTER","C","HAVING filters groups after GROUP BY.","2 mins"`;

  const parseRes = await parseCSV(validCsv, 'sample.csv', validCsv.length);
  assert(parseRes.rows.length === 2, `Parsed 2 raw rows, got ${parseRes.rows.length}`);

  const validationRes = validateImportRows(parseRes.rows, mockCategories, new Set(), defaults);
  assert(validationRes.validCount === 2, `Expected 2 valid rows, got ${validationRes.validCount}`);
  assert(validationRes.validatedRows[0].question_type === 'mcq', "Row 1 is marked as mcq");
  assert(validationRes.validatedRows[0].option_a === '[1, 9]', "Row 1 option_a parsed correctly");
  assert(validationRes.validatedRows[0].correct_option === 'B', "Row 1 correct_option parsed as B");
  assert(validationRes.validatedRows[0].explanation?.includes('Even numbers') ?? false, "Row 1 explanation parsed correctly");

  // Test 2: Invalid MCQ (missing option_d and invalid correct_option)
  const invalidCsv = `title,category,difficulty,question_type,option_a,option_b,option_c,option_d,correct_option,explanation
"Incomplete question","Python","Easy","mcq","Opt A","Opt B","Opt C","","Z","Missing explanation"`;

  const invalidParse = await parseCSV(invalidCsv, 'invalid.csv', invalidCsv.length);
  const invalidVal = validateImportRows(invalidParse.rows, mockCategories, new Set(), defaults);
  assert(invalidVal.errorCount === 1, `Invalid MCQ rejected with error, got ${invalidVal.errorCount} errors`);
  const errorRow = invalidVal.validatedRows[0];
  assert(errorRow.errors.some(e => e.includes('Option D') || e.includes('Correct Option')), "Error includes missing Option D or invalid Correct Option");

  // Test 3: Duplicate options validation
  const duplicateCsv = `title,category,difficulty,question_type,option_a,option_b,option_c,option_d,correct_option,explanation
"Duplicate options question","Python","Easy","mcq","Same Option","Same Option","Unique C","Unique D","A","Explanation"`;

  const dupParse = await parseCSV(duplicateCsv, 'dup.csv', duplicateCsv.length);
  const dupVal = validateImportRows(dupParse.rows, mockCategories, new Set(), defaults);
  assert(dupVal.errorCount === 1, "Duplicate MCQ options caught by validator");

  // Test 4: Descriptive question backward compatibility
  const descriptiveCsv = `title,category,difficulty,question_type,answer,tips
"Explain Virtual DOM in React","Web Development","Medium","descriptive","Virtual DOM is an in-memory representation...","Compare with real DOM"`;

  const descParse = await parseCSV(descriptiveCsv, 'desc.csv', descriptiveCsv.length);
  const descVal = validateImportRows(descParse.rows, mockCategories, new Set(), defaults);
  assert(descVal.validCount === 1, "1 valid descriptive row found");
  assert(descVal.validatedRows[0].question_type === 'descriptive' || descVal.validatedRows[0].question_type === 'normal', "Question type is normal/descriptive");

  // Test 5: Score Calculation Simulation
  const mockSubmission = [
    { selected: 'B', correct: 'B' }, // Correct
    { selected: 'C', correct: 'C' }, // Correct
    { selected: 'A', correct: 'B' }, // Incorrect
    { selected: 'D', correct: 'D' }, // Correct
    { selected: 'skipped', correct: 'A' }, // Skipped
  ];

  const scoreCount = mockSubmission.filter(s => s.selected.toUpperCase() === s.correct.toUpperCase()).length;
  const scorePercent = Math.round((scoreCount / mockSubmission.length) * 100);
  assert(scoreCount === 3, `Expected 3 correct answers, got ${scoreCount}`);
  assert(scorePercent === 60, `Expected 60% score, got ${scorePercent}%`);
  assert(scorePercent < 70, "60% is below the 70% passing threshold");

  console.log("=================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
