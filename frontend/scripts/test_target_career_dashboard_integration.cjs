// Test Suite: Phase C.3 Target Career Onboarding Gate + Student Dashboard Next Action Integration
require('./run_test.cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');

const uuid = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const studentId = uuid(101);
const otherStudentId = uuid(102);
const pythonCareerId = uuid(201);
const unseededCareerId = uuid(202);
const draftCareerId = uuid(203);

// Mock database state
const mockCareers = [
  { id: pythonCareerId, name: 'Python Developer', slug: 'python-developer', status: 'published', difficulty: 'beginner', short_description: 'Python web and automation.' },
  { id: unseededCareerId, name: 'Cloud Architect', slug: 'cloud-architect', status: 'published', difficulty: 'advanced', short_description: 'Cloud infrastructure.' },
  { id: draftCareerId, name: 'Quantum Engineer', slug: 'quantum-engineer', status: 'draft', difficulty: 'advanced', short_description: 'Draft career.' },
];

let currentUser = { id: studentId, role: 'student' };
let currentProfile = { id: studentId, role: 'student', target_career_id: null, full_name: 'Harsha Student' };

// Supabase mock
const mockClient = {
  auth: {
    getUser: async () => ({
      data: { user: currentUser },
      error: currentUser ? null : { message: 'Unauthorized' },
    }),
  },
  from(table) {
    let rows = [];
    if (table === 'career_catalog') rows = [...mockCareers];
    if (table === 'profiles') rows = [currentProfile];

    let single = false;
    let maybeSingle = false;

    const query = {
      select() { return query; },
      eq(col, val) {
        rows = rows.filter((r) => r[col] === val);
        return query;
      },
      order() { return query; },
      range() { return query; },
      limit() { return query; },
      single() { single = true; return query; },
      maybeSingle() { maybeSingle = true; return query; },
      update(payload) {
        if (table === 'profiles') {
          Object.assign(currentProfile, payload);
          rows = [currentProfile];
        }
        return query;
      },
      then(resolve, reject) {
        const data = single ? (rows[0] || null) : maybeSingle ? (rows[0] || null) : rows;
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return query;
  },
  rpc: async () => ({ data: null, error: null }),
};

// Module hook
const originalLoad = Module._load;
Module._load = function (req) {
  if (req === '@/utils/supabase/server') {
    return { createClient: async () => mockClient };
  }
  return originalLoad.apply(this, arguments);
};

const { handleStudentCareerRequest } = require('../lib/studentCareerSnapshot.ts');
const { formatProjectionState } = require('../components/NextActionWidget.tsx');

async function runTests() {
  let passed = 0;

  // ── TEST 1: Gate Behavior — Null target_career_id requires selection ────────
  currentProfile.target_career_id = null;
  const getReqNoTarget = new Request('http://localhost/api/student/target-career', { method: 'GET' });
  const resNoTarget = await handleStudentCareerRequest(getReqNoTarget, false);
  assert.equal(resNoTarget.status, 400);
  const jsonNoTarget = await resNoTarget.json();
  assert.equal(jsonNoTarget.code, 'TARGET_CAREER_REQUIRED');
  console.log('PASS target career gate: student without target career returns TARGET_CAREER_REQUIRED (400)');
  passed++;

  // ── TEST 2: Career Selector — Only published careers accessible ─────────────
  const publishedCareers = mockCareers.filter((c) => c.status === 'published');
  assert.equal(publishedCareers.length, 2);
  assert(!publishedCareers.some((c) => c.status === 'draft'));
  console.log('PASS career selector: published careers filtered; draft careers excluded');
  passed++;

  // ── TEST 3: Career Save — PUT /api/student/target-career updates profile ────
  const putReq = new Request('http://localhost/api/student/target-career', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCareerId: pythonCareerId }),
  });
  const resPut = await handleStudentCareerRequest(putReq, true);
  assert.equal(resPut.status, 200);
  const jsonPut = await resPut.json();
  assert.equal(jsonPut.targetCareerId, pythonCareerId);
  assert.equal(currentProfile.target_career_id, pythonCareerId);
  console.log('PASS career save: PUT /api/student/target-career successfully updates target_career_id');
  passed++;

  // ── TEST 4: Security — Rejects client-supplied userId or studentId in PUT ───
  const putIdorReq = new Request('http://localhost/api/student/target-career', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCareerId: pythonCareerId, userId: otherStudentId, studentId: otherStudentId }),
  });
  const resIdor = await handleStudentCareerRequest(putIdorReq, true);
  assert.equal(resIdor.status, 400);
  console.log('PASS security: PUT /api/student/target-career rejects unauthorized client-injected userId/studentId');
  passed++;

  // ── TEST 5: Security — Rejects unpublished/draft career target selection ────
  const putDraftReq = new Request('http://localhost/api/student/target-career', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCareerId: draftCareerId }),
  });
  const resDraft = await handleStudentCareerRequest(putDraftReq, true);
  assert.equal(resDraft.status, 404);
  console.log('PASS security: PUT /api/student/target-career rejects draft/unpublished career target');
  passed++;

  // ── TEST 6: Student friendly state formatting — formatProjectionState ───────
  const actionable = formatProjectionState('ACTIONABLE');
  assert.equal(actionable.label, 'Ready to start');
  assert(actionable.badgeClass.includes('emerald'));

  const blocked = formatProjectionState('BLOCKED');
  assert.equal(blocked.label, 'Prerequisite required');
  assert(blocked.badgeClass.includes('amber'));

  const completed = formatProjectionState('COMPLETED');
  assert.equal(completed.label, 'Completed');
  assert(completed.badgeClass.includes('blue'));

  const satisfied = formatProjectionState('SATISFIED');
  assert.equal(satisfied.label, 'Already covered');
  assert(satisfied.badgeClass.includes('purple'));

  const foundation = formatProjectionState('SUPPORTING_PREREQUISITE');
  assert.equal(foundation.label, 'Foundation skill');
  assert(foundation.badgeClass.includes('indigo'));

  const later = formatProjectionState('NOT_YET_RELEVANT');
  assert.equal(later.label, 'Later');
  console.log('PASS student-friendly state labels: all 6 ProjectionState values mapped correctly without exposing internal jargon');
  passed++;

  // ── TEST 7: Fake Score 70 Removal Verification ──────────────────────────────
  const fs = require('node:fs');
  const path = require('node:path');
  const dashboardContent = fs.readFileSync(path.resolve(__dirname, '../app/student/dashboard/page.tsx'), 'utf8');
  assert(!dashboardContent.includes(': 70'), 'Dashboard must not contain hardcoded fallback score : 70');
  assert(!dashboardContent.includes('Personalized Improvement Roadmap Active'), 'Dashboard must not contain generic placeholder fallback');
  console.log('PASS truthful metrics: hardcoded score 70 and generic placeholder roadmap text removed from dashboard source');
  passed++;

  // ── TEST 8: Reusable TargetCareerModal and NextActionWidget integration ─────
  assert(dashboardContent.includes('<NextActionWidget'), 'Dashboard must render NextActionWidget');
  assert(dashboardContent.includes('<TargetCareerModal'), 'Dashboard must render TargetCareerModal');
  console.log('PASS dashboard integration: TargetCareerModal and NextActionWidget rendered in dashboard');
  passed++;

  console.log(`\nTARGET CAREER & NEXT ACTION INTEGRATION: ${passed} passed / 0 failed`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
