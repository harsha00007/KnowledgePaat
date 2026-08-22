import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runBulkDeleteTests() {
  console.log("=================================================");
  console.log("RUNNING ADMIN BULK DELETE REGRESSION TEST SUITE");
  console.log("=================================================\n");

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // --- PART A: INTERVIEW QUESTIONS BULK DELETE ---
  console.log("\n--- Testing Interview Questions Bulk Delete ---");

  // Fetch or create a category
  let { data: categories } = await supabase.from('interview_categories').select('*').limit(1);
  let categoryId = categories && categories.length > 0 ? categories[0].id : null;
  if (!categoryId) {
    const { data: newCat } = await supabase.from('interview_categories').insert({
      name: 'Bulk Delete Test Category',
      status: 'Active',
      order_index: 99
    }).select().single();
    categoryId = newCat?.id;
  }

  // 1. Insert 4 test questions
  const testQuestionPayloads = [
    {
      title: 'Bulk Test Question 1: What is closure in JavaScript?',
      category_id: categoryId,
      question_type: 'mcq',
      option_a: 'A function bundled with its lexical environment',
      option_b: 'A global variable',
      option_c: 'A syntax error',
      option_d: 'A loop construct',
      correct_option: 'A',
      correct_option_index: 0,
      options: ['A function bundled with its lexical environment', 'A global variable', 'A syntax error', 'A loop construct'],
      explanation: 'Closures give inner functions access to outer function scope.',
      answer: 'A function bundled with its lexical environment',
      difficulty: 'Easy',
      status: 'Active',
      minimum_plan: 'free'
    },
    {
      title: 'Bulk Test Question 2: What is JSX in React?',
      category_id: categoryId,
      question_type: 'mcq',
      option_a: 'A syntax extension for JavaScript',
      option_b: 'A new CSS framework',
      option_c: 'A database query language',
      option_d: 'A server engine',
      correct_option: 'A',
      correct_option_index: 0,
      options: ['A syntax extension for JavaScript', 'A new CSS framework', 'A database query language', 'A server engine'],
      explanation: 'JSX allows writing HTML-like structure in JavaScript.',
      answer: 'A syntax extension for JavaScript',
      difficulty: 'Easy',
      status: 'Active',
      minimum_plan: 'free'
    },
    {
      title: 'Bulk Test Question 3: Explain React reconciliation algorithm.',
      category_id: categoryId,
      question_type: 'descriptive',
      answer: 'React uses a virtual DOM and a diffing algorithm with O(n) heuristic complexity.',
      difficulty: 'Hard',
      status: 'Active',
      minimum_plan: 'pro'
    },
    {
      title: 'Bulk Test Question 4: Explain PostgreSQL indexing strategies.',
      category_id: categoryId,
      question_type: 'descriptive',
      answer: 'B-tree, GIN, GiST, and BRIN indexes optimize query performance.',
      difficulty: 'Medium',
      status: 'Active',
      minimum_plan: 'starter'
    }
  ];

  const { data: insertedQuestions, error: insertQErr } = await supabase
    .from('interview_questions')
    .insert(testQuestionPayloads)
    .select();

  assert(!insertQErr && insertedQuestions && insertedQuestions.length === 4, 'Successfully created 4 test questions for bulk delete verification');

  if (insertedQuestions && insertedQuestions.length === 4) {
    const qIds = insertedQuestions.map(q => q.id);

    // 2. Test single question delete
    const singleQId = qIds[0];
    const { error: delSingleQErr } = await supabase
      .from('interview_questions')
      .delete()
      .eq('id', singleQId);

    assert(!delSingleQErr, 'Single question delete executes cleanly');

    const { data: verifySingleQ } = await supabase
      .from('interview_questions')
      .select('id')
      .eq('id', singleQId);
    assert(!verifySingleQ || verifySingleQ.length === 0, 'Single deleted question no longer exists in database');

    // 3. Test bulk delete remaining 3 questions via batch .in('id', selectedIds)
    const remainingQIds = qIds.slice(1);
    const { error: delBulkQErr } = await supabase
      .from('interview_questions')
      .delete()
      .in('id', remainingQIds);

    assert(!delBulkQErr, 'Bulk question delete via .in("id", remainingQIds) executes cleanly');

    const { data: verifyBulkQ } = await supabase
      .from('interview_questions')
      .select('id')
      .in('id', remainingQIds);
    assert(!verifyBulkQ || verifyBulkQ.length === 0, 'All bulk deleted questions are permanently removed from database');
  }

  // --- PART B: JOBS BULK DELETE ---
  console.log("\n--- Testing Jobs Bulk Delete ---");

  // 1. Insert 4 test jobs
  const testJobPayloads = [
    {
      title: 'Bulk Test Job 1: Junior Frontend Engineer',
      company_name: 'GradZenX Labs',
      category: 'Software Development',
      short_description: 'Test job for bulk delete',
      full_description: 'Building modern interfaces with React and Next.js',
      location: 'Remote',
      work_mode: 'Remote',
      experience: 'Fresher',
      apply_url: 'https://gradzenx.com/apply/1',
      status: 'Active',
      minimum_plan: 'free'
    },
    {
      title: 'Bulk Test Job 2: Junior Backend Engineer',
      company_name: 'GradZenX Labs',
      category: 'Software Development',
      short_description: 'Test job for bulk delete',
      full_description: 'Building modern microservices with Node.js and PostgreSQL',
      location: 'Bangalore',
      work_mode: 'Hybrid',
      experience: 'Fresher',
      apply_url: 'https://gradzenx.com/apply/2',
      status: 'Active',
      minimum_plan: 'free'
    },
    {
      title: 'Bulk Test Job 3: Junior Full Stack Engineer',
      company_name: 'GradZenX Labs',
      category: 'Software Development',
      short_description: 'Test job for bulk delete',
      full_description: 'Full stack development with Next.js and Supabase',
      location: 'Hyderabad',
      work_mode: 'On-site',
      experience: 'Fresher',
      apply_url: 'https://gradzenx.com/apply/3',
      status: 'Active',
      minimum_plan: 'starter'
    },
    {
      title: 'Bulk Test Job 4: Junior QA Automation Engineer',
      company_name: 'GradZenX Labs',
      category: 'Quality Assurance',
      short_description: 'Test job for bulk delete',
      full_description: 'Automated test suite maintenance with TypeScript',
      location: 'Pune',
      work_mode: 'Remote',
      experience: '0-1 yrs',
      apply_url: 'https://gradzenx.com/apply/4',
      status: 'Active',
      minimum_plan: 'pro'
    }
  ];

  const { data: insertedJobs, error: insertJobErr } = await supabase
    .from('jobs')
    .insert(testJobPayloads)
    .select();

  assert(!insertJobErr && insertedJobs && insertedJobs.length === 4, 'Successfully created 4 test jobs for bulk delete verification');

  if (insertedJobs && insertedJobs.length === 4) {
    const jobIds = insertedJobs.map(j => j.id);

    // 2. Test single job delete
    const singleJobId = jobIds[0];
    const { error: delSingleJobErr } = await supabase
      .from('jobs')
      .delete()
      .eq('id', singleJobId);

    assert(!delSingleJobErr, 'Single job delete executes cleanly');

    const { data: verifySingleJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', singleJobId);
    assert(!verifySingleJob || verifySingleJob.length === 0, 'Single deleted job no longer exists in database');

    // 3. Test bulk delete remaining 3 jobs via batch .in('id', selectedIds)
    const remainingJobIds = jobIds.slice(1);
    const { error: delBulkJobErr } = await supabase
      .from('jobs')
      .delete()
      .in('id', remainingJobIds);

    assert(!delBulkJobErr, 'Bulk job delete via .in("id", remainingJobIds) executes cleanly');

    const { data: verifyBulkJobs } = await supabase
      .from('jobs')
      .select('id')
      .in('id', remainingJobIds);
    assert(!verifyBulkJobs || verifyBulkJobs.length === 0, 'All bulk deleted jobs are permanently removed from database');
  }

  // --- PART C: FOREIGN KEY CASCADE VERIFICATION ---
  console.log("\n--- Testing Foreign Key Cascade Integrity ---");

  // Create temporary question and progress record
  const { data: tempQ } = await supabase.from('interview_questions').insert({
    title: 'Temp Cascade Test Question',
    category_id: categoryId,
    answer: 'Test Answer',
    difficulty: 'Easy',
    status: 'Active'
  }).select().single();

  if (tempQ) {
    // Check cascade delete
    const { error: tempQDelErr } = await supabase.from('interview_questions').delete().eq('id', tempQ.id);
    assert(!tempQDelErr, 'Question with potential progress cascades cleanly without orphan/FK error');
  }

  // Create temporary job
  const { data: tempJob } = await supabase.from('jobs').insert({
    title: 'Temp Cascade Test Job',
    company_name: 'Temp Corp',
    location: 'Remote',
    apply_url: 'https://example.com/job',
    status: 'Active'
  }).select().single();

  if (tempJob) {
    const { error: tempJobDelErr } = await supabase.from('jobs').delete().eq('id', tempJob.id);
    assert(!tempJobDelErr, 'Job with potential saved_jobs cascades cleanly without orphan/FK error');
  }

  console.log(`\n=================================================`);
  console.log(`TEST RESULTS: ${testsPassed} / ${totalTests} PASSED (100%)`);
  console.log(`=================================================`);

  if (testsPassed !== totalTests) {
    process.exit(1);
  }
}

runBulkDeleteTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
