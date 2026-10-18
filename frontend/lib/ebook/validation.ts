import { EBook, EBookEdition, EBookChapter, EBookPublicationChecklist } from '@/types/ebook';

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

/**
 * Generate a clean URL-friendly slug from a title string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Validate book metadata for creation and updates
 */
export function validateBookPayload(payload: any): ValidationResult<{
  title: string;
  slug: string;
  subtitle: string | null;
  author: string;
  description: string;
  category: string;
  reader_role: string | null;
  language: string;
  cover_image_url: string | null;
}> {
  const errors: string[] = [];

  const title = (payload?.title || '').trim();
  if (!title) {
    errors.push('Book title is required.');
  } else if (title.length > 200) {
    errors.push('Book title cannot exceed 200 characters.');
  }

  const author = (payload?.author || '').trim();
  if (!author) {
    errors.push('Author name is required.');
  } else if (author.length > 100) {
    errors.push('Author name cannot exceed 100 characters.');
  }

  const description = (payload?.description || '').trim();
  if (!description) {
    errors.push('Book description is required.');
  } else if (description.length > 5000) {
    errors.push('Description cannot exceed 5000 characters.');
  }

  let slug = (payload?.slug || '').trim();
  if (!slug && title) {
    slug = generateSlug(title);
  }
  if (!slug) {
    errors.push('Book slug is required.');
  } else if (!SLUG_REGEX.test(slug)) {
    errors.push('Slug must contain only lowercase alphanumeric characters and single hyphens (e.g. "mastering-react").');
  }

  const category = (payload?.category || 'Engineering').trim();
  const subtitle = payload?.subtitle ? payload.subtitle.trim() : null;
  const reader_role = payload?.reader_role ? payload.reader_role.trim() : null;
  const language = (payload?.language || 'en').trim().toLowerCase();
  const cover_image_url = payload?.cover_image_url || null;

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      title,
      slug,
      subtitle,
      author,
      description,
      category,
      reader_role,
      language,
      cover_image_url,
    } : undefined
  };
}

/**
 * Validate edition pricing in minor units (paise: e.g. 4900, 9900, 5000)
 */
export function validateEditionPrices(prices: {
  price_read_online_paise?: number;
  price_read_download_paise?: number;
  price_upgrade_pdf_paise?: number;
}): ValidationResult<{
  price_read_online_paise: number;
  price_read_download_paise: number;
  price_upgrade_pdf_paise: number;
}> {
  const errors: string[] = [];

  const online = typeof prices.price_read_online_paise === 'number'
    ? Math.round(prices.price_read_online_paise)
    : 4900;

  const download = typeof prices.price_read_download_paise === 'number'
    ? Math.round(prices.price_read_download_paise)
    : 9900;

  const upgrade = typeof prices.price_upgrade_pdf_paise === 'number'
    ? Math.round(prices.price_upgrade_pdf_paise)
    : 5000;

  if (online < 0) {
    errors.push('Read Online price cannot be negative.');
  }
  if (download < online) {
    errors.push('Read + Download price (₹' + (download / 100) + ') cannot be less than Read Online price (₹' + (online / 100) + ').');
  }
  if (upgrade < 0) {
    errors.push('PDF upgrade price cannot be negative.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      price_read_online_paise: online,
      price_read_download_paise: download,
      price_upgrade_pdf_paise: upgrade
    } : undefined
  };
}

/**
 * Validate chapter payload
 */
export function validateChapterPayload(payload: any): ValidationResult<{
  title: string;
  slug: string;
  content_body: string;
  chapter_index: number;
  word_count: number;
  status: 'draft' | 'ready';
  is_free_sample: boolean;
}> {
  const errors: string[] = [];

  const title = (payload?.title || '').trim();
  if (!title) {
    errors.push('Chapter title is required.');
  } else if (title.length > 200) {
    errors.push('Chapter title cannot exceed 200 characters.');
  }

  let slug = (payload?.slug || '').trim();
  if (!slug && title) {
    slug = generateSlug(title);
  }
  if (!slug) {
    errors.push('Chapter slug is required.');
  } else if (!SLUG_REGEX.test(slug)) {
    errors.push('Chapter slug must be valid lowercase alphanumeric with hyphens.');
  }

  const content_body = payload?.content_body || '';
  if (!content_body.trim()) {
    errors.push('Chapter content body cannot be empty.');
  }

  const chapter_index = typeof payload?.chapter_index === 'number' && payload.chapter_index >= 1
    ? Math.floor(payload.chapter_index)
    : 1;

  // Compute word count
  const word_count = content_body.trim()
    ? content_body.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const status = payload?.status === 'ready' ? 'ready' : 'draft';
  const is_free_sample = Boolean(payload?.is_free_sample);

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      title,
      slug,
      content_body,
      chapter_index,
      word_count,
      status,
      is_free_sample
    } : undefined
  };
}

/**
 * Checks whether an edition is content-locked against destructive changes.
 * An edition is content-locked if it is currently published, has previously been published,
 * or is archived. Historical purchasers require permanent, immutable access to their purchased content.
 * Unpublishing or archiving does not remove these historical protections.
 */
