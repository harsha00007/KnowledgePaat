export {};

console.log('====================================================');
console.log('GRADZENX: PURCHASED NOTES NAVIGATION & ACCESS SUITE');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// ── TEST 1: Purchases Route Construction ──────────────────────────────────
console.log('--- TEST 1: Purchases Route Construction ---');

interface MockProduct {
  id: string;
  title: string;
  product_type: 'note' | 'note_bundle' | 'question_pack' | 'interview_bundle';
  item_reference_id?: string | null;
}

function computeTargetRoute(product: MockProduct, attachedNoteIds: string[] = []): string {
  if (product.item_reference_id) {
    return `/student/notes?noteId=${encodeURIComponent(product.item_reference_id)}`;
  } else if (attachedNoteIds.length === 1) {
    return `/student/notes?noteId=${encodeURIComponent(attachedNoteIds[0])}`;
  } else if (attachedNoteIds.length > 1 || product.product_type === 'note_bundle' || product.product_type === 'interview_bundle') {
    return `/student/notes?bundleId=${encodeURIComponent(product.id)}`;
  }
  return `/student/notes?noteId=${encodeURIComponent(product.id)}`;
}

const singleNoteProd: MockProduct = {
  id: 'prod-single-python',
  title: 'Python Mastery Notes',
  product_type: 'note',
  item_reference_id: 'note-py-101',
};

const noteBundleProd: MockProduct = {
  id: 'prod-bundle-fullstack',
  title: 'Full Stack Engineering Bundle',
  product_type: 'note_bundle',
};

const qPackProd: MockProduct = {
  id: '4b113d8c-df1e-49c0-9426-c6e2197b8b34',
  title: 'etest',
  product_type: 'question_pack',
};

assert(computeTargetRoute(singleNoteProd) === '/student/notes?noteId=note-py-101', 'Single note purchase routes directly to /student/notes?noteId=note-py-101');
assert(computeTargetRoute(noteBundleProd) === '/student/notes?bundleId=prod-bundle-fullstack', 'Notes bundle purchase routes to /student/notes?bundleId=prod-bundle-fullstack');
assert(computeTargetRoute(qPackProd) === '/student/notes?noteId=4b113d8c-df1e-49c0-9426-c6e2197b8b34', 'etest purchase routes directly to /student/notes?noteId=4b113d8c-df1e-49c0-9426-c6e2197b8b34');
// ── TEST 2: Note Auto-Open & Modal Triggering on Navigation ─────────────────
console.log('\n--- TEST 2: Note Auto-Open & Modal Triggering on Navigation ---');

interface MockNote {
  id: string;
  title: string;
  category: string;
  minimum_plan?: string;
}

const mockNotesLibrary: MockNote[] = [
  { id: 'note-py-101', title: 'Python Cheatsheet', category: 'Programming', minimum_plan: 'starter' },
  { id: 'note-sql-202', title: 'SQL Queries Guide', category: 'Technical Interview', minimum_plan: 'starter' },
  { id: 'note-react-303', title: 'React Revision Sheet', category: 'Programming', minimum_plan: 'pro' },
];

function handleNoteUrlParam(paramNoteId: string | null, notes: MockNote[]) {
  if (!paramNoteId) return { selectedNote: null, isModalOpen: false };
  const targetNote = notes.find(n => n.id === paramNoteId);
  if (targetNote) {
    return { selectedNote: targetNote, isModalOpen: true, highlightedId: targetNote.id };
  }
  return { selectedNote: null, isModalOpen: false };
}

const navResult = handleNoteUrlParam('note-py-101', mockNotesLibrary);
assert(navResult.isModalOpen === true, 'Modal automatically opens when noteId param is provided');
assert(navResult.selectedNote?.id === 'note-py-101', 'Modal selected note is exactly the purchased note (Python Cheatsheet)');
assert(navResult.highlightedId === 'note-py-101', 'Card is highlighted in notes grid');

// ── TEST 3: Bundle Filtering on Navigation ────────────────────────────────
console.log('\n--- TEST 3: Bundle Filtering on Navigation ---');

