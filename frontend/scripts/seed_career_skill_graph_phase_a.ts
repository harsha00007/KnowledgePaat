import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SEED_SKILLS, SEED_CAREERS, SEED_RELATIONSHIPS } from '../content/careers/seedData';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function seed() {
  if (!process.argv.includes('--reviewed')) throw new Error('Review seed records first, then pass --reviewed. Existing records are insert-only; new careers remain drafts.');
  console.log('================================================================');
  console.log('KNOWLEDGEPAAT — SEEDING CAREER & SKILL GRAPH (PHASE A)');
  console.log('================================================================\n');

  if (!supabaseUrl || !serviceKey) {
    console.log('⚠️ Note: Supabase service role key not provided in .env.');
    console.log('👉 Use the generated SQL migration file to seed directly in Supabase:');
    console.log('   supabase/migrations/career_skill_graph_seed_phase_a.sql\n');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`1. Seeding ${SEED_SKILLS.length} skills...`);
  for (const s of SEED_SKILLS) {
    const { error } = await supabase.from('skill_catalog').upsert(
      {
        slug: s.slug,
        name: s.name,
        short_description: s.short_description,
        description: s.description,
        category: s.category,
        skill_type: s.skill_type,
        difficulty: s.difficulty,
        status: 'published',
        display_order: s.display_order,
        is_featured: s.is_featured,
      },
      { onConflict: 'slug', ignoreDuplicates: true }
    );
    if (error) {
      throw new Error('Seed insert failed; existing rows were preserved.');
    }
  }
  console.log('   ✅ Skills seeded.\n');

  console.log(`2. Seeding ${SEED_CAREERS.length} careers...`);
  for (const c of SEED_CAREERS) {
    const { error } = await supabase.from('career_catalog').upsert(
      {
        slug: c.slug,
        name: c.name,
        short_description: c.short_description,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        estimated_months: c.estimated_months,
        status: 'draft',
        display_order: c.display_order,
        is_featured: c.is_featured,
        seo_title: `${c.name} Career Track | KnowledgePaat`,
        seo_description: c.short_description,
      },
      { onConflict: 'slug', ignoreDuplicates: true }
    );
    if (error) {
      throw new Error('Seed insert failed; existing rows were preserved.');
    }
  }
  console.log('   ✅ Careers seeded.\n');

  console.log('3. Seeding Career-Skill Mappings...');
  // Fetch IDs
  const { data: dbCareers, error: careerReadError } = await supabase.from('career_catalog').select('id, slug').in('slug', SEED_CAREERS.map(c => c.slug));
  const { data: dbSkills, error: skillReadError } = await supabase.from('skill_catalog').select('id, slug').in('slug', SEED_SKILLS.map(s => s.slug));

  if (careerReadError || skillReadError) throw new Error('Seed ID lookup failed.');
  const careerIdMap = new Map((dbCareers || []).map((c) => [c.slug, c.id]));
  const skillIdMap = new Map((dbSkills || []).map((s) => [s.slug, s.id]));

  let mappedCount = 0;
  for (const c of SEED_CAREERS) {
    const careerId = careerIdMap.get(c.slug);
    if (!careerId) continue;

    for (const m of c.skills) {
      const skillId = skillIdMap.get(m.skill_slug);
      if (!skillId) continue;

      const { error } = await supabase.from('career_skill_map').upsert(
        {
          career_id: careerId,
          skill_id: skillId,
          importance: m.importance,
          proficiency_target: m.proficiency_target,
          display_order: m.display_order,
          is_core: m.importance === 'required',
        },
        { onConflict: 'career_id,skill_id', ignoreDuplicates: true }
      );
      if (error) throw new Error('Seed mapping failed.');
      mappedCount++;
    }
  }
  console.log(`   ✅ Created/updated ${mappedCount} career-skill mappings.\n`);

  console.log('4. Seeding Skill Relationships...');
  let relCount = 0;
  for (const r of SEED_RELATIONSHIPS) {
    const sourceId = skillIdMap.get(r.source_slug);
    const targetId = skillIdMap.get(r.target_slug);
    if (!sourceId || !targetId) continue;

    const { error } = await supabase.from('skill_relationships').upsert(
      {
        source_skill_id: sourceId,
        target_skill_id: targetId,
        relationship_type: r.relationship_type,
        strength: r.strength,
        notes: r.notes || null,
      },
      { onConflict: 'source_skill_id,target_skill_id,relationship_type', ignoreDuplicates: true }
    );
    if (error) throw new Error('Seed relationship failed.');
    relCount++;
  }
  console.log(`   ✅ Created/updated ${relCount} skill relationships.\n`);

  console.log('🎉 Deterministic Phase A seed complete!');
}

seed().catch(error => { console.error(error instanceof Error ? error.message : 'Seed failed.'); process.exitCode = 1; });