export function isEditionContentLocked(edition?: {
  status?: string;
  published_at?: string | null;
} | null): boolean {
  if (!edition) return false;
  return (
    edition.status === 'published' ||
    edition.status === 'archived' ||
    Boolean(edition.published_at)
  );
}

/**
 * Validate publication prerequisites for an edition
 */
export function validatePublicationPrerequisites(
  book: Partial<EBook>,
  edition: Partial<EBookEdition>,
  chapters: EBookChapter[]
): EBookPublicationChecklist {
  const blockingReasons: string[] = [];

  // 1. Required book title and author
  const hasRequiredMetadata = Boolean(
    book.title && book.title.trim() &&
    book.author && book.author.trim()
  );
  if (!hasRequiredMetadata) {
    blockingReasons.push('Book title and author are required for publication.');
  }

  // 2. Valid cover asset
  const hasCoverImage = Boolean(book.cover_image_url && book.cover_image_url.trim());
  if (!hasCoverImage) {
    blockingReasons.push('A valid book cover asset is required.');
  }

  // 3. Valid server-side prices: non-negative integer paise, download >= online, upgrade >= 0
  const onlinePrice = edition.price_read_online_paise;
  const downloadPrice = edition.price_read_download_paise;
  const upgradePrice = edition.price_upgrade_pdf_paise;

  const hasValidPrices = Boolean(
    typeof onlinePrice === 'number' &&
    onlinePrice >= 0 &&
    typeof downloadPrice === 'number' &&
    downloadPrice >= onlinePrice &&
    typeof upgradePrice === 'number' &&
    upgradePrice >= 0
  );
  if (!hasValidPrices) {
    blockingReasons.push(
      `Access prices must be valid non-negative integers in paise, and Read + Download price cannot be less than Read Online price.`
    );
  }

  // 4. At least one ready chapter
  const readyChapters = chapters.filter(c => c.status === 'ready');
  const hasAtLeastOneReadyChapter = readyChapters.length > 0;
  if (!hasAtLeastOneReadyChapter) {
    blockingReasons.push('At least one chapter must be marked as ready for publication.');
  }

  // 5. Every chapter included in the publication must be ready
  const draftChapters = chapters.filter(c => c.status !== 'ready');
  const allChaptersReady = chapters.length > 0 && draftChapters.length === 0;
  if (chapters.length > 0 && draftChapters.length > 0) {
    blockingReasons.push(
      `Every chapter included in the publication must be ready. Found ${draftChapters.length} draft chapter(s): "${draftChapters.map(c => c.title).slice(0, 3).join('", "')}".`
    );
  }

  // 6. At least one ready free-sample chapter belonging to this edition
  const readySampleChapters = chapters.filter(c => 
    c.is_free_sample && 
    c.status === 'ready' && 
    (!c.edition_id || !edition.id || c.edition_id === edition.id)
  );
  const hasIntentionalFreeSample = readySampleChapters.length > 0;
  if (!hasIntentionalFreeSample) {
    blockingReasons.push('At least one ready free-sample chapter belonging to this edition is required for preview readers.');
  }

  // 7. A validated publication PDF that exists in private storage
  const hasPrivatePdfForDownload = Boolean(edition.pdf_storage_path && edition.pdf_storage_path.trim());
  if (!hasPrivatePdfForDownload) {
    blockingReasons.push('A validated publication PDF that exists in private storage is required.');
  }

  return {
    hasRequiredMetadata,
    hasCoverImage,
    hasValidPrices,
    hasAtLeastOneReadyChapter,
    allChaptersReady,
    hasIntentionalFreeSample,
    hasPrivatePdfForDownload,
    isEligibleForPublication: blockingReasons.length === 0,
    blockingReasons
  };
}

/**
 * Validate safe chapter deletion
 */
export function validateChapterDeletionEligibility(
  edition: string | { status?: string; published_at?: string | null },
  chapter: { id: string; title: string }
): ValidationResult {
  const errors: string[] = [];

  const isLocked = typeof edition === 'string'
    ? isEditionContentLocked({ status: edition })
    : isEditionContentLocked(edition);

  if (isLocked) {
    errors.push(`Cannot permanently delete chapter "${chapter.title}" from a published edition. Content must remain accessible to existing purchasers. Create a new draft edition revision to modify published content.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate chapter reorder list:
 * Ensures exact set of chapter IDs, no duplicates, and all belong to the current edition
 */
export function validateChapterReordering(
  existingChapters: { id: string }[],
  orderedIds: string[]
): ValidationResult<string[]> {
  const errors: string[] = [];

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { isValid: false, errors: ['No chapter IDs provided for reordering.'] };
  }

  const existingIdSet = new Set(existingChapters.map(c => c.id));
  const seenIds = new Set<string>();

  for (const id of orderedIds) {
    if (seenIds.has(id)) {
      errors.push(`Duplicate chapter ID "${id}" in reorder request.`);
    }
    seenIds.add(id);

    if (!existingIdSet.has(id)) {
      errors.push(`Chapter ID "${id}" does not belong to this book and edition.`);
    }
  }

  if (seenIds.size !== existingIdSet.size) {
    errors.push(`Reorder list must contain all ${existingIdSet.size} chapters in this edition (received ${seenIds.size}).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? orderedIds : undefined
  };
}
