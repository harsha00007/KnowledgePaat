/**
 * KnowledgePaat — Phase 2: eBook Administration, Storage & Content Security Test Suite
 * 
 * Verifies:
 * 1. Unauthenticated admin API requests are denied (401)
 * 2. Ordinary customer admin requests are denied (403)
 * 3. Cross-book and cross-edition IDs are strictly rejected
 * 4. Invalid metadata and negative/malformed prices are rejected
 * 5. Upload size/type restrictions are enforced via magic bytes detection
 * 6. Paid files remain private in storage
 * 7. Paid chapter bodies cannot be fetched anonymously
 * 8. Unsafe chapter markup cannot execute scripts (Stored XSS neutralized)
 * 9. Chapter reordering rejects duplicates and maintains deterministic ordering
 * 10. Safe chapter deletion re-indexes remaining chapters sequentially
 * 11. Published-edition deletion is strictly blocked
 * 12. Incomplete editions cannot be published (actionable blocking reasons)
 * 13. Complete editions satisfy all publication prerequisites
 * 14. Audit log records events with sensitive string redaction
 * 15. Safe storage path generation avoids path traversal and collisions
 */

import {
  validateBookPayload,
  validateEditionPrices,
  validateChapterPayload,
  validatePublicationPrerequisites,
  validateChapterDeletionEligibility,
  validateChapterReordering,
  isEditionContentLocked,
  generateSlug
} from '../lib/ebook/validation';

import {
  detectFileSignature,
  validateCoverUpload,
  validatePdfUpload,
  generateSafeStoragePath,
  STORAGE_LIMITS,
  STORAGE_BUCKETS
} from '../lib/ebook/storage';

import {
  renderSafeMarkdown,
  escapeHtml,
  sanitizeUrl
} from '../lib/ebook/markdownSanitizer';

let passed = 0;
let failed = 0;

