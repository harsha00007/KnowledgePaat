import * as fs from 'fs';
import * as path from 'path';
import { SEED_SKILLS, SEED_CAREERS, SEED_RELATIONSHIPS } from '../content/careers/seedData';

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generatePhaseAMigration(): string {
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- DATA ONLY: REVIEWED INSERT-ONLY SEEDS (CAREERS, SKILLS, GRAPH)');
  lines.push('--');
  lines.push(`-- Seed counts:`);
  lines.push(`--   - Skills: ${SEED_SKILLS.length} Reusable Foundation Skills`);
  lines.push(`--   - Careers: ${SEED_CAREERS.length} Industry Career Tracks`);
  lines.push(`--   - Relationships: ${SEED_RELATIONSHIPS.length} Cycle-Free Graph Edges`);
  lines.push('--');
  lines.push('-- Apply schema and hardening separately. Existing rows are never overwritten. New careers remain drafts; review and publish through admin.');
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('DO $$');
  lines.push('DECLARE');
  lines.push('  v_career_id UUID;');
  lines.push('  v_skill_id UUID;');
  lines.push('  v_source_id UUID;');
  lines.push('  v_target_id UUID;');
  lines.push('BEGIN');
  lines.push('');

  // 1. Insert Skills
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  lines.push('  -- 1. SEED SKILLS');
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  for (const s of SEED_SKILLS) {
    lines.push(`  INSERT INTO skill_catalog (`);
    lines.push(`    slug, name, short_description, description, category, skill_type, difficulty, status, display_order, is_featured`);
    lines.push(`  ) VALUES (`);
    lines.push(`    ${escapeSql(s.slug)}, ${escapeSql(s.name)}, ${escapeSql(s.short_description)}, ${escapeSql(s.description)},`);
    lines.push(`    ${escapeSql(s.category)}, ${escapeSql(s.skill_type)}, ${escapeSql(s.difficulty)}, 'published', ${s.display_order}, ${s.is_featured}`);
    lines.push(`  ) ON CONFLICT (slug) DO NOTHING;`);
    lines.push('');
  }

  // 2. Insert Careers
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  lines.push('  -- 2. SEED CAREERS');
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  for (const c of SEED_CAREERS) {
    lines.push(`  INSERT INTO career_catalog (`);
    lines.push(`    slug, name, short_description, description, category, difficulty, estimated_months, status, display_order, is_featured, seo_title, seo_description`);
    lines.push(`  ) VALUES (`);
    lines.push(`    ${escapeSql(c.slug)}, ${escapeSql(c.name)}, ${escapeSql(c.short_description)}, ${escapeSql(c.description)},`);
    lines.push(`    ${escapeSql(c.category)}, ${escapeSql(c.difficulty)}, ${c.estimated_months}, 'draft', ${c.display_order}, ${c.is_featured},`);
    lines.push(`    ${escapeSql(`${c.name} Career Track | KnowledgePaat`)}, ${escapeSql(c.short_description)}`);
    lines.push(`  ) ON CONFLICT (slug) DO NOTHING;`);
    lines.push('');
  }

  // 3. Map Skills to Careers
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  lines.push('  -- 3. SEED CAREER-SKILL MAPPINGS');
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  for (const c of SEED_CAREERS) {
    lines.push(`  -- Mappings for: ${c.name}`);
    lines.push(`  SELECT id INTO v_career_id FROM career_catalog WHERE slug = ${escapeSql(c.slug)};`);
    lines.push(`  IF v_career_id IS NOT NULL THEN`);
    for (const mapping of c.skills) {
      lines.push(`    SELECT id INTO v_skill_id FROM skill_catalog WHERE slug = ${escapeSql(mapping.skill_slug)};`);
      lines.push(`    IF v_skill_id IS NOT NULL THEN`);
      lines.push(`      INSERT INTO career_skill_map (`);
      lines.push(`        career_id, skill_id, importance, proficiency_target, display_order, is_core`);
      lines.push(`      ) VALUES (`);
      lines.push(`        v_career_id, v_skill_id, ${escapeSql(mapping.importance)}, ${escapeSql(mapping.proficiency_target)}, ${mapping.display_order}, ${mapping.importance === 'required'}`);
      lines.push(`      ) ON CONFLICT (career_id, skill_id) DO NOTHING;`);
      lines.push(`    END IF;`);
    }
    lines.push(`  END IF;`);
    lines.push('');
  }

  // 4. Seed Skill Relationships
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  lines.push('  -- 4. SEED SKILL RELATIONSHIPS (GRAPH EDGES)');
  lines.push('  -- ─────────────────────────────────────────────────────────────');
  for (const rel of SEED_RELATIONSHIPS) {
    lines.push(`  SELECT id INTO v_source_id FROM skill_catalog WHERE slug = ${escapeSql(rel.source_slug)};`);
    lines.push(`  SELECT id INTO v_target_id FROM skill_catalog WHERE slug = ${escapeSql(rel.target_slug)};`);
    lines.push(`  IF v_source_id IS NOT NULL AND v_target_id IS NOT NULL THEN`);
    lines.push(`    INSERT INTO skill_relationships (`);
    lines.push(`      source_skill_id, target_skill_id, relationship_type, strength, notes`);
    lines.push(`    ) VALUES (`);
    lines.push(`      v_source_id, v_target_id, ${escapeSql(rel.relationship_type)}, ${rel.strength}, ${escapeSql(rel.notes || null)}`);
    lines.push(`    ) ON CONFLICT (source_skill_id, target_skill_id, relationship_type) DO NOTHING;`);
    lines.push(`  END IF;`);
    lines.push('');
  }

  lines.push('END $$;');
  lines.push('');

  return lines.join('\n');
}

const sql = generatePhaseAMigration();
const outputPath = path.resolve(__dirname, '../../supabase/migrations/career_skill_graph_seed_phase_a.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`Successfully generated Phase A data-only insert-only seed SQL to: ${outputPath}`);
console.log(`Total Skills: ${SEED_SKILLS.length}`);
console.log(`Total Careers: ${SEED_CAREERS.length}`);
console.log(`Total Relationships: ${SEED_RELATIONSHIPS.length}`);
