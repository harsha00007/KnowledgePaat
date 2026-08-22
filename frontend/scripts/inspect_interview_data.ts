import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csjywuflkvohytbvglxf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_k7fUFPAJoKrn4_ghTkJDqw_ejUHMOHA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  console.log("=== 1. INTERVIEW CATEGORIES ===");
  const { data: categories, error: catErr } = await supabase
    .from('interview_categories')
    .select('*')
    .order('order_index', { ascending: true });
  
  if (catErr) {
    console.error("Categories error:", catErr);
  } else {
    console.log(`Found ${categories?.length} categories:`);
    categories?.forEach(c => {
      console.log(`- [${c.id}] "${c.name}" | Status: ${c.status || 'Active'} | is_active: ${c.is_active} | Minimum Plan: ${c.minimum_plan || 'free'}`);
    });
  }

  console.log("\n=== 2. INTERVIEW QUESTIONS SUMMARY ===");
  const { data: questions, error: qErr } = await supabase
    .from('interview_questions')
    .select('id, category_id, title, difficulty, status, minimum_plan');
  
  if (qErr) {
    console.error("Questions error:", qErr);
  } else {
    console.log(`Found ${questions?.length} questions in total.`);
    
    // Group questions by category and difficulty
    const catMap = new Map();
    categories?.forEach(c => catMap.set(c.id, c.name));

    const breakdown: Record<string, Record<string, number>> = {};
    const activeQuestions = questions?.filter(q => (q.status || 'Active') === 'Active') || [];
    console.log(`Active questions count: ${activeQuestions.length}`);

    activeQuestions.forEach(q => {
      const catName = catMap.get(q.category_id) || q.category_id || 'Unknown';
      if (!breakdown[catName]) breakdown[catName] = { Easy: 0, Medium: 0, Hard: 0, Total: 0 };
      const diff = q.difficulty || 'Medium';
      breakdown[catName][diff] = (breakdown[catName][diff] || 0) + 1;
      breakdown[catName].Total = (breakdown[catName].Total || 0) + 1;
    });

    console.table(breakdown);
  }

  console.log("\n=== 3. EXISTING TEST CONFIGURATIONS ===");
  const { data: testConfigs, error: tErr } = await supabase
    .from('interview_test_configs')
    .select('*');
  
  if (tErr) {
    console.error("Test configs error:", tErr);
  } else {
    console.log(`Found ${testConfigs?.length} test configurations:`);
    testConfigs?.forEach(t => {
      console.log(`- "${t.title}" | Mode: ${t.mode} | Diff: ${t.difficulty} | Qs: ${t.question_count} | Status: ${t.status} | Plan: ${t.minimum_plan} | Rec: ${t.is_recommended}`);
    });
  }

  console.log("\n=== 4. INTERVIEW PREP SETTINGS ===");
  const { data: settings, error: sErr } = await supabase
    .from('interview_prep_settings')
    .select('*')
    .eq('id', 'global')
    .maybeSingle();

  if (sErr) {
    console.error("Settings error:", sErr);
  } else {
    console.log("Global prep settings:", settings);
  }
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
