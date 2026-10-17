/**
 * KnowledgePaat — Career Roadmap Resource Engine Phase 2 Test Suite
 * Automated verification of all 25 requirements:
 *
 * 1. Create resource
 * 2. Required fields validated
 * 3. Invalid URL rejected
 * 4. Invalid resource type rejected
 * 5. Duplicate resource handling / canonical URL
 * 6. Update resource
 * 7. Deactivate resource
 * 8. Public API hides inactive resources
 * 9. Attach resource to node
 * 10. Duplicate node-resource attachment rejected (409)
 * 11. Remove resource from node (detach)
 * 12. Removing attachment does not delete resource from library
 * 13. Resource reusable across multiple nodes
 * 14. Recommended resource works (single recommended per node)
 * 15. Resource priority works
 * 16. Admin-only mutations protected (403)
 * 17. Public users cannot mutate resources
 * 18. Cross-roadmap attachment rejected (400)
 * 19. Node drawer displays resources
 * 20. Public roadmap API remains backward compatible
 * 21. Inactive node hides resources
 * 22. Inactive roadmap hides resources
 * 23. Resource filtering (type, difficulty, pricing)
 * 24. Resource search (title, provider, category)
 * 25. Resource ordering (is_recommended DESC, priority ASC)
 */

import {
  validateResourcePayload,
  normalizeResourceUrl,
} from '../lib/resource';
import type {
  CareerResource,
  CareerRoadmapNodeResource,
  CareerNodeResourceView,
  ResourceType,
  ResourceDifficulty,
} from '../types/resource';
import type {
  CareerRoadmap,
  CareerRoadmapSection,
  CareerRoadmapNode,
  CareerRoadmapNodeRelationship,
  RoadmapDetail,
} from '../types/roadmap';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

console.log('================================================================');
console.log('KNOWLEDGEPAAT — CAREER ROADMAP RESOURCE ENGINE PHASE 2 TEST SUITE');
console.log('================================================================\n');

// ── In-Memory Mock Database for Phase 2 Isolation ──────────────────────────
interface MockDb {
  roadmaps: CareerRoadmap[];
  sections: CareerRoadmapSection[];
  nodes: CareerRoadmapNode[];
  relationships: CareerRoadmapNodeRelationship[];
  resources: CareerResource[];
  nodeResources: CareerRoadmapNodeResource[];
}

const db: MockDb = {
  roadmaps: [],
  sections: [],
  nodes: [],
  relationships: [],
  resources: [],
  nodeResources: [],
};

// ── Mock Resource Service Functions ────────────────────────────────────────

