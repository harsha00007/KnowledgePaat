import { calculateUserAccess, isContentAccessible } from '../lib/subscription';
import { normalizePlanId } from '../config/plans';

console.log("=================================================");
console.log("RUNNING INTERVIEW PREPARATION ADMIN CONTROL SUITE");
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

// 1. Test Subscription Access for Interview Tests
const freeAccess = calculateUserAccess({ plan: 'free', status: 'active' });
const starterAccess = calculateUserAccess({ plan: 'starter', status: 'active' });
const proAccess = calculateUserAccess({ plan: 'pro', status: 'active' });
const premiumAccess = calculateUserAccess({ plan: 'premium', status: 'active' });

assert(isContentAccessible('free', freeAccess) === true, "Free student can access Free tests");
assert(isContentAccessible('starter', freeAccess) === false, "Free student cannot access Starter tests");
assert(isContentAccessible('starter', starterAccess) === true, "Starter student can access Starter tests");
assert(isContentAccessible('pro', starterAccess) === false, "Starter student cannot access Pro tests");
assert(isContentAccessible('pro', proAccess) === true, "Pro student can access Pro tests");
assert(isContentAccessible('premium', proAccess) === false, "Pro student cannot access Premium AI tests");
assert(isContentAccessible('premium', premiumAccess) === true, "Premium student can access Premium AI tests");

// 2. Test Question Pool Validation Logic
interface MockQuestion {
  id: string;
  category_id: string;
  difficulty: string;
  status: string;
}

const mockQuestions: MockQuestion[] = [
  { id: '1', category_id: 'cat-1', difficulty: 'Easy', status: 'Active' },
  { id: '2', category_id: 'cat-1', difficulty: 'Medium', status: 'Active' },
  { id: '3', category_id: 'cat-1', difficulty: 'Medium', status: 'Active' },
  { id: '4', category_id: 'cat-1', difficulty: 'Hard', status: 'Inactive' },
  { id: '5', category_id: 'cat-2', difficulty: 'Medium', status: 'Active' }
];

function calculatePoolCount(questions: MockQuestion[], catId?: string | null, diff?: string) {
  let pool = questions.filter(q => q.status === 'Active');
  if (catId) pool = pool.filter(q => q.category_id === catId);
  if (diff && diff !== 'Mixed' && diff !== 'Adaptive') {
    pool = pool.filter(q => q.difficulty.toLowerCase() === diff.toLowerCase());
  }
  return pool.length;
}

const cat1MediumPool = calculatePoolCount(mockQuestions, 'cat-1', 'Medium');
assert(cat1MediumPool === 2, `Category 1 Medium active pool is 2 (got ${cat1MediumPool})`);

const cat1HardPool = calculatePoolCount(mockQuestions, 'cat-1', 'Hard');
assert(cat1HardPool === 0, `Category 1 Hard active pool is 0 because question 4 is Inactive (got ${cat1HardPool})`);

const allMixedPool = calculatePoolCount(mockQuestions, null, 'Mixed');
assert(allMixedPool === 4, `All Mixed active pool is 4 (got ${allMixedPool})`);

// 3. Test The 10 Sample Configurations Specifications
interface SampleTest {
  title: string;
  category: string;
  mode: string;
  difficulty: string;
  question_count: number;
  time_per_question: number;
  minimum_plan: string;
  is_recommended: boolean;
  status: string;
}

const SAMPLE_TESTS: SampleTest[] = [
  { title: 'Python Fundamentals Assessment', category: 'Python', mode: 'timed_test', difficulty: 'Easy', question_count: 5, time_per_question: 60, minimum_plan: 'free', is_recommended: true, status: 'Active' },
  { title: 'SQL Interview Essentials', category: 'SQL', mode: 'timed_test', difficulty: 'Medium', question_count: 5, time_per_question: 60, minimum_plan: 'starter', is_recommended: true, status: 'Active' },
  { title: 'DSA Core Assessment', category: 'DSA', mode: 'timed_test', difficulty: 'Medium', question_count: 5, time_per_question: 60, minimum_plan: 'starter', is_recommended: true, status: 'Active' },
  { title: 'Web Development Fundamentals', category: 'Web Development', mode: 'timed_test', difficulty: 'Easy', question_count: 5, time_per_question: 60, minimum_plan: 'free', is_recommended: false, status: 'Active' },
  { title: 'OOP Interview Practice', category: 'OOP', mode: 'practice', difficulty: 'Medium', question_count: 5, time_per_question: 60, minimum_plan: 'free', is_recommended: true, status: 'Active' },
  { title: 'Operating Systems Assessment', category: 'Operating Systems', mode: 'timed_test', difficulty: 'Medium', question_count: 5, time_per_question: 60, minimum_plan: 'starter', is_recommended: false, status: 'Active' },
  { title: 'Git & Version Control Practice', category: 'Git', mode: 'practice', difficulty: 'Mixed', question_count: 5, time_per_question: 60, minimum_plan: 'free', is_recommended: false, status: 'Active' },
  { title: 'Python Advanced Challenge', category: 'Python', mode: 'ai_adaptive', difficulty: 'Adaptive', question_count: 5, time_per_question: 90, minimum_plan: 'pro', is_recommended: true, status: 'Active' },
  { title: 'HR Freshers Assessment', category: 'HR Interview', mode: 'timed_test', difficulty: 'Easy', question_count: 5, time_per_question: 60, minimum_plan: 'free', is_recommended: true, status: 'Active' },
  { title: 'Managerial Interview Practice', category: 'Managerial Interview', mode: 'practice', difficulty: 'Hard', question_count: 5, time_per_question: 90, minimum_plan: 'premium', is_recommended: false, status: 'Active' }
];

assert(SAMPLE_TESTS.length === 10, "10 Sample Test Configurations defined");

// Test access across plans for all 10 tests
const freeEligible = SAMPLE_TESTS.filter(t => isContentAccessible(t.minimum_plan, freeAccess));
assert(freeEligible.length === 5, `Free student has access to 5 Free tests (got ${freeEligible.length})`);

const starterEligible = SAMPLE_TESTS.filter(t => isContentAccessible(t.minimum_plan, starterAccess));
assert(starterEligible.length === 8, `Starter student has access to 8 Free+Starter tests (got ${starterEligible.length})`);

const proEligible = SAMPLE_TESTS.filter(t => isContentAccessible(t.minimum_plan, proAccess));
assert(proEligible.length === 9, `Pro student has access to 9 Free+Starter+Pro tests (got ${proEligible.length})`);

const premiumEligible = SAMPLE_TESTS.filter(t => isContentAccessible(t.minimum_plan, premiumAccess));
assert(premiumEligible.length === 10, `Premium student has access to all 10 tests (got ${premiumEligible.length})`);

// 4. Test Score Calculation
function calculateScore(totalQuestions: number, answeredMastered: number) {
  return totalQuestions > 0 ? Math.round((answeredMastered / totalQuestions) * 100) : 0;
}

assert(calculateScore(10, 8) === 80, "8/10 mastered equals 80% score");
assert(calculateScore(10, 7) === 70, "7/10 mastered equals 70% passing score");
assert(calculateScore(10, 6) === 60, "6/10 mastered equals 60% score");

console.log("=================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
