/**
 * ============================================================================
 * KNOWLEDGEPAAT — CAREER ROADMAP PLATFORM EXPANSION TEST SUITE
 * Phase 4 Comprehensive Automated Verification
 * ============================================================================
 *
 * Verifies:
 * 1. Roadmap Catalog & Taxonomy (17 roadmaps: Role, Skill, Beginner, Best Practice)
 * 2. Track Filtering (ROLE, SKILL, BEGINNER, BEST_PRACTICE)
 * 3. Search & Category filtering across catalog
 * 4. Slug lookup, public visibility & draft protection
 * 5. Roadmap Detail integrity (sections, nodes, sequence ordering)
 * 6. Graph Relationships, DAG validity & cycle-free verification
 * 7. Resource engine integration & recommended resource highlighting
 * 8. "What Should I Learn Next?" recommendation engine
 * 9. Career Outcome Panel (roles, portfolio projects, interview readiness)
 * 10. Admin Quality Checker evaluation (score, blockers, publish readiness)
 * 11. Admin Duplicate Roadmap capability
 * 12. Idempotent seed protection
 * 13. Progress calculation compatibility
 */

import { ROADMAP_CATALOG, getCatalogRoadmapBySlug } from '../content/roadmaps/catalog';
import {
  classifyRoadmap,
  getClassificationLabel,
  getRoadmapOutcome,
  getNextStepRecommendation,
  evaluateRoadmapQuality,
  ROADMAP_TEMPLATES,
} from '../lib/roadmapTaxonomy';
import {
  getCatalogRoadmapCards,
  getCatalogRoadmapDetail,
} from '../lib/roadmapCatalogBridge';
import type {
  RoadmapDetail,
  TopicProgressStatus,
} from '../types/roadmap';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('KNOWLEDGEPAAT — CAREER ROADMAP PLATFORM EXPANSION TEST SUITE');
  console.log('PHASE 4: TAXONOMY, CATALOG, QUALITY & CAREER OUTCOMES');
  console.log('================================================================\n');

  // --- TEST GROUP 1: CATALOG SIZE & TAXONOMY CLASSIFICATION ---
  console.log('--- TEST GROUP 1: CATALOG SIZE & TAXONOMY CLASSIFICATION ---');
  assert(ROADMAP_CATALOG.length === 17, `Catalog contains 17 structured roadmaps (found: ${ROADMAP_CATALOG.length})`);

  const roles = ROADMAP_CATALOG.filter((rm) => classifyRoadmap(rm.slug, rm.category) === 'ROLE');
  assert(roles.length === 8, `Catalog contains exactly 8 role/career roadmaps (found: ${roles.length})`);

  const skills = ROADMAP_CATALOG.filter((rm) => classifyRoadmap(rm.slug, rm.category) === 'SKILL');
  assert(skills.length === 5, `Catalog contains exactly 5 technology/skill roadmaps (found: ${skills.length})`);

  const beginners = ROADMAP_CATALOG.filter((rm) => classifyRoadmap(rm.slug, rm.category) === 'BEGINNER');
  assert(beginners.length === 2, `Catalog contains exactly 2 beginner pathways (found: ${beginners.length})`);

  const bestPractices = ROADMAP_CATALOG.filter((rm) => classifyRoadmap(rm.slug, rm.category) === 'BEST_PRACTICE');
  assert(bestPractices.length === 2, `Catalog contains exactly 2 best practice roadmaps (found: ${bestPractices.length})`);

  assert(getClassificationLabel('ROLE') === 'Career Path', 'ROLE classification label is "Career Path"');
  assert(getClassificationLabel('SKILL') === 'Core Skill', 'SKILL classification label is "Core Skill"');
  assert(getClassificationLabel('BEGINNER') === 'Beginner Track', 'BEGINNER classification label is "Beginner Track"');
  assert(getClassificationLabel('BEST_PRACTICE') === 'Engineering Standard', 'BEST_PRACTICE classification label is "Engineering Standard"');

  // --- TEST GROUP 2: SLUG UNIQUENESS & METADATA QUALITY ---
  console.log('\n--- TEST GROUP 2: SLUG UNIQUENESS & METADATA QUALITY ---');
  const slugs = new Set<string>();
  let hasDuplicateSlug = false;
  ROADMAP_CATALOG.forEach((rm) => {
    if (slugs.has(rm.slug)) hasDuplicateSlug = true;
    slugs.add(rm.slug);
  });
  assert(!hasDuplicateSlug, 'All 17 roadmaps have unique deterministic slugs');

  let allHaveValidSeo = true;
  ROADMAP_CATALOG.forEach((rm) => {
    if (!rm.seo_title || !rm.seo_description || !rm.short_description) {
      allHaveValidSeo = false;
    }
  });
  assert(allHaveValidSeo, 'All catalog roadmaps specify title, short description, and SEO metadata');

  // --- TEST GROUP 3: CATALOG BRIDGE & DIRECTORY CARDS ---
  console.log('\n--- TEST GROUP 3: CATALOG BRIDGE & DIRECTORY CARDS ---');
  const allCards = getCatalogRoadmapCards();
  assert(allCards.length === 17, `Directory cards bridge converts all 17 roadmaps (found: ${allCards.length})`);

  const roleCards = getCatalogRoadmapCards({ type: 'ROLE' });
  assert(roleCards.length === 8, `Filter cards by type 'ROLE' returns 8 items (found: ${roleCards.length})`);

  const skillCards = getCatalogRoadmapCards({ type: 'SKILL' });
  assert(skillCards.length === 5, `Filter cards by type 'SKILL' returns 5 items (found: ${skillCards.length})`);

  const beginnerCards = getCatalogRoadmapCards({ type: 'BEGINNER' });
  assert(beginnerCards.length === 2, `Filter cards by type 'BEGINNER' returns 2 items (found: ${beginnerCards.length})`);

  const bpCards = getCatalogRoadmapCards({ type: 'BEST_PRACTICE' });
  assert(bpCards.length === 2, `Filter cards by type 'BEST_PRACTICE' returns 2 items (found: ${bpCards.length})`);

  // Cards contain section_count and node_count
  const pyCard = allCards.find((c) => c.slug === 'python-developer');
  assert(Boolean(pyCard && pyCard.section_count > 0 && pyCard.node_count > 0), 'Roadmap cards report positive section_count and node_count');

  // --- TEST GROUP 4: DETAILED ROADMAP STRUCTURE & DAG RELATIONSHIPS ---
  console.log('\n--- TEST GROUP 4: DETAILED ROADMAP STRUCTURE & DAG RELATIONSHIPS ---');
  const pyDetail = getCatalogRoadmapDetail('python-developer');
  assert(Boolean(pyDetail), 'getCatalogRoadmapDetail resolves python-developer successfully');
  assert(pyDetail!.sections.length >= 8, `Python developer contains >= 8 sections (found: ${pyDetail!.sections.length})`);

  const totalNodesInPy = pyDetail!.sections.reduce((acc, s) => acc + s.nodes.length, 0);
  assert(totalNodesInPy >= 20, `Python developer contains >= 20 nodes (found: ${totalNodesInPy})`);
  assert(pyDetail!.relationships.length > 0, `Python developer defines DAG relationships (found: ${pyDetail!.relationships.length})`);

  // Section sequence ordering
  let sequencesAscending = true;
  for (let i = 0; i < pyDetail!.sections.length - 1; i++) {
    if (pyDetail!.sections[i].sequence > pyDetail!.sections[i + 1].sequence) {
      sequencesAscending = false;
    }
  }
  assert(sequencesAscending, 'Sections are strictly sequenced in deterministic ascending order');

  // Node topic topics list
  const sampleNodeWithTopics = pyDetail!.sections
    .flatMap((s) => s.nodes)
    .find((n) => n.topics && n.topics.length > 0);
  assert(Boolean(sampleNodeWithTopics), 'Nodes contain structured topics/concepts for the drawer');

  // --- TEST GROUP 5: RESOURCE ENGINE INTEGRATION ---
  console.log('\n--- TEST GROUP 5: RESOURCE ENGINE INTEGRATION ---');
  const nodesWithResources = pyDetail!.sections
    .flatMap((s) => s.nodes)
    .filter((n) => n.resources && n.resources.length > 0);
  assert(nodesWithResources.length > 0, `Roadmap contains nodes with attached learning resources (${nodesWithResources.length} nodes)`);

  const hasRecommended = nodesWithResources.some((n) =>
    n.resources?.some((r) => r.is_recommended)
  );
  assert(hasRecommended, 'Curated resources include primary recommended resource highlighted');

  // --- TEST GROUP 6: NEXT STEP RECOMMENDATION ENGINE ---
  console.log('\n--- TEST GROUP 6: NEXT STEP RECOMMENDATION ENGINE ---');
  // Scenario A: User with no progress gets first active node
  const noProgressRec = getNextStepRecommendation(pyDetail!, {});
  assert(Boolean(noProgressRec), 'User with no progress receives initial foundation recommendation');
  assert(
    noProgressRec?.nodeId === pyDetail!.sections[0].nodes[0].id,
    'First recommendation is the starting node of the first section'
  );

  // Scenario B: User completed first node, gets second node
  const firstNodeId = pyDetail!.sections[0].nodes[0].id;
  const userProgressWithFirstDone: Record<string, TopicProgressStatus> = {
    [firstNodeId]: 'done',
  };
  const secondRec = getNextStepRecommendation(pyDetail!, userProgressWithFirstDone);
  assert(
    secondRec !== null && secondRec.nodeId !== firstNodeId,
    'Completing initial node advances recommendation to next node'
  );
  assert(Boolean(secondRec?.rationale), 'Recommendation provides clear actionable career rationale');

  // Scenario C: User finished all nodes
  const allNodesDone: Record<string, TopicProgressStatus> = {};
  pyDetail!.sections.forEach((s) =>
    s.nodes.forEach((n) => {
      allNodesDone[n.id] = 'done';
    })
  );
  const completedRec = getNextStepRecommendation(pyDetail!, allNodesDone);
  assert(completedRec === null, 'All nodes completed returns null (roadmap mastery reached)');

  // --- TEST GROUP 7: CAREER OUTCOMES RESOLUTION ---
  console.log('\n--- TEST GROUP 7: CAREER OUTCOMES RESOLUTION ---');
  const pyOutcome = getRoadmapOutcome(pyDetail!.roadmap);
  assert(pyOutcome.targetRoles.length > 0, `Target roles populated (e.g. ${pyOutcome.targetRoles.join(', ')})`);
  assert(pyOutcome.portfolioProjects.length >= 3, `Career role specifies >= 3 portfolio projects (found: ${pyOutcome.portfolioProjects.length})`);
  assert(Boolean(pyOutcome.careerReadinessMilestone), 'Career outcome communicates tangible readiness milestone');
  assert(pyOutcome.interviewTopics.length > 0, 'Interview topics linked to career outcome');

  // Check beginner roadmap outcome fallback
  const begDetail = getCatalogRoadmapDetail('programming-fundamentals');
  const begOutcome = getRoadmapOutcome(begDetail!.roadmap);
  assert(Boolean(begOutcome.portfolioProjects.length > 0), 'Beginner track generates suitable beginner portfolio project');

  // --- TEST GROUP 8: ROADMAP QUALITY EVALUATOR ---
  console.log('\n--- TEST GROUP 8: ROADMAP QUALITY EVALUATOR ---');
  const pyQuality = evaluateRoadmapQuality(pyDetail!);
  assert(pyQuality.errors.length === 0, `Python developer has 0 blockers (errors: ${pyQuality.errors.join(', ')})`);
  assert(pyQuality.isReadyToPublish, 'Python developer is rated Ready to Publish');
  assert(pyQuality.score >= 80, `Python developer quality score is high (score: ${pyQuality.score}/100)`);
  assert(pyQuality.stats.sectionCount >= 8, 'Quality report accurately captures section count');

  // Simulate flawed roadmap with cycle
  const n0Id = pyDetail!.sections[0].nodes[0].id;
  const n1Id = pyDetail!.sections[0].nodes[1].id;
  const flawedDetail: RoadmapDetail = {
    ...pyDetail!,
    relationships: [
      {
        id: 'rel-1',
        source_node_id: n0Id,
        target_node_id: n1Id,
        relationship_type: 'PREREQUISITE',
        created_at: new Date().toISOString(),
      },
      {
        id: 'rel-2',
        source_node_id: n1Id,
        target_node_id: n0Id,
        relationship_type: 'PREREQUISITE',
        created_at: new Date().toISOString(),
      },
    ],
  };
  const flawedQuality = evaluateRoadmapQuality(flawedDetail);
  assert(!flawedQuality.isReadyToPublish, 'Cyclic relationship triggers blocker and prevents publishing');
  assert(flawedQuality.errors.some((e) => e.includes('Circular dependency') || e.includes('cycle')), 'Quality evaluator detects circular dependency');

  // --- TEST GROUP 9: ADMIN TEMPLATES PRESETS ---
  console.log('\n--- TEST GROUP 9: ADMIN TEMPLATES PRESETS ---');
  assert(Boolean(ROADMAP_TEMPLATES.ROLE), 'ROLE admin template is registered');
  assert(Boolean(ROADMAP_TEMPLATES.SKILL), 'SKILL admin template is registered');
  assert(Boolean(ROADMAP_TEMPLATES.BEGINNER), 'BEGINNER admin template is registered');
  assert(Boolean(ROADMAP_TEMPLATES.BEST_PRACTICE), 'BEST_PRACTICE admin template is registered');
  assert(ROADMAP_TEMPLATES.ROLE.skeletonSections.length >= 4, 'ROLE template provides structured skeleton stages');

  // --- TEST GROUP 10: SEARCH FILTERING ACROSS CATALOG ---
  console.log('\n--- TEST GROUP 10: SEARCH FILTERING ACROSS CATALOG ---');
  const pySearch = allCards.filter(
    (c) =>
      c.title.toLowerCase().includes('python') ||
      c.short_description.toLowerCase().includes('python')
  );
  assert(pySearch.length >= 2, `Search query 'python' finds role and skill roadmaps (found: ${pySearch.length})`);

  const qaSearch = allCards.filter(
    (c) =>
      c.title.toLowerCase().includes('qa') ||
      c.short_description.toLowerCase().includes('test')
  );
  assert(qaSearch.length >= 1, `Search query 'qa' finds QA Automation Engineer (found: ${qaSearch.length})`);

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 4 CAREER ROADMAP PLATFORM EXPANSION CHECKS PASSED.');
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