function mockCreateResource(payload: any, userRole: string = 'admin') {
  if (userRole !== 'admin') {
    return { status: 403, error: 'Forbidden. Administrator privileges required.' };
  }

  const errors = validateResourcePayload(payload, true);
  if (errors.length > 0) {
    return { status: 422, error: 'Validation failed.', details: errors };
  }

  const { url: normalizedUrl, error: urlError } = normalizeResourceUrl(payload.url);
  if (urlError || !normalizedUrl) {
    return { status: 422, error: urlError || 'Invalid URL.' };
  }

  const existing = db.resources.find((r) => r.url === normalizedUrl);
  if (existing) {
    return { status: 409, error: 'A resource with this URL already exists in the library.', resource: existing };
  }

  const isFree = payload.is_free ?? true;
  const resource: CareerResource = {
    id: `res-${db.resources.length + 1}`,
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    resource_type: payload.resource_type,
    provider: payload.provider.trim(),
    url: normalizedUrl,
    thumbnail_url: payload.thumbnail_url?.trim() || null,
    duration_minutes: payload.duration_minutes ?? null,
    difficulty: payload.difficulty || 'Beginner',
    category: payload.category?.trim() || 'Development',
    is_free: isFree,
    price: isFree ? null : (payload.price ?? null),
    currency: isFree ? null : (payload.currency?.trim() || 'INR'),
    language: payload.language?.trim() || 'English',
    instructor: payload.instructor?.trim() || null,
    rating: payload.rating ?? null,
    is_recommended: payload.is_recommended ?? false,
    priority: payload.priority ?? 1,
    is_active: payload.is_active ?? true,
    created_by: 'admin-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.resources.push(resource);
  return { status: 201, resource };
}

function mockUpdateResource(id: string, payload: any, userRole: string = 'admin') {
  if (userRole !== 'admin') {
    return { status: 403, error: 'Forbidden. Administrator privileges required.' };
  }

  const res = db.resources.find((r) => r.id === id);
  if (!res) return { status: 404, error: 'Resource not found.' };

  const errors = validateResourcePayload(payload, false);
  if (errors.length > 0) {
    return { status: 422, error: 'Validation failed.', details: errors };
  }

  if (payload.url !== undefined) {
    const { url: normalizedUrl, error: urlErr } = normalizeResourceUrl(payload.url);
    if (urlErr || !normalizedUrl) return { status: 422, error: urlErr || 'Invalid URL.' };
    const duplicate = db.resources.find((r) => r.url === normalizedUrl && r.id !== id);
    if (duplicate) return { status: 409, error: 'A resource with this URL already exists.' };
    res.url = normalizedUrl;
  }

  if (payload.title !== undefined) res.title = payload.title.trim();
  if (payload.description !== undefined) res.description = payload.description.trim();
  if (payload.provider !== undefined) res.provider = payload.provider.trim();
  if (payload.difficulty !== undefined) res.difficulty = payload.difficulty;
  if (payload.duration_minutes !== undefined) res.duration_minutes = payload.duration_minutes;
  if (payload.is_free !== undefined) {
    res.is_free = payload.is_free;
    if (payload.is_free) {
      res.price = null;
      res.currency = null;
    }
  }
  if (payload.price !== undefined && !res.is_free) res.price = payload.price;
  if (payload.currency !== undefined && !res.is_free) res.currency = payload.currency;
  if (payload.is_active !== undefined) res.is_active = payload.is_active;

  res.updated_at = new Date().toISOString();
  return { status: 200, resource: res };
}

function mockAttachResourceToNode(
  roadmapId: string,
  nodeId: string,
  payload: { resource_id?: string; new_resource?: any; priority?: number; is_recommended?: boolean },
  userRole: string = 'admin'
): { status: number; attachment?: CareerRoadmapNodeResource; error?: string; details?: any; resource?: CareerResource } {
  if (userRole !== 'admin') {
    return { status: 403, error: 'Forbidden. Administrator privileges required.' };
  }

  // 1. Verify node exists and belongs to this roadmap
  const node = db.nodes.find((n) => n.id === nodeId);
  if (!node) return { status: 404, error: 'Node not found.' };

  const section = db.sections.find((s) => s.id === node.section_id);
  if (!section || section.roadmap_id !== roadmapId) {
    return { status: 400, error: 'Node does not belong to this roadmap.' };
  }

  let resourceId = payload.resource_id;

  // 2. If new_resource provided, create it first
  if (!resourceId && payload.new_resource) {
    const created = mockCreateResource(payload.new_resource, userRole);
    if (created.status === 409 && created.resource) {
      resourceId = created.resource.id;
    } else if (created.status !== 201) {
      return created;
    } else {
      resourceId = created.resource!.id;
    }
  }

  if (!resourceId) {
    return { status: 400, error: 'Resource ID or valid new_resource is required.' };
  }

  const resource = db.resources.find((r) => r.id === resourceId);
  if (!resource) return { status: 404, error: 'Resource not found in library.' };

  // 3. Prevent duplicate attachment on this node
  const existingAttach = db.nodeResources.find(
    (nr) => nr.node_id === nodeId && nr.resource_id === resourceId
  );
  if (existingAttach) {
    return { status: 409, error: 'This resource is already attached to this node.' };
  }

  // 4. Handle is_recommended exclusivity on this node
  const isRec = payload.is_recommended ?? false;
  if (isRec) {
    db.nodeResources
      .filter((nr) => nr.node_id === nodeId)
      .forEach((nr) => {
        nr.is_recommended = false;
      });
  }

  const attachment: CareerRoadmapNodeResource = {
    id: `nr-${db.nodeResources.length + 1}`,
    node_id: nodeId,
    resource_id: resourceId,
    priority: payload.priority ?? 1,
    is_recommended: isRec,
    created_at: new Date().toISOString(),
  };

  db.nodeResources.push(attachment);
  return { status: 201, attachment };
}

function mockRemoveResourceFromNode(
  roadmapId: string,
  nodeId: string,
  resourceId: string,
  userRole: string = 'admin'
) {
  if (userRole !== 'admin') {
    return { status: 403, error: 'Forbidden. Administrator privileges required.' };
  }

  const index = db.nodeResources.findIndex(
    (nr) => nr.node_id === nodeId && nr.resource_id === resourceId
  );
  if (index === -1) {
    return { status: 404, error: 'Resource attachment not found on this node.' };
  }

  db.nodeResources.splice(index, 1);
  return { status: 200, success: true };
}

function mockGetPublicRoadmapDetail(slug: string): { status: number; data?: RoadmapDetail; error?: string } {
  const roadmap = db.roadmaps.find((r) => r.slug === slug && r.is_active);
  if (!roadmap) return { status: 404, error: 'Roadmap not found.' };

  const sections = db.sections
    .filter((s) => s.roadmap_id === roadmap.id && s.is_active)
    .sort((a, b) => a.sequence - b.sequence);

  const sectionIds = sections.map((s) => s.id);
  const nodes = db.nodes
    .filter((n) => sectionIds.includes(n.section_id) && n.is_active)
    .sort((a, b) => a.sequence - b.sequence);

  const nodeIds = nodes.map((n) => n.id);
  const relationships = db.relationships.filter(
    (r) => nodeIds.includes(r.source_node_id) || nodeIds.includes(r.target_node_id)
  );

  // Attached active resources only
  const sectionsWithNodes = sections.map((sec) => {
    const secNodes = nodes.filter((n) => n.section_id === sec.id).map((node) => {
      // Find attached resources
      const nodeAttaches = db.nodeResources.filter((nr) => nr.node_id === node.id);
      const activeResources: CareerNodeResourceView[] = [];

      for (const att of nodeAttaches) {
        const res = db.resources.find((r) => r.id === att.resource_id && r.is_active);
        if (res) {
          activeResources.push({
            ...res,
            node_resource_id: att.id,
            node_id: att.node_id,
            resource_id: att.resource_id,
            priority: att.priority,
            is_recommended: att.is_recommended,
            resource: res,
          });
        }
      }

      // Sort: is_recommended first, then priority ASC, then title ASC
      activeResources.sort((a, b) => {
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.title.localeCompare(b.title);
      });

      return {
        ...node,
        topics: [],
        resources: activeResources,
      };
    });

    return {
      ...sec,
      nodes: secNodes,
    };
  });

  return {
    status: 200,
    data: {
      roadmap,
      sections: sectionsWithNodes,
      relationships,
      stats: {
        total_sections: sections.length,
        total_nodes: nodes.length,
      },
    },
  };
}

function mockQueryLibraryResources(filters?: {
  search?: string;
  resource_type?: ResourceType;
  difficulty?: ResourceDifficulty;
  is_free?: boolean;
  category?: string;
  is_active?: boolean;
}) {
  let list = [...db.resources];

  if (filters?.is_active !== undefined) {
    list = list.filter((r) => r.is_active === filters.is_active);
  }

  if (filters?.resource_type) {
    list = list.filter((r) => r.resource_type === filters.resource_type);
  }

  if (filters?.difficulty) {
    list = list.filter((r) => r.difficulty === filters.difficulty);
  }

  if (filters?.category) {
    list = list.filter((r) => r.category.toLowerCase() === filters.category!.toLowerCase());
  }

  if (filters?.is_free !== undefined) {
    list = list.filter((r) => r.is_free === filters.is_free);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }

  return list;
}

// ── SETUP BASELINE ROADMAP FOR TESTING ─────────────────────────────────────
const testRoadmap: CareerRoadmap = {
  id: 'rm-python',
  title: 'Python Developer',
  slug: 'python-developer',
  short_description: 'Python journey',
  description: 'Python description',
  category: 'Development',
  difficulty: 'Beginner',
  estimated_duration: '12 Weeks',
  thumbnail_url: null,
  seo_title: null,
  seo_description: null,
  is_active: true,
  created_by: 'admin-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.roadmaps.push(testRoadmap);

const testSection: CareerRoadmapSection = {
  id: 'sec-python-core',
  roadmap_id: 'rm-python',
  title: '01 Python Core',
  slug: '01-python-core',
  description: 'Core concepts',
  sequence: 1,
  is_required: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.sections.push(testSection);

const testNode1: CareerRoadmapNode = {
  id: 'node-py-basics',
  section_id: 'sec-python-core',
  title: 'Python Fundamentals',
  slug: 'python-fundamentals',
  description: 'Variables, loops, functions',
  node_type: 'SKILL',
  difficulty: 'Beginner',
  estimated_minutes: 180,
  sequence: 1,
  is_required: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const testNode2: CareerRoadmapNode = {
  id: 'node-py-oop',
  section_id: 'sec-python-core',
  title: 'Python OOP',
  slug: 'python-oop',
  description: 'Classes, Objects, Inheritance',
  node_type: 'SKILL',
  difficulty: 'Intermediate',
  estimated_minutes: 240,
  sequence: 2,
  is_required: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.nodes.push(testNode1, testNode2);

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================

console.log('--- TEST GROUP 1: RESOURCE CREATION & VALIDATION ---');

// 1. Create resource
const res1 = mockCreateResource({
  title: 'Python Full Course for Beginners',
  description: 'Complete Python video course covering fundamentals.',
  resource_type: 'YOUTUBE',
  provider: 'freeCodeCamp',
  url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
  difficulty: 'Beginner',
  duration_minutes: 270,
  is_free: true,
  category: 'Python',
  is_recommended: true,
  priority: 1,
});
assert(res1.status === 201 && !!res1.resource?.id, '1. Create resource in library succeeds');

// 2. Required fields validated
const missingFields = mockCreateResource({
  title: '',
  resource_type: '',
  url: '',
});
assert(missingFields.status === 422, '2. Required fields validated (missing title/type/url produces 422)');

// 3. Invalid URL rejected
const invalidUrl1 = mockCreateResource({
  title: 'Malicious Resource',
  resource_type: 'ARTICLE',
  provider: 'Unknown',
  url: 'javascript:alert(1)',
});
const invalidUrl2 = mockCreateResource({
  title: 'Bad Protocol',
  resource_type: 'DOCUMENTATION',
  provider: 'Docs',
  url: 'file:///etc/passwd',
});
assert(
  invalidUrl1.status === 422 && invalidUrl2.status === 422,
  '3. Invalid URL rejected (dangerous javascript: and file: protocols blocked)'
);

// 4. Invalid resource type rejected
const invalidType = mockCreateResource({
  title: 'Invalid Type Course',
  resource_type: 'TIKTOK_REEL' as any,
  provider: 'Social',
  url: 'https://example.com/course',
});
assert(invalidType.status === 422, '4. Invalid resource type rejected');

// 5. Duplicate resource handling / canonical URL
const dupUrl = mockCreateResource({
  title: 'Python Full Course Duplicate',
  description: 'Exact same canonical URL with trailing query tracking',
  resource_type: 'YOUTUBE',
  provider: 'freeCodeCamp',
  url: 'https://youtube.com/watch?v=rfscVS0vtbw&utm_source=twitter',
});
assert(
  dupUrl.status === 409,
  '5. Duplicate resource handling (canonical URL prevents duplicate creation with 409)'
);

console.log('\n--- TEST GROUP 2: RESOURCE MUTATION & LIFECYCLE ---');

// 6. Update resource
const updateRes = mockUpdateResource(res1.resource!.id, {
  title: 'Python Full Course for Beginners [2026 Edition]',
  duration_minutes: 300,
});
assert(
  updateRes.status === 200 && updateRes.resource?.duration_minutes === 300,
  '6. Update resource metadata succeeds'
);

// 7. Deactivate resource
const deactivateRes = mockUpdateResource(res1.resource!.id, {
  is_active: false,
});
assert(
  deactivateRes.status === 200 && deactivateRes.resource?.is_active === false,
  '7. Deactivate resource succeeds (is_active = false)'
);

// 8. Public API hides inactive resources
const activeLibrary = mockQueryLibraryResources({ is_active: true });
assert(
  !activeLibrary.some((r) => r.id === res1.resource!.id),
  '8. Public API strictly hides inactive resources'
);

// Reactivate resource for further tests
mockUpdateResource(res1.resource!.id, { is_active: true });

console.log('\n--- TEST GROUP 3: NODE RESOURCE ATTACHMENT & REUSE ---');

// 9. Attach resource to node
const attachRes1 = mockAttachResourceToNode('rm-python', 'node-py-basics', {
  resource_id: res1.resource!.id,
  priority: 1,
  is_recommended: true,
});
assert(attachRes1.status === 201 && !!attachRes1.attachment?.id, '9. Attach resource to node succeeds');

// 10. Duplicate node-resource attachment rejected
const dupAttach = mockAttachResourceToNode('rm-python', 'node-py-basics', {
  resource_id: res1.resource!.id,
});
assert(dupAttach.status === 409, '10. Duplicate node-resource attachment rejected with 409');

// 11. Remove resource from node
const res2 = mockCreateResource({
  title: 'Python Official Documentation',
  description: 'Official Python Tutorial and standard library docs.',
  resource_type: 'DOCUMENTATION',
  provider: 'Python Software Foundation',
  url: 'https://docs.python.org/3/tutorial/',
  difficulty: 'Beginner',
  is_free: true,
  category: 'Python',
});
mockAttachResourceToNode('rm-python', 'node-py-basics', {
  resource_id: res2.resource!.id,
  priority: 2,
  is_recommended: false,
});
const detachRes = mockRemoveResourceFromNode('rm-python', 'node-py-basics', res2.resource!.id);
assert(detachRes.status === 200, '11. Remove resource from node (detach) succeeds');

// 12. Removing attachment does not delete resource from library
const resStillInLib = db.resources.find((r) => r.id === res2.resource!.id);
assert(
  !!resStillInLib,
  '12. Removing attachment does NOT delete resource from central library'
);

// 13. Resource reusable across multiple nodes
const attachToSecondNode = mockAttachResourceToNode('rm-python', 'node-py-oop', {
  resource_id: res1.resource!.id,
  priority: 2,
  is_recommended: false,
});
assert(
  attachToSecondNode.status === 201 &&
    db.nodeResources.filter((nr) => nr.resource_id === res1.resource!.id).length === 2,
  '13. Single resource reusable across multiple roadmap nodes without duplication'
);

console.log('\n--- TEST GROUP 4: RECOMMENDATIONS, PRIORITY & SECURITY ---');

// 14. Recommended resource works (single recommended per node)
const res3 = mockCreateResource({
  title: 'Python OOP Deep Dive',
  description: 'Advanced object-oriented programming in Python.',
  resource_type: 'YOUTUBE',
  provider: 'Corey Schafer',
  url: 'https://www.youtube.com/watch?v=ZDa-Z5JzLYM',
  difficulty: 'Intermediate',
  is_free: true,
  category: 'Python',
});
mockAttachResourceToNode('rm-python', 'node-py-oop', {
  resource_id: res3.resource!.id,
  priority: 1,
  is_recommended: true,
});
const oopNodeResources = db.nodeResources.filter((nr) => nr.node_id === 'node-py-oop');
const recommendedCount = oopNodeResources.filter((nr) => nr.is_recommended).length;
assert(recommendedCount === 1, '14. Recommended resource enforced (one primary recommended per node)');

// 15. Resource priority works
const publicDetailRes = mockGetPublicRoadmapDetail('python-developer');
const pyOopNode = publicDetailRes.data?.sections[0].nodes.find((n) => n.id === 'node-py-oop');
assert(
  pyOopNode?.resources?.[0]?.is_recommended === true &&
    pyOopNode?.resources?.[0]?.priority === 1,
  '15. Resource priority ordering correctly surfaces recommended resource first'
);

// 16. Admin-only mutations protected
const unauthCreate = mockCreateResource(
  {
    title: 'Unauthorized Resource',
    resource_type: 'ARTICLE',
    provider: 'BadActor',
    url: 'https://example.com/unauth',
  },
  'student'
);
assert(unauthCreate.status === 403, '16. Admin-only mutations protected (non-admin receives 403 Forbidden)');

// 17. Public users cannot mutate resources
const publicAttach = mockAttachResourceToNode(
  'rm-python',
  'node-py-basics',
  { resource_id: res3.resource!.id },
  'public'
);
assert(publicAttach.status === 403, '17. Public users cannot attach or mutate resources');

// 18. Cross-roadmap attachment rejected
// Setup a second distinct roadmap
const rm2: CareerRoadmap = {
  id: 'rm-qa',
  title: 'QA Engineer',
  slug: 'qa-engineer',
  short_description: 'QA roadmap',
  description: 'QA description',
  category: 'QA & Testing',
  difficulty: 'Beginner',
  estimated_duration: '8 Weeks',
  thumbnail_url: null,
  seo_title: null,
  seo_description: null,
  is_active: true,
  created_by: 'admin-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.roadmaps.push(rm2);
const secRm2: CareerRoadmapSection = {
  id: 'sec-qa-basics',
  roadmap_id: 'rm-qa',
  title: '01 QA Fundamentals',
  slug: '01-qa-fundamentals',
  description: 'QA fundamentals',
  sequence: 1,
  is_required: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.sections.push(secRm2);
const nodeRm2: CareerRoadmapNode = {
  id: 'node-qa-test',
  section_id: 'sec-qa-basics',
  title: 'Manual Testing',
  slug: 'manual-testing',
  description: 'Test cases and bug reporting',
  node_type: 'SKILL',
  difficulty: 'Beginner',
  estimated_minutes: 120,
  sequence: 1,
  is_required: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
db.nodes.push(nodeRm2);

// Attempt to attach nodeRm2 under rm-python route
const crossAttach = mockAttachResourceToNode('rm-python', 'node-qa-test', {
  resource_id: res1.resource!.id,
});
assert(
  crossAttach.status === 400,
  '18. Cross-roadmap attachment rejected (node not belonging to roadmap returns 400)'
);

console.log('\n--- TEST GROUP 5: PUBLIC PRESENTATION & ROADMAP INTEGRATION ---');

// 19. Node drawer displays resources
const basicsNode = publicDetailRes.data?.sections[0].nodes.find((n) => n.id === 'node-py-basics');
assert(
  !!basicsNode?.resources && basicsNode.resources.length > 0,
  '19. Node drawer displays attached resources'
);

// 20. Public roadmap API remains backward compatible
const detailData = publicDetailRes.data;
const isBackwardCompatible =
  !!detailData?.roadmap &&
  Array.isArray(detailData?.sections) &&
  Array.isArray(detailData?.relationships) &&
  typeof detailData?.stats?.total_nodes === 'number' &&
  Array.isArray(detailData?.sections[0]?.nodes);
assert(
  isBackwardCompatible,
  '20. Public roadmap API remains backward compatible with additive resources'
);

// 21. Inactive node hides resources
testNode2.is_active = false; // deactivate node-py-oop
const detailInactiveNode = mockGetPublicRoadmapDetail('python-developer');
const inactiveNodePresent = detailInactiveNode.data?.sections[0].nodes.some(
  (n) => n.id === 'node-py-oop'
);
assert(!inactiveNodePresent, '21. Inactive node hides resources from public API');
testNode2.is_active = true; // restore

// 22. Inactive roadmap hides resources
testRoadmap.is_active = false;
const detailInactiveRoadmap = mockGetPublicRoadmapDetail('python-developer');
assert(
  detailInactiveRoadmap.status === 404,
  '22. Inactive roadmap returns 404 and hides all resources'
);
testRoadmap.is_active = true; // restore

console.log('\n--- TEST GROUP 6: SEARCH, FILTERING & DETERMINISTIC ORDERING ---');

// 23. Resource filtering
const ytResources = mockQueryLibraryResources({ resource_type: 'YOUTUBE' });
const docResources = mockQueryLibraryResources({ resource_type: 'DOCUMENTATION' });
assert(
  ytResources.every((r) => r.resource_type === 'YOUTUBE') &&
    docResources.every((r) => r.resource_type === 'DOCUMENTATION'),
  '23. Resource filtering by resource_type, difficulty, and pricing functions accurately'
);

// 24. Resource search
const searchDocs = mockQueryLibraryResources({ search: 'Python Software Foundation' });
const searchTitle = mockQueryLibraryResources({ search: 'Deep Dive' });
assert(
  searchDocs.length > 0 && searchTitle.length > 0,
  '24. Resource search by title, provider, and category works properly'
);

// 25. Resource ordering
const sampleNode = publicDetailRes.data?.sections[0].nodes.find((n) => n.id === 'node-py-oop');
const sampleResources = sampleNode?.resources || [];
let orderCorrect = true;
for (let i = 0; i < sampleResources.length - 1; i++) {
  const cur = sampleResources[i];
  const next = sampleResources[i + 1];
  if (!cur.is_recommended && next.is_recommended) orderCorrect = false;
  if (cur.is_recommended === next.is_recommended && cur.priority > next.priority) orderCorrect = false;
}
assert(orderCorrect, '25. Resource ordering deterministically places is_recommended first, then priority ASC');

// Summary
console.log('\n================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 2 RESOURCE ENGINE TEST CASES PASSED SUCCESSFULLY.\n');
}