const mockBundleJunction = [
  { product_id: 'prod-bundle-fullstack', note_id: 'note-py-101' },
  { product_id: 'prod-bundle-fullstack', note_id: 'note-react-303' },
];

function handleBundleUrlParam(paramBundleId: string | null, junction: { product_id: string; note_id: string }[], notes: MockNote[]) {
  if (!paramBundleId) return notes;
  const bundleNoteIds = new Set(junction.filter(j => j.product_id === paramBundleId).map(j => j.note_id));
  return notes.filter(n => bundleNoteIds.has(n.id));
}

const bundleFilteredNotes = handleBundleUrlParam('prod-bundle-fullstack', mockBundleJunction, mockNotesLibrary);
assert(bundleFilteredNotes.length === 2, 'Bundle navigation filters to exactly the 2 notes in the bundle');
assert(bundleFilteredNotes.some(n => n.id === 'note-py-101'), 'Bundle includes Python note');
assert(bundleFilteredNotes.some(n => n.id === 'note-react-303'), 'Bundle includes React note');
assert(!bundleFilteredNotes.some(n => n.id === 'note-sql-202'), 'Bundle excludes unlinked SQL note');

// ── TEST 4: Purchased Access & Download Entitlement ────────────────────────
console.log('\n--- TEST 4: Purchased Access & Download Entitlement ---');

const studentOwnedNoteIds = new Set(['note-py-101', 'note-react-303']);
const studentUserAccess = {
  hasAccess: (plan: string) => plan === 'free', // Free tier student
};

function checkAccess(note: MockNote, ownedNoteIds: Set<string>, userAccess: { hasAccess: (p: string) => boolean }): boolean {
  if (userAccess.hasAccess(note.minimum_plan || 'free')) return true;
  if (ownedNoteIds.has(note.id)) return true;
  return false;
}

assert(checkAccess(mockNotesLibrary[0], studentOwnedNoteIds, studentUserAccess) === true, 'Free tier student can access purchased note-py-101 (starter required)');
assert(checkAccess(mockNotesLibrary[2], studentOwnedNoteIds, studentUserAccess) === true, 'Free tier student can access purchased note-react-303 (pro required)');
assert(checkAccess(mockNotesLibrary[1], studentOwnedNoteIds, studentUserAccess) === false, 'Free tier student CANNOT access unpurchased note-sql-202 (starter required)');

// ── TEST 5: Merging Purchased Store Products into Student Notes Library ───
console.log('\n--- TEST 5: Merging Purchased Store Products into Student Notes Library ---');

function mergePurchasesIntoNotes(notes: MockNote[], purchases: MockProduct[]): MockNote[] {
  const result = [...notes];
  for (const prod of purchases) {
    const alreadyPresent = result.some(n => n.id === prod.id || n.id === prod.item_reference_id || n.title.toLowerCase().trim() === prod.title.toLowerCase().trim());
    if (!alreadyPresent) {
      result.unshift({
        id: prod.id,
        title: prod.title,
        category: 'Technical Interview',
        minimum_plan: 'free',
      });
    }
  }
  return result;
}

const initialNotes: MockNote[] = [
  { id: 'note-1', title: 'testing', category: 'Technical Interview', minimum_plan: 'free' },
];

const studentPurchasedProducts: MockProduct[] = [
  { id: 'prod-etest-id', title: 'etest', product_type: 'question_pack' },
  { id: 'prod-testing-id', title: 'testing', product_type: 'note_bundle', item_reference_id: 'note-1' },
];

const unifiedNotes = mergePurchasesIntoNotes(initialNotes, studentPurchasedProducts);
assert(unifiedNotes.length === 2, 'Notes library contains both etest and testing (count is 2)');
assert(unifiedNotes.some(n => n.title === 'etest'), 'Purchased etest appears in the Notes section');
assert(unifiedNotes.some(n => n.title === 'testing'), 'Purchased testing appears in the Notes section');

console.log('\n====================================================');
console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('====================================================\n');