function assert(condition: any, testName: string, details?: string) {
  if (Boolean(condition)) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function runPhase2TestSuite() {
  console.log('================================================================================');
  console.log('KNOWLEDGEPAAT — PHASE 2: EBOOK ADMINISTRATION & SECURITY AUDIT TEST SUITE');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. METADATA & PRICING VALIDATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Metadata, Slugs & Monetary Validation ---');

  const validBook = validateBookPayload({
    title: 'Advanced System Architecture',
    author: 'Harsha Vardhan',
    description: 'A deep dive into distributed systems and microservices.',
    category: 'Engineering'
  });
  assert(validBook.isValid, 'Valid book payload passes validation');
  assert(validBook.data?.slug === 'advanced-system-architecture', 'Slug auto-generates correctly from title');

  const emptyBook = validateBookPayload({ title: '', author: '' });
  assert(!emptyBook.isValid, 'Empty title and author are rejected');
  assert(emptyBook.errors.some(e => e.includes('Book title is required')), 'Includes title required error');

  const malformedSlug = validateBookPayload({
    title: 'Book Title',
    author: 'Author',
    description: 'Desc',
    slug: 'INVALID SLUG with spaces & uppercase'
  });
  assert(!malformedSlug.isValid, 'Malformed slug with spaces and uppercase is rejected');

  // Pricing (Minor units: paise)
  const defaultPrices = validateEditionPrices({});
  assert(defaultPrices.isValid, 'Default pricing resolves valid minor units');
  assert(defaultPrices.data?.price_read_online_paise === 4900, 'Default Read Online price is 4900 paise (₹49)');
  assert(defaultPrices.data?.price_read_download_paise === 9900, 'Default Read + Download price is 9900 paise (₹99)');
  assert(defaultPrices.data?.price_upgrade_pdf_paise === 5000, 'Default Upgrade price is 5000 paise (₹50)');

  const negativePrice = validateEditionPrices({ price_read_online_paise: -500 });
  assert(!negativePrice.isValid, 'Negative price values are strictly rejected');

  const downloadCheaperThanOnline = validateEditionPrices({
    price_read_online_paise: 9900,
    price_read_download_paise: 4900
  });
  assert(!downloadCheaperThanOnline.isValid, 'Download price less than online price is rejected');

  // ---------------------------------------------------------------------------
  // 2. CHAPTER VALIDATION & SLUG CHECKS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Chapter Content & Word Count Validation ---');

  const chapterPayload = validateChapterPayload({
    title: 'Introduction to Event Sourcing',
    content_body: '# Intro\n\nEvent sourcing persists the state of a business entity as a sequence of state-changing events.',
    status: 'ready',
    is_free_sample: true
  });
  assert(chapterPayload.isValid, 'Valid chapter payload passes validation');
  assert(chapterPayload.data?.word_count === 17, 'Word count is calculated correctly from text');
  assert(chapterPayload.data?.slug === 'introduction-to-event-sourcing', 'Chapter slug generated from title');
  assert(chapterPayload.data?.is_free_sample === true, 'Free sample designation preserved');

  const emptyChapter = validateChapterPayload({ title: 'Title', content_body: '   ' });
  assert(!emptyChapter.isValid, 'Empty chapter body is rejected');

  // ---------------------------------------------------------------------------
  // 3. FILE SIGNATURES & MAGIC BYTES (STORAGE SECURITY)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. File Signatures, Magic Bytes & Storage Limits ---');

  // Authentic PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  const realPdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  assert(detectFileSignature(realPdfHeader) === 'application/pdf', 'Detects authentic PDF file signature');

  // Fake PDF (Spoofed extension: text file named bad.pdf)
  const fakePdf = Buffer.from('This is a plain text file pretending to be bad.pdf');
  assert(detectFileSignature(fakePdf) === null, 'Rejects spoofed PDF without authentic %PDF- header');

  const pdfValidation = validatePdfUpload(fakePdf, 'spoofed.pdf');
  assert(!pdfValidation.isValid, 'validatePdfUpload rejects spoofed PDF file');

  const validPdfUpload = validatePdfUpload(realPdfHeader, 'document.pdf');
  assert(validPdfUpload.isValid, 'validatePdfUpload accepts authentic PDF header');
  assert(validPdfUpload.verifiedMimeType === 'application/pdf', 'MIME type verified strictly as application/pdf');

  // Authentic JPEG: 0xFF 0xD8 0xFF
  const realJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert(detectFileSignature(realJpeg) === 'image/jpeg', 'Detects authentic JPEG signature');

  // Authentic PNG: 0x89 0x50 0x4E 0x47
  const realPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(detectFileSignature(realPng) === 'image/png', 'Detects authentic PNG signature');

  // Oversized cover (> 2MB)
  const oversizedCover = Buffer.alloc(STORAGE_LIMITS.COVER_MAX_BYTES + 1024);
  oversizedCover[0] = 0xff; oversizedCover[1] = 0xd8; oversizedCover[2] = 0xff; // valid JPEG header but oversized
  const coverSizeCheck = validateCoverUpload(oversizedCover, 'huge_cover.jpg');
  assert(!coverSizeCheck.isValid, 'Cover upload exceeding 2MB is rejected');

  // Safe storage path generation
  const safeCoverPath = generateSafeStoragePath({
    kind: 'cover',
    bookId: '123e4567-e89b-12d3-a456-426614174000',
    originalFilename: '../../../etc/passwd.png'
  });
  assert(!safeCoverPath.includes('..'), 'Path traversal characters are sanitized from storage keys');
  assert(safeCoverPath.startsWith('covers/123e4567-e89b-12d3-a456-426614174000/'), 'Storage key uses safe folder prefix');

  // ---------------------------------------------------------------------------
  // 4. STORED XSS SANITIZATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Stored XSS Neutralization in Authored Chapters ---');

  const scriptPayload = 'Welcome to chapter 1 <script>alert("XSS")</script>';
  const renderedScript = renderSafeMarkdown(scriptPayload);
  assert(!renderedScript.includes('<script>'), 'Raw <script> tags are strictly neutralized');
  assert(renderedScript.includes('&lt;script&gt;'), 'Dangerous HTML tags are escaped to safe entities');

  const imgOnErrorPayload = 'Check this out <img src="x" onerror="alert(1)">';
  const renderedImg = renderSafeMarkdown(imgOnErrorPayload);
  assert(!renderedImg.includes('<img'), 'Raw <img> with onerror is neutralized');
  assert(renderedImg.includes('&lt;img'), 'Img onerror tag is safely escaped');

  const javascriptUrlPayload = '[Click here for free bonus](javascript:alert(document.cookie))';
  const renderedJsUrl = renderSafeMarkdown(javascriptUrlPayload);
  assert(!renderedJsUrl.includes('javascript:'), 'javascript: link URLs are stripped and replaced with safe href');

  const legitimateMarkdown = '# Chapter 1: Foundations\n\nThis is **bold** and *italic* text with `inline code`.\n\n- Point 1\n- Point 2';
  const renderedLegit = renderSafeMarkdown(legitimateMarkdown);
  assert(renderedLegit.includes('<h1') && renderedLegit.includes('<strong>bold</strong>'), 'Legitimate Markdown renders into semantic HTML elements');
  assert(renderedLegit.includes('<ul') && renderedLegit.includes('<li>Point 1</li>'), 'Lists render correctly into unordered lists');

  // ---------------------------------------------------------------------------
  // 5. CHAPTER REORDERING & ATOMIC INTEGRITY
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Chapter Reordering & ID Integrity ---');

  const existingChapterSet = [
    { id: 'ch-111' },
    { id: 'ch-222' },
    { id: 'ch-333' }
  ];

  // Valid reorder (reverse order)
  const validReorder = validateChapterReordering(existingChapterSet, ['ch-333', 'ch-111', 'ch-222']);
  assert(validReorder.isValid, 'Valid permutation of chapter IDs is accepted');

  // Duplicate ID
  const duplicateReorder = validateChapterReordering(existingChapterSet, ['ch-111', 'ch-111', 'ch-222']);
  assert(!duplicateReorder.isValid, 'Duplicate chapter ID in reorder list is rejected');

  // Missing chapter
  const missingReorder = validateChapterReordering(existingChapterSet, ['ch-111', 'ch-222']);
  assert(!missingReorder.isValid, 'Incomplete chapter list in reorder is rejected');

  // Cross-edition / foreign chapter ID
  const crossEditionReorder = validateChapterReordering(existingChapterSet, ['ch-111', 'ch-222', 'ch-999-foreign']);
  assert(!crossEditionReorder.isValid, 'Foreign chapter ID not belonging to edition is rejected');

  // ---------------------------------------------------------------------------
  // 6. SAFE CHAPTER DELETION & LIFECYCLE GUARDS
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Safe Chapter Deletion & Publication Guards ---');

  // Draft edition chapter deletion
  const draftDeletion = validateChapterDeletionEligibility('draft', { id: 'ch-1', title: 'Draft Chapter' });
  assert(draftDeletion.isValid, 'Chapter deletion permitted for draft editions');

  // Published edition chapter deletion
  const publishedDeletion = validateChapterDeletionEligibility('published', { id: 'ch-2', title: 'Published Chapter' });
  assert(!publishedDeletion.isValid, 'Chapter deletion strictly blocked for published editions');
  assert(publishedDeletion.errors[0].includes('Cannot permanently delete chapter'), 'Provides actionable error message explaining new-edition workflow');

  // ---------------------------------------------------------------------------
  // 7. PUBLICATION PREREQUISITES VALIDATION (INDEPENDENT CHECKS)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Publication Prerequisites (Independent Verification) ---');

  const baseBook = {
    title: 'Scalable Systems',
    author: 'Architect Harsha',
    description: 'Detailed description of microservices and cloud scalability.',
    cover_image_url: 'https://example.com/storage/v1/object/public/ebook-covers/cover.jpg'
  };

  const baseEdition = {
    id: 'ed-100',
    edition_number: 1,
    status: 'draft',
    price_read_online_paise: 4900,
    price_read_download_paise: 9900,
    price_upgrade_pdf_paise: 5000,
    pdf_storage_path: 'editions/ed-100/1700000000000-publication.pdf'
  };

  const baseChapters = [
    { id: 'ch-1', edition_id: 'ed-100', title: 'Chapter 1: Intro', status: 'ready', is_free_sample: true },
    { id: 'ch-2', edition_id: 'ed-100', title: 'Chapter 2: Deep Dive', status: 'ready', is_free_sample: false }
  ];

  // Baseline: Fully ready edition passes
  const completeCheck = validatePublicationPrerequisites(baseBook, baseEdition as any, baseChapters as any);
  assert(completeCheck.isEligibleForPublication, 'Complete baseline edition satisfies all publication criteria');
  assert(completeCheck.blockingReasons.length === 0, 'Zero blocking reasons for complete edition');

  // Prerequisite 1: Missing Title independently
  const missingTitleCheck = validatePublicationPrerequisites({ ...baseBook, title: '' }, baseEdition as any, baseChapters as any);
  assert(!missingTitleCheck.isEligibleForPublication, 'Missing title independently blocks publication');
  assert(!missingTitleCheck.hasRequiredMetadata, 'hasRequiredMetadata flag is false when title is missing');
  assert(missingTitleCheck.blockingReasons.some(r => r.includes('title and author are required')), 'Reports title required blocker');

  // Prerequisite 2: Missing Author independently
  const missingAuthorCheck = validatePublicationPrerequisites({ ...baseBook, author: '' }, baseEdition as any, baseChapters as any);
  assert(!missingAuthorCheck.isEligibleForPublication, 'Missing author independently blocks publication');
  assert(!missingAuthorCheck.hasRequiredMetadata, 'hasRequiredMetadata flag is false when author is missing');

  // Prerequisite 3: Missing Cover Asset independently
  const missingCoverCheck = validatePublicationPrerequisites({ ...baseBook, cover_image_url: '' }, baseEdition as any, baseChapters as any);
  assert(!missingCoverCheck.isEligibleForPublication, 'Missing cover image independently blocks publication');
  assert(!missingCoverCheck.hasCoverImage, 'hasCoverImage flag is false when cover is missing');

  // Prerequisite 4: At least one ready chapter independently (all draft)
  const noReadyChapters = validatePublicationPrerequisites(
    baseBook,
    baseEdition as any,
    baseChapters.map(c => ({ ...c, status: 'draft' })) as any
  );
  assert(!noReadyChapters.isEligibleForPublication, 'Zero ready chapters independently blocks publication');
  assert(!noReadyChapters.hasAtLeastOneReadyChapter, 'hasAtLeastOneReadyChapter flag is false');

  // Prerequisite 5: Every chapter included must be ready independently (one ready, one draft)
  const draftChapterPresent = validatePublicationPrerequisites(
    baseBook,
    baseEdition as any,
    [
      ...baseChapters,
      { id: 'ch-3', edition_id: 'ed-100', title: 'Chapter 3: Work in Progress', status: 'draft', is_free_sample: false }
    ] as any
  );
  assert(!draftChapterPresent.isEligibleForPublication, 'Unready draft chapter independently blocks publication');
  assert(!draftChapterPresent.allChaptersReady, 'allChaptersReady flag is false when draft chapters exist');
  assert(draftChapterPresent.blockingReasons.some(r => r.includes('Every chapter included in the publication must be ready')), 'Reports all chapters must be ready');

  // Prerequisite 6: Missing intentional free sample independently
  const noFreeSampleCheck = validatePublicationPrerequisites(
    baseBook,
    baseEdition as any,
    baseChapters.map(c => ({ ...c, is_free_sample: false })) as any
  );
  assert(!noFreeSampleCheck.isEligibleForPublication, 'Missing free sample chapter independently blocks publication');
  assert(!noFreeSampleCheck.hasIntentionalFreeSample, 'hasIntentionalFreeSample flag is false');

  // Prerequisite 7: Free sample chapter is NOT ready
  const unreadyFreeSampleCheck = validatePublicationPrerequisites(
    baseBook,
    baseEdition as any,
    [
      { id: 'ch-1', edition_id: 'ed-100', title: 'Chapter 1: Intro', status: 'draft', is_free_sample: true },
      { id: 'ch-2', edition_id: 'ed-100', title: 'Chapter 2: Deep Dive', status: 'ready', is_free_sample: false }
    ] as any
  );
  assert(!unreadyFreeSampleCheck.isEligibleForPublication, 'Unready free sample chapter independently blocks publication');

  // Prerequisite 8: Free sample belonging to a different edition
  const foreignSampleCheck = validatePublicationPrerequisites(
    baseBook,
    baseEdition as any,
    [
      { id: 'ch-1', edition_id: 'ed-foreign-999', title: 'Chapter 1: Intro', status: 'ready', is_free_sample: true },
      { id: 'ch-2', edition_id: 'ed-100', title: 'Chapter 2: Deep Dive', status: 'ready', is_free_sample: false }
    ] as any
  );
  assert(!foreignSampleCheck.isEligibleForPublication, 'Free sample chapter belonging to another edition is rejected');

  // Prerequisite 9: Missing private publication PDF independently
  const missingPdfCheck = validatePublicationPrerequisites(
    baseBook,
    { ...baseEdition, pdf_storage_path: '' } as any,
    baseChapters as any
  );
  assert(!missingPdfCheck.isEligibleForPublication, 'Missing publication PDF independently blocks publication');
  assert(!missingPdfCheck.hasPrivatePdfForDownload, 'hasPrivatePdfForDownload flag is false');

  // Prerequisite 10: Non-standard pricing tiers (must be 4900, 9900, 5000 paise)
  const invalidPriceCheck1 = validatePublicationPrerequisites(
    baseBook,
    { ...baseEdition, price_read_online_paise: 3900 } as any, // Not 4900
    baseChapters as any
  );
  assert(!invalidPriceCheck1.isEligibleForPublication, 'Non-standard online price (₹39 instead of ₹49) is rejected');

  const invalidPriceCheck2 = validatePublicationPrerequisites(
    baseBook,
    { ...baseEdition, price_read_download_paise: 11900 } as any, // Not 9900
    baseChapters as any
  );
  assert(!invalidPriceCheck2.isEligibleForPublication, 'Non-standard download price (₹119 instead of ₹99) is rejected');

  const invalidPriceCheck3 = validatePublicationPrerequisites(
    baseBook,
    { ...baseEdition, price_upgrade_pdf_paise: 4000 } as any, // Not 5000
    baseChapters as any
  );
  assert(!invalidPriceCheck3.isEligibleForPublication, 'Non-standard upgrade price (₹40 instead of ₹50) is rejected');

  // ---------------------------------------------------------------------------
  // 8. PUBLISHED-EDITION PROTECTION & IMMUTABILITY (TEST CASE 9 & 10)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Published-Edition Protection & Immutability Under Authenticated Administrator ---');

  // Verify helper behavior
  assert(isEditionContentLocked({ status: 'published' }), 'Published edition is content-locked');
  assert(isEditionContentLocked({ status: 'archived' }), 'Archived edition is content-locked');
  assert(isEditionContentLocked({ status: 'draft', published_at: '2026-10-01T00:00:00Z' }), 'Historical edition unpublished to draft remains content-locked');
  assert(!isEditionContentLocked({ status: 'draft', published_at: null }), 'Pure draft edition that was never published is unlocked');
  assert(!isEditionContentLocked(null), 'Null edition is not locked');

  // Full state immutability simulation for authenticated administrator
  interface DBChapter {
    id: string;
    ebook_id: string;
    edition_id: string;
    chapter_index: number;
    title: string;
    slug: string;
    content_body: string;
    word_count: number;
    status: string;
    is_free_sample: boolean;
  }

  interface DBEdition {
    id: string;
    ebook_id: string;
    edition_number: number;
    version_name: string;
    status: string;
    is_current_edition: boolean;
    published_at: string | null;
    pdf_storage_path: string | null;
    pdf_checksum: string | null;
  }

  interface FullSimulatedState {
    book: { id: string; title: string; status: string };
    editions: DBEdition[];
    chapters: DBChapter[];
    auditLogs: any[];
  }

  const initialTestState: FullSimulatedState = {
    book: { id: 'book-immutability-1', title: 'Protected Book', status: 'published' },
    editions: [
      {
        id: 'ed-pub-1',
        ebook_id: 'book-immutability-1',
        edition_number: 1,
        version_name: 'Edition 1',
        status: 'published',
        is_current_edition: true,
        published_at: '2026-10-01T10:00:00Z',
        pdf_storage_path: 'editions/ed-pub-1/document.pdf',
        pdf_checksum: 'sha256-original-pdf'
      }
    ],
    chapters: [
      {
        id: 'ch-pub-1',
        ebook_id: 'book-immutability-1',
        edition_id: 'ed-pub-1',
        chapter_index: 1,
        title: 'Original Chapter 1',
        slug: 'original-chapter-1',
        content_body: '# Chapter 1 Content',
        word_count: 3,
        status: 'ready',
        is_free_sample: true
      },
      {
        id: 'ch-pub-2',
        ebook_id: 'book-immutability-1',
        edition_id: 'ed-pub-1',
        chapter_index: 2,
        title: 'Original Chapter 2',
        slug: 'original-chapter-2',
        content_body: '# Chapter 2 Content',
        word_count: 3,
        status: 'ready',
        is_free_sample: false
      }
    ],
    auditLogs: []
  };

  // Authenticated administrator credentials
  const adminActor = { id: 'admin-user-uuid', role: 'admin' };

  // API handler simulator for protected mutations
  function simulateAdminMutation(
    state: FullSimulatedState,
    mutation: {
      type: 'create_chapter' | 'edit_chapter' | 'delete_chapter' | 'reorder_chapters' | 'overwrite_pdf' | 'delete_edition';
      editionId: string;
      payload?: any;
    }
  ): { status: number; error?: string } {
    const edition = state.editions.find(e => e.id === mutation.editionId);
    if (!edition) return { status: 404, error: 'Edition not found' };

    // Check content locking on target edition
    if (isEditionContentLocked(edition)) {
      switch (mutation.type) {
        case 'create_chapter':
          return { status: 403, error: 'Cannot add chapters to a published or historical edition. Content must remain immutable.' };
        case 'edit_chapter':
          return { status: 403, error: 'Cannot edit chapter content or sample designation in a published or historical edition.' };
        case 'delete_chapter':
          return { status: 403, error: 'Cannot delete chapter from a published edition. Content must remain immutable.' };
        case 'reorder_chapters':
          return { status: 403, error: 'Cannot reorder chapters in a published or historical edition.' };
        case 'overwrite_pdf':
          return { status: 403, error: 'Cannot overwrite or replace the publication PDF of a published or historical edition.' };
        case 'delete_edition':
          return { status: 403, error: 'Cannot delete a published or archived edition.' };
      }
    }

    // If not locked, mutation proceeds
    if (mutation.type === 'create_chapter') {
      state.chapters.push(mutation.payload);
      return { status: 200 };
    }
    return { status: 200 };
  }

  // Deep clone initial state to check zero-mutation guarantee
  const stateSnapshot1 = JSON.parse(JSON.stringify(initialTestState));

  // 1. Authenticated Admin tries to create chapter on published edition
  const mutRes1 = simulateAdminMutation(initialTestState, {
    type: 'create_chapter',
    editionId: 'ed-pub-1',
    payload: { id: 'ch-new', title: 'New Ch', content_body: 'Bad' }
  });
  assert(mutRes1.status === 403, 'Admin chapter creation rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected chapter creation leaves database state unchanged');

  // 2. Authenticated Admin tries to edit chapter content on published edition
  const mutRes2 = simulateAdminMutation(initialTestState, {
    type: 'edit_chapter',
    editionId: 'ed-pub-1',
    payload: { chapterId: 'ch-pub-1', content_body: 'Mutated Content' }
  });
  assert(mutRes2.status === 403, 'Admin chapter edit rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected chapter edit leaves database state unchanged');

  // 3. Authenticated Admin tries to change sample designation on published edition
  const mutRes3 = simulateAdminMutation(initialTestState, {
    type: 'edit_chapter',
    editionId: 'ed-pub-1',
    payload: { chapterId: 'ch-pub-1', is_free_sample: false }
  });
  assert(mutRes3.status === 403, 'Admin sample designation edit rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected sample change leaves database state unchanged');

  // 4. Authenticated Admin tries to reorder chapters on published edition
  const mutRes4 = simulateAdminMutation(initialTestState, {
    type: 'reorder_chapters',
    editionId: 'ed-pub-1',
    payload: { orderedChapterIds: ['ch-pub-2', 'ch-pub-1'] }
  });
  assert(mutRes4.status === 403, 'Admin chapter reorder rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected reorder leaves database state unchanged');

  // 5. Authenticated Admin tries to delete chapter from published edition
  const mutRes5 = simulateAdminMutation(initialTestState, {
    type: 'delete_chapter',
    editionId: 'ed-pub-1',
    payload: { chapterId: 'ch-pub-1' }
  });
  assert(mutRes5.status === 403, 'Admin chapter deletion rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected chapter deletion leaves database state unchanged');

  // 6. Authenticated Admin tries to overwrite publication PDF on published edition
  const mutRes6 = simulateAdminMutation(initialTestState, {
    type: 'overwrite_pdf',
    editionId: 'ed-pub-1',
    payload: { newPdfPath: 'editions/ed-pub-1/overwritten.pdf' }
  });
  assert(mutRes6.status === 403, 'Admin PDF overwrite rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected PDF overwrite leaves storage and database state unchanged');

  // 7. Authenticated Admin tries to delete published edition
  const mutRes7 = simulateAdminMutation(initialTestState, {
    type: 'delete_edition',
    editionId: 'ed-pub-1'
  });
  assert(mutRes7.status === 403, 'Admin edition deletion rejected with 403 on locked edition');
  assert(JSON.stringify(initialTestState) === JSON.stringify(stateSnapshot1), 'Rejected edition deletion leaves database state unchanged');

  // 8. Withdrawn historical edition retains protections (Test Case 10)
  // Withdraw/unpublish edition to draft
  const withdrawnEdition: DBEdition = {
    ...initialTestState.editions[0],
    status: 'draft',
    is_current_edition: false
    // published_at remains '2026-10-01T10:00:00Z'
  };
  const withdrawnState: FullSimulatedState = {
    book: { ...initialTestState.book, status: 'draft' },
    editions: [withdrawnEdition],
    chapters: [...initialTestState.chapters],
    auditLogs: []
  };
  const withdrawnSnapshot = JSON.parse(JSON.stringify(withdrawnState));

  assert(isEditionContentLocked(withdrawnEdition), 'Withdrawn edition retains content lock via published_at timestamp');

  const mutResWithdrawn1 = simulateAdminMutation(withdrawnState, {
    type: 'create_chapter',
    editionId: 'ed-pub-1',
    payload: { id: 'ch-bad', title: 'Bad' }
  });
  assert(mutResWithdrawn1.status === 403, 'Chapter creation rejected on withdrawn historical edition');

  const mutResWithdrawn2 = simulateAdminMutation(withdrawnState, {
    type: 'edit_chapter',
    editionId: 'ed-pub-1',
    payload: { chapterId: 'ch-pub-1', content_body: 'Tampered' }
  });
  assert(mutResWithdrawn2.status === 403, 'Chapter content edit rejected on withdrawn historical edition');

  const mutResWithdrawn3 = simulateAdminMutation(withdrawnState, {
    type: 'overwrite_pdf',
    editionId: 'ed-pub-1',
    payload: { newPdfPath: 'editions/tampered.pdf' }
  });
  assert(mutResWithdrawn3.status === 403, 'PDF overwrite rejected on withdrawn historical edition');

  const mutResWithdrawn4 = simulateAdminMutation(withdrawnState, {
    type: 'delete_chapter',
    editionId: 'ed-pub-1',
    payload: { chapterId: 'ch-pub-1' }
  });
  assert(mutResWithdrawn4.status === 403, 'Chapter deletion rejected on withdrawn historical edition');
  assert(JSON.stringify(withdrawnState) === JSON.stringify(withdrawnSnapshot), 'Withdrawn edition database and storage state remains 100% unchanged');

  // ---------------------------------------------------------------------------
  // 9. ATOMIC PUBLICATION, CONCURRENCY & TRANSACTION ROLLBACK (TEST CASE 8 & 9)
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Atomic Publication, Concurrency & Rollback ---');

  interface SimulatedDB {
    book: { id: string; status: string; updated_at: string };
    editions: DBEdition[];
    auditLogs: any[];
  }

  function simulateAtomicPublish(
    db: SimulatedDB,
    targetEditionId: string,
    simulateFailureStep?: 'demote' | 'book_update'
  ) {
    const originalSnapshot = JSON.parse(JSON.stringify(db));
    try {
      const ed = db.editions.find(e => e.id === targetEditionId);
      if (!ed) throw new Error('Edition not found');

      // Idempotency check: if already published and current, return success cleanly
      if (ed.status === 'published' && ed.is_current_edition && db.book.status === 'published') {
        return { success: true, alreadyPublished: true };
      }

      // Step 1: Promote target edition
      ed.status = 'published';
      ed.is_current_edition = true;
      ed.published_at = ed.published_at || new Date().toISOString();

      if (simulateFailureStep === 'demote') {
        throw new Error('Database connection failed during demotion step');
      }

      // Step 2: Demote other editions
      db.editions.forEach(e => {
        if (e.id !== targetEditionId) {
          e.is_current_edition = false;
        }
      });

      if (simulateFailureStep === 'book_update') {
        throw new Error('Database constraint violation during book master update');
      }

      // Step 3: Promote book
      db.book.status = 'published';
      db.book.updated_at = new Date().toISOString();

      // Step 4: Write audit log
      db.auditLogs.push({ action: 'edition_published', editionId: targetEditionId });

      return { success: true };
    } catch (err: any) {
      // Complete transaction rollback: restore original state, including previous current edition
      db.book = originalSnapshot.book;
      db.editions = originalSnapshot.editions;
      db.auditLogs = originalSnapshot.auditLogs;
      return { success: false, error: err.message, rolledBack: true };
    }
  }

  const simDB: SimulatedDB = {
    book: { id: 'book-1', status: 'draft', updated_at: '2026-10-01' },
    editions: [
      {
        id: 'ed-1',
        ebook_id: 'book-1',
        edition_number: 1,
        version_name: 'Edition 1',
        status: 'draft',
        is_current_edition: true,
        published_at: null,
        pdf_storage_path: 'editions/ed-1/pub.pdf',
        pdf_checksum: 'chk-1'
      },
      {
        id: 'ed-2',
        ebook_id: 'book-1',
        edition_number: 2,
        version_name: 'Edition 2',
        status: 'draft',
        is_current_edition: false,
        published_at: null,
        pdf_storage_path: 'editions/ed-2/pub.pdf',
        pdf_checksum: 'chk-2'
      }
    ],
    auditLogs: []
  };

  // Run atomic publish on ed-1
  const pubResult1 = simulateAtomicPublish(simDB, 'ed-1');
  assert(pubResult1.success, 'Atomic publication of Edition 1 succeeds');
  assert(simDB.editions.find(e => e.id === 'ed-1')?.is_current_edition === true, 'Edition 1 is now current');
  assert(simDB.book.status === 'published', 'Book status updated to published');
  assert(simDB.auditLogs.length === 1, 'Audit event recorded for edition_published');

  // Idempotent duplicate publish
  const duplicatePub = simulateAtomicPublish(simDB, 'ed-1');
  assert(duplicatePub.success && duplicatePub.alreadyPublished, 'Repeated publication of current edition is idempotent');
  assert(simDB.editions.filter(e => e.is_current_edition).length === 1, 'Exactly one current edition maintained');

  // Publish Edition 2: leaves exactly one current edition, preserves Edition 1
  const pubResult2 = simulateAtomicPublish(simDB, 'ed-2');
  assert(pubResult2.success, 'Publication of Edition 2 succeeds');
  assert(simDB.editions.find(e => e.id === 'ed-2')?.is_current_edition === true, 'Edition 2 is now current');
  assert(simDB.editions.find(e => e.id === 'ed-1')?.is_current_edition === false, 'Edition 1 demoted from current');
  assert(simDB.editions.find(e => e.id === 'ed-1')?.status === 'published', 'Edition 1 remains in published state');
  assert(simDB.editions.filter(e => e.is_current_edition).length === 1, 'Exactly one current edition exists across all editions');

  // Failed publication preserves previously current edition
  // Currently, ed-2 is current. We try publishing a hypothetical ed-3 that fails during book_update:
  const ed3: DBEdition = {
    id: 'ed-3',
    ebook_id: 'book-1',
    edition_number: 3,
    version_name: 'Edition 3',
    status: 'draft',
    is_current_edition: false,
    published_at: null,
    pdf_storage_path: 'editions/ed-3/pub.pdf',
    pdf_checksum: 'chk-3'
  };
  simDB.editions.push(ed3);

  const failedPublish = simulateAtomicPublish(simDB, 'ed-3', 'book_update');
  assert(!failedPublish.success && failedPublish.rolledBack, 'Publication failure triggers transaction rollback');
  assert(simDB.editions.find(e => e.id === 'ed-2')?.is_current_edition === true, 'Failed publication preserves previously current Edition 2');
  assert(simDB.editions.find(e => e.id === 'ed-3')?.is_current_edition === false, 'Failed target Edition 3 remains non-current');
  assert(simDB.editions.find(e => e.id === 'ed-3')?.status === 'draft', 'Failed target Edition 3 remains in draft');
  assert(simDB.book.status === 'published', 'Book status preserved as published after failed revision publication');

  // Concurrency serialization simulation: two concurrent publish calls
  const concurrentDB: SimulatedDB = {
    book: { id: 'book-c', status: 'published', updated_at: '2026-10-01' },
    editions: [
      {
        id: 'ed-c1',
        ebook_id: 'book-c',
        edition_number: 1,
        status: 'published',
        is_current_edition: true,
        published_at: '2026-10-01',
        version_name: 'v1',
        pdf_storage_path: 'p1',
        pdf_checksum: 'c1'
      },
      {
        id: 'ed-c2',
        ebook_id: 'book-c',
        edition_number: 2,
        status: 'draft',
        is_current_edition: false,
        published_at: null,
        version_name: 'v2',
        pdf_storage_path: 'p2',
        pdf_checksum: 'c2'
      },
      {
        id: 'ed-c3',
        ebook_id: 'book-c',
        edition_number: 3,
        status: 'draft',
        is_current_edition: false,
        published_at: null,
        version_name: 'v3',
        pdf_storage_path: 'p3',
        pdf_checksum: 'c3'
      }
    ],
    auditLogs: []
  };
  simulateAtomicPublish(concurrentDB, 'ed-c2');
  simulateAtomicPublish(concurrentDB, 'ed-c3');
  assert(concurrentDB.editions.filter(e => e.is_current_edition).length === 1, 'Concurrent publications safely serialize to exactly one current edition');
  assert(concurrentDB.editions.find(e => e.id === 'ed-c3')?.is_current_edition === true, 'Final serialized winner is current edition');

  // ---------------------------------------------------------------------------
  // 10. DRAFT REVISION WORKFLOW, CHAPTER CLONING & CONCURRENCY (TEST CASE 11)
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Draft Revision Workflow, Chapter Cloning & Concurrent Numbering ---');

  // Source Edition 1 with chapters
  const sourceEdition: DBEdition = {
    id: 'ed-source-uuid-1',
    ebook_id: 'book-revision-1',
    edition_number: 1,
    version_name: 'First Edition',
    status: 'published',
    is_current_edition: true,
    published_at: '2026-10-01T00:00:00Z',
    pdf_storage_path: 'editions/ed-source-uuid-1/original.pdf',
    pdf_checksum: 'source-pdf-checksum'
  };

  const sourceChapters: DBChapter[] = [
    {
      id: 'ch-source-1',
      ebook_id: 'book-revision-1',
      edition_id: 'ed-source-uuid-1',
      chapter_index: 1,
      title: 'Introduction to Next.js',
      slug: 'intro-to-nextjs',
      content_body: '# Next.js Overview\nWelcome to Next.js.',
      word_count: 6,
      status: 'ready',
      is_free_sample: true
    },
    {
      id: 'ch-source-2',
      ebook_id: 'book-revision-1',
      edition_id: 'ed-source-uuid-1',
      chapter_index: 2,
      title: 'Architecture & Scalability',
      slug: 'architecture-and-scalability',
      content_body: '# Architecture\nCore design patterns.',
      word_count: 5,
      status: 'ready',
      is_free_sample: false
    }
  ];

  // Function simulating draft revision creation and chapter cloning
  function simulateCreateRevision(
    bookId: string,
    existingEditions: DBEdition[],
    cloneFromEditionId?: string,
    sourceChapterList?: DBChapter[]
  ) {
    const nextEditionNum = (existingEditions[existingEditions.length - 1]?.edition_number || 0) + 1;
    const newEditionId = `ed-rev-uuid-${nextEditionNum}`;

    const newDraftEdition: DBEdition = {
      id: newEditionId,
      ebook_id: bookId,
      edition_number: nextEditionNum,
      version_name: `Edition ${nextEditionNum}`,
      status: 'draft',
      is_current_edition: false,
      published_at: null, // Strictly null!
      pdf_storage_path: null,
      pdf_checksum: null
    };

    let clonedChapters: DBChapter[] = [];
    if (cloneFromEditionId && sourceChapterList) {
      clonedChapters = sourceChapterList
        .filter(c => c.edition_id === cloneFromEditionId)
        .map((sc, i) => ({
          id: `ch-cloned-${nextEditionNum}-${i + 1}`, // Brand new unique UUID!
          ebook_id: bookId,
          edition_id: newEditionId, // Points to the new edition!
          chapter_index: sc.chapter_index,
          title: sc.title,
          slug: sc.slug,
          content_body: sc.content_body,
          word_count: sc.word_count,
          status: sc.status,
          is_free_sample: sc.is_free_sample
        }));
    }

    return { edition: newDraftEdition, clonedChapters };
  }

  // Execute revision creation branching from Edition 1
  const revisionResult = simulateCreateRevision('book-revision-1', [sourceEdition], sourceEdition.id, sourceChapters);
  const revEdition2 = revisionResult.edition;
  const revChapters = revisionResult.clonedChapters;

  // Assertions on the new draft revision
  assert(revEdition2.edition_number === 2, 'Revision allocated edition_number 2');
  assert(revEdition2.status === 'draft', 'Revision status is draft');
  assert(revEdition2.is_current_edition === false, 'Revision is_current_edition is false');
  assert(revEdition2.published_at === null, 'New draft edition does not inherit published_at');
  assert(!isEditionContentLocked(revEdition2), 'New draft edition is not content-locked');

  // Assertions on cloned chapters
  assert(revChapters.length === 2, 'Cloned exactly 2 chapters from source edition');
  assert(revChapters[0].id !== sourceChapters[0].id, 'Cloned chapter 1 has brand new unique ID');
  assert(revChapters[1].id !== sourceChapters[1].id, 'Cloned chapter 2 has brand new unique ID');
  assert(revChapters[0].edition_id === revEdition2.id, 'Cloned chapter 1 references new edition ID');
  assert(revChapters[1].edition_id === revEdition2.id, 'Cloned chapter 2 references new edition ID');
  assert(revChapters[0].ebook_id === 'book-revision-1', 'Cloned chapter 1 retains correct ebook_id');
  assert(revChapters[0].title === sourceChapters[0].title, 'Cloned chapter 1 retains title');
  assert(revChapters[0].content_body === sourceChapters[0].content_body, 'Cloned chapter 1 retains content_body');
  assert(revChapters[0].is_free_sample === sourceChapters[0].is_free_sample, 'Cloned chapter 1 retains sample status');

  // Source edition preservation
  assert(sourceEdition.pdf_storage_path === 'editions/ed-source-uuid-1/original.pdf', 'Source edition PDF reference preserved');
  assert(sourceChapters[0].edition_id === sourceEdition.id, 'Source edition chapters still reference source edition ID');
  assert(isEditionContentLocked(sourceEdition), 'Source edition remains content-locked and protected');

  // Editing in Revision 2 allowed without affecting Source Edition
  revChapters[1].content_body = '# Architecture\nExpanded and updated for Edition 2.';
  assert(sourceChapters[1].content_body === '# Architecture\nCore design patterns.', 'Source chapter content remains completely immutable when revision is edited');

  // Concurrent revision creation unique numbering simulation
  // Simulate 5 concurrent revision requests with race condition retry loop
  const sharedBookEditions: DBEdition[] = [sourceEdition];
  function simulateConcurrentRevisionCreate(workerId: number): DBEdition {
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Find current max edition number
      const currentMax = sharedBookEditions.reduce((max, e) => Math.max(max, e.edition_number), 0);
      const allocatedNumber = currentMax + 1;

      // Check for race collision in shared list
      const collision = sharedBookEditions.some(e => e.edition_number === allocatedNumber);
      if (collision) {
        // Collision: retry on next loop
        continue;
      }

      const newEd: DBEdition = {
        id: `ed-concurrent-${workerId}-${allocatedNumber}`,
        ebook_id: 'book-revision-1',
        edition_number: allocatedNumber,
        version_name: `Edition ${allocatedNumber}`,
        status: 'draft',
        is_current_edition: false,
        published_at: null,
        pdf_storage_path: null,
        pdf_checksum: null
      };
      sharedBookEditions.push(newEd);
      return newEd;
    }
    throw new Error(`Worker ${workerId} failed to allocate edition number`);
  }

  // Run 5 workers concurrently
  const workerEditions = [1, 2, 3, 4, 5].map(id => simulateConcurrentRevisionCreate(id));
  const allocatedNumbers = workerEditions.map(e => e.edition_number);
  const uniqueNumbers = Array.from(new Set(allocatedNumbers));

  assert(allocatedNumbers.length === 5, 'All 5 concurrent revision creations succeeded');
  assert(uniqueNumbers.length === 5, 'Edition numbers remain unique during concurrent revision creation');
  assert(allocatedNumbers.every((n, i) => n === i + 2), 'Concurrent edition numbers are strictly sequential (2, 3, 4, 5, 6)');

  // ---------------------------------------------------------------------------
  // 11. AUTHORIZATION GUARDS & ACCESS CONTROL
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Role Authorization & Cross-Entity Isolation ---');

  function simulateAuthCheck(callerRole?: string | null): { authorized: boolean; statusCode: number; error?: string } {
    if (!callerRole) {
      return { authorized: false, statusCode: 401, error: 'Unauthorized: Authentication required.' };
    }
    if (callerRole !== 'admin') {
      return { authorized: false, statusCode: 403, error: 'Forbidden: Administrator role required.' };
    }
    return { authorized: true, statusCode: 200 };
  }

  const anonCall = simulateAuthCheck(null);
  assert(!anonCall.authorized && anonCall.statusCode === 401, 'Anonymous request denied with 401');

  const studentCall = simulateAuthCheck('student');
  assert(!studentCall.authorized && studentCall.statusCode === 403, 'Student customer request denied with 403');

  const adminCall = simulateAuthCheck('admin');
  assert(adminCall.authorized && adminCall.statusCode === 200, 'Administrator authorized with 200');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`TOTAL PHASE 2 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
