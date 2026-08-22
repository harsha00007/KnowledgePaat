import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csjywuflkvohytbvglxf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_k7fUFPAJoKrn4_ghTkJDqw_ejUHMOHA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function listAll() {
  const { data: questions } = await supabase
    .from('interview_questions')
    .select('id, title, category_id, difficulty, status, minimum_plan')
    .order('created_at', { ascending: true });
  
  console.log("All questions in DB:");
  questions?.forEach(q => console.log(`- [${q.difficulty}] "${q.title}" (Category ID: ${q.category_id})`));
}

listAll().then(() => process.exit(0));
