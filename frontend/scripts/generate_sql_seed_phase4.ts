import * as fs from 'fs';
import * as path from 'path';
import { ROADMAP_CATALOG } from '../content/roadmaps/catalog';

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generatePhase4Migration(): string {
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- KnowledgePaat — Career Roadmap Platform');
  lines.push('-- Phase 4: Production Catalog Seeding Migration');
  lines.push('--');
  lines.push('-- Contains 17 Full Career, Skill, Beginner & Best-Practice Roadmaps');
  lines.push('-- Completely idempotent: running repeatedly produces no duplicate entries.');
  lines.push('-- Preserves existing Phase 1, 2, and 3 schema, constraints and RLS.');
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('DO $$');
  lines.push('DECLARE');
  lines.push('  v_roadmap_id UUID;');
  lines.push('  v_sec_id UUID;');
  lines.push('  v_node_id UUID;');
  lines.push('  v_res_id UUID;');
  lines.push('  v_src_id UUID;');
  lines.push('  v_tgt_id UUID;');
  lines.push('BEGIN');
  lines.push('');

  for (const rm of ROADMAP_CATALOG) {
    lines.push(`  -- ------------------------------------------------------------`);
    lines.push(`  -- ROADMAP: ${rm.title} (${rm.slug})`);
    lines.push(`  -- ------------------------------------------------------------`);
    lines.push(`  SELECT id INTO v_roadmap_id FROM career_roadmaps WHERE slug = ${escapeSql(rm.slug)};`);
    lines.push(`  IF v_roadmap_id IS NULL THEN`);
    lines.push(`    INSERT INTO career_roadmaps (`);
    lines.push(`      title, slug, short_description, description, category, difficulty, estimated_duration, seo_title, seo_description, is_active`);
    lines.push(`    ) VALUES (`);
    lines.push(`      ${escapeSql(rm.title)}, ${escapeSql(rm.slug)}, ${escapeSql(rm.short_description)}, ${escapeSql(rm.description)}, ${escapeSql(rm.category)}, ${escapeSql(rm.difficulty)}, ${escapeSql(rm.estimated_duration)}, ${escapeSql(rm.seo_title || `${rm.title} | KnowledgePaat`)}, ${escapeSql(rm.seo_description || rm.short_description)}, true`);
    lines.push(`    ) RETURNING id INTO v_roadmap_id;`);
    lines.push(`  ELSE`);
    lines.push(`    UPDATE career_roadmaps SET`);
    lines.push(`      title = ${escapeSql(rm.title)},`);
    lines.push(`      short_description = ${escapeSql(rm.short_description)},`);
    lines.push(`      description = ${escapeSql(rm.description)},`);
    lines.push(`      category = ${escapeSql(rm.category)},`);
    lines.push(`      difficulty = ${escapeSql(rm.difficulty)},`);
    lines.push(`      estimated_duration = ${escapeSql(rm.estimated_duration)},`);
    lines.push(`      seo_title = ${escapeSql(rm.seo_title || `${rm.title} | KnowledgePaat`)},`);
    lines.push(`      seo_description = ${escapeSql(rm.seo_description || rm.short_description)},`);
    lines.push(`      is_active = true,`);
    lines.push(`      updated_at = NOW()`);
    lines.push(`    WHERE id = v_roadmap_id;`);
    lines.push(`  END IF;`);
    lines.push('');

    // Sections
    rm.sections.forEach((sec, sIdx) => {
      lines.push(`  -- Section: ${sec.title}`);
      lines.push(`  SELECT id INTO v_sec_id FROM career_roadmap_sections WHERE roadmap_id = v_roadmap_id AND slug = ${escapeSql(sec.slug)};`);
      lines.push(`  IF v_sec_id IS NULL THEN`);
      lines.push(`    INSERT INTO career_roadmap_sections (roadmap_id, title, slug, description, sequence, is_required, is_active)`);
      lines.push(`    VALUES (v_roadmap_id, ${escapeSql(sec.title)}, ${escapeSql(sec.slug)}, ${escapeSql(sec.description || '')}, ${sec.sequence || sIdx + 1}, ${sec.is_required !== false}, true)`);
      lines.push(`    RETURNING id INTO v_sec_id;`);
      lines.push(`  ELSE`);
      lines.push(`    UPDATE career_roadmap_sections SET`);
      lines.push(`      title = ${escapeSql(sec.title)},`);
      lines.push(`      description = ${escapeSql(sec.description || '')},`);
      lines.push(`      sequence = ${sec.sequence || sIdx + 1},`);
      lines.push(`      is_required = ${sec.is_required !== false},`);
      lines.push(`      is_active = true`);
      lines.push(`    WHERE id = v_sec_id;`);
      lines.push(`  END IF;`);
      lines.push('');

      // Nodes
      sec.nodes.forEach((node, nIdx) => {
        lines.push(`  -- Node: ${node.title}`);
        lines.push(`  SELECT id INTO v_node_id FROM career_roadmap_nodes WHERE section_id = v_sec_id AND slug = ${escapeSql(node.slug)};`);
        lines.push(`  IF v_node_id IS NULL THEN`);
        lines.push(`    INSERT INTO career_roadmap_nodes (section_id, title, slug, description, node_type, difficulty, estimated_minutes, sequence, is_required, is_active)`);
        lines.push(`    VALUES (v_sec_id, ${escapeSql(node.title)}, ${escapeSql(node.slug)}, ${escapeSql(node.description || '')}, ${escapeSql(node.node_type || 'TOPIC')}, ${escapeSql(node.difficulty || 'Beginner')}, ${node.estimated_minutes || 60}, ${node.sequence || nIdx + 1}, ${node.is_required !== false}, true)`);
        lines.push(`    RETURNING id INTO v_node_id;`);
        lines.push(`  ELSE`);
        lines.push(`    UPDATE career_roadmap_nodes SET`);
        lines.push(`      title = ${escapeSql(node.title)},`);
        lines.push(`      description = ${escapeSql(node.description || '')},`);
        lines.push(`      node_type = ${escapeSql(node.node_type || 'TOPIC')},`);
        lines.push(`      difficulty = ${escapeSql(node.difficulty || 'Beginner')},`);
        lines.push(`      estimated_minutes = ${node.estimated_minutes || 60},`);
        lines.push(`      sequence = ${node.sequence || nIdx + 1},`);
        lines.push(`      is_required = ${node.is_required !== false},`);
        lines.push(`      is_active = true`);
        lines.push(`    WHERE id = v_node_id;`);
        lines.push(`  END IF;`);
        lines.push('');

        // Topics
        if (node.topics && node.topics.length > 0) {
          node.topics.forEach((t, tIdx) => {
            lines.push(`  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_topics WHERE node_id = v_node_id AND topic = ${escapeSql(t)}) THEN`);
            lines.push(`    INSERT INTO career_roadmap_node_topics (node_id, topic, sequence) VALUES (v_node_id, ${escapeSql(t)}, ${tIdx + 1});`);
            lines.push(`  END IF;`);
          });
        }

        // Resources
        if (node.resources && node.resources.length > 0) {
          node.resources.forEach((res, rIdx) => {
            lines.push(`  -- Resource: ${res.title}`);
            lines.push(`  SELECT id INTO v_res_id FROM career_resources WHERE url = ${escapeSql(res.url)};`);
            lines.push(`  IF v_res_id IS NULL THEN`);
            lines.push(`    INSERT INTO career_resources (title, description, resource_type, provider, url, category, difficulty, duration_minutes, is_free, is_active)`);
            lines.push(`    VALUES (${escapeSql(res.title)}, ${escapeSql(res.description || res.title)}, ${escapeSql(res.resource_type || 'ARTICLE')}, ${escapeSql(res.provider || 'KnowledgePaat')}, ${escapeSql(res.url)}, ${escapeSql(rm.category)}, ${escapeSql(res.difficulty || 'Beginner')}, 45, true, true)`);
            lines.push(`    RETURNING id INTO v_res_id;`);
            lines.push(`  END IF;`);
            lines.push(`  IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_resources WHERE node_id = v_node_id AND resource_id = v_res_id) THEN`);
            lines.push(`    INSERT INTO career_roadmap_node_resources (node_id, resource_id, is_recommended, priority)`);
            lines.push(`    VALUES (v_node_id, v_res_id, ${res.is_recommended ? 'true' : 'false'}, ${rIdx + 1});`);
            lines.push(`  END IF;`);
          });
        }
      });
    });

    // Inter-node relationships extracted from node prerequisites and next steps
    lines.push(`  -- Inter-node relationships for ${rm.slug}`);
    for (const sec of rm.sections) {
      for (const node of sec.nodes) {
        if (node.prerequisites) {
          for (const prereqSlug of node.prerequisites) {
            lines.push(`  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = ${escapeSql(prereqSlug)};`);
            lines.push(`  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = ${escapeSql(node.slug)};`);
            lines.push(`  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN`);
            lines.push(`    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN`);
            lines.push(`      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)`);
            lines.push(`      VALUES (v_src_id, v_tgt_id, 'PREREQUISITE');`);
            lines.push(`    END IF;`);
            lines.push(`  END IF;`);
          }
        }
        if (node.nextNodes) {
          for (const nextSlug of node.nextNodes) {
            lines.push(`  SELECT n.id INTO v_src_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = ${escapeSql(node.slug)};`);
            lines.push(`  SELECT n.id INTO v_tgt_id FROM career_roadmap_nodes n JOIN career_roadmap_sections s ON n.section_id = s.id WHERE s.roadmap_id = v_roadmap_id AND n.slug = ${escapeSql(nextSlug)};`);
            lines.push(`  IF v_src_id IS NOT NULL AND v_tgt_id IS NOT NULL THEN`);
            lines.push(`    IF NOT EXISTS (SELECT 1 FROM career_roadmap_node_relationships WHERE source_node_id = v_src_id AND target_node_id = v_tgt_id) THEN`);
            lines.push(`      INSERT INTO career_roadmap_node_relationships (source_node_id, target_node_id, relationship_type)`);
            lines.push(`      VALUES (v_src_id, v_tgt_id, 'NEXT');`);
            lines.push(`    END IF;`);
            lines.push(`  END IF;`);
          }
        }
      }
    }

    lines.push('');
  }

  lines.push('  RAISE NOTICE \'Phase 4 Career Roadmap Catalog Seed Completed Successfully.\';');
  lines.push('END $$;');
  lines.push('');

  return lines.join('\n');
}

const outputPath = path.resolve(__dirname, '../../supabase/migrations/career_roadmap_catalog_seed_phase4.sql');
const sql = generatePhase4Migration();
fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Generated migration written to: ${outputPath} (${sql.length} bytes)`);
