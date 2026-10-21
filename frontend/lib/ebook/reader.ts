/**
 * Protected Reader Service for KnowledgePaat eBook Platform
 * Handles:
 * - Server-side purchased-edition resolution (including historical editions)
 * - Protected chapter content retrieval with strict entitlement enforcement
 * - Debounced reading progress tracking with bounds validation
 * - Customer bookmarks management
 * - In-book search restricted strictly to authorized editions
 * - Customer reading preferences
 */

import { createAdminClient } from '@/utils/supabase/server';
import { renderSafeMarkdown } from '@/lib/ebook/markdownSanitizer';
import { UUID_REGEX } from '@/lib/ebook/validation';
import {
  EBookAccessPlan,
  ChapterTocItem,
  ResolvedEdition,
  BookmarkItem,
  ReadingPreferences,
  DEFAULT_READING_PREFERENCES,
  SearchMatch,
} from '@/types/ebook';

export type {
  ChapterTocItem,
  ResolvedEdition,
  BookmarkItem,
  ReadingPreferences,
  SearchMatch,
};
export { DEFAULT_READING_PREFERENCES };

export interface PurchasedEditionResolution {
  authorized: boolean;
  status: number;
  reason?: string;
  book?: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  };
  edition?: ResolvedEdition;
  entitlement?: {
    id: string;
    plan: EBookAccessPlan;
    canReadOnline: boolean;
    canDownloadPdf: boolean;
    isActive: boolean;
  };
  ownedEditions?: ResolvedEdition[];
}

export interface AuthorizedChapterResult {
  authorized: boolean;
  status: number;
  error?: string;
  book?: {
    id: string;
    slug: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  };
  edition?: ResolvedEdition;
  chapter?: {
    id: string;
    chapterIndex: number;
    title: string;
    slug: string;
    wordCount: number;
    safeHtml: string;
    isFreeSample: boolean;
  };
  navigation?: {
    previousChapter: ChapterTocItem | null;
    nextChapter: ChapterTocItem | null;
    tableOfContents: ChapterTocItem[];
  };
  progress?: {
    scrollPercent: number;
    lastChapterId: string | null;
    completedAt: string | null;
  } | null;
  ownedEditions?: ResolvedEdition[];
  entitlement?: {
    id: string;
    plan: EBookAccessPlan;
    canReadOnline: boolean;
    canDownloadPdf: boolean;
    isActive: boolean;
  } | null;
}

/**
 * 1. Resolve Purchased Edition for an Authenticated Customer.
 * Deterministic rules:
 * - Customer must have an active entitlement (`is_active: true`, `can_read_online: true`).
 * - If `requestedEditionId` is given and customer owns it, select that edition.
 * - Otherwise, select the latest purchased edition (highest edition_number).
 * - Historical / withdrawn editions remain fully readable if purchased.
 * - Authentication alone is NOT enough to read paid content.
 */
export async function resolvePurchasedEdition(
  customerId: string,
  bookIdOrSlug: string,
  requestedEditionId?: string
): Promise<PurchasedEditionResolution> {
  const supabase = createAdminClient();

  if (!customerId) {
    return { authorized: false, status: 401, reason: 'Authentication is required.' };
  }

  // 1. Resolve book by UUID or slug
  const isUuid = UUID_REGEX.test(bookIdOrSlug);
  let bookQuery = supabase
    .from('ebooks')
    .select('id, slug, title, author, cover_image_url, status');

  if (isUuid) {
    bookQuery = bookQuery.eq('id', bookIdOrSlug);
  } else {
    bookQuery = bookQuery.eq('slug', bookIdOrSlug.toLowerCase().trim());
  }

  const { data: book, error: bookError } = await bookQuery.maybeSingle();

  if (bookError || !book) {
    return { authorized: false, status: 404, reason: 'Book not found.' };
  }

  // 2. Query customer entitlements for this book
  const { data: entitlements, error: entError } = await supabase
    .from('ebook_entitlements')
    .select(`
      id,
      customer_id,
      ebook_id,
      edition_id,
      plan,
      can_read_online,
      can_download_pdf,
      is_active,
      created_at,
      edition:ebook_editions (
        id,
        edition_number,
        version_name,
        status,
        is_current_edition
      )
    `)
    .eq('customer_id', customerId)
    .eq('ebook_id', book.id);

  if (entError || !entitlements || entitlements.length === 0) {
    return {
      authorized: false,
      status: 403,
      reason: 'No active entitlement found for this book. Purchase required.',
    };
  }

  // Filter for active entitlements with online reading permission
  const activeEntitlements = entitlements.filter(
    (e) => e.is_active && e.can_read_online
  );

  if (activeEntitlements.length === 0) {
    return {
      authorized: false,
      status: 403,
      reason: 'Your access to this book has been revoked or expired.',
    };
  }

  // Map owned editions
  const ownedEditions: ResolvedEdition[] = activeEntitlements.map((e) => {
    const ed = Array.isArray(e.edition) ? e.edition[0] : e.edition;
    return {
      id: e.edition_id,
      editionNumber: ed?.edition_number || 1,
      versionName: ed?.version_name || `Edition ${ed?.edition_number || 1}`,
      status: ed?.status || 'published',
      isCurrentEdition: Boolean(ed?.is_current_edition),
      isHistorical: !ed?.is_current_edition || ed?.status === 'archived',
    };
  });

  // Sort owned editions descending by editionNumber
  ownedEditions.sort((a, b) => b.editionNumber - a.editionNumber);

  // Deterministic selection:
  // If specific edition requested and owned, select it; otherwise default to latest owned edition
  let selectedEdition: ResolvedEdition | undefined;
  let matchingEntitlement: any;

  if (requestedEditionId) {
    selectedEdition = ownedEditions.find((e) => e.id === requestedEditionId);
    matchingEntitlement = activeEntitlements.find(
      (e) => e.edition_id === requestedEditionId
    );
  }

  if (!selectedEdition) {
    selectedEdition = ownedEditions[0];
    matchingEntitlement = activeEntitlements.find(
      (e) => e.edition_id === selectedEdition?.id
    );
  }

  return {
    authorized: true,
    status: 200,
    book: {
      id: book.id,
      slug: book.slug,
      title: book.title,
      author: book.author,
      coverImageUrl: book.cover_image_url || null,
    },
    edition: selectedEdition,
    entitlement: {
      id: matchingEntitlement.id,
      plan: matchingEntitlement.plan as EBookAccessPlan,
      canReadOnline: Boolean(matchingEntitlement.can_read_online),
      canDownloadPdf: Boolean(matchingEntitlement.can_download_pdf),
      isActive: Boolean(matchingEntitlement.is_active),
    },
    ownedEditions,
  };
}

/**
 * 2. Retrieve Authorized Chapter Content.
 * Enforces:
 * - Active customer entitlement for the book/edition.
 * - Chapter belongs strictly to the resolved edition (cross-edition / cross-book rejection).
 * - Safe HTML conversion via renderSafeMarkdown.
 * - Table of contents navigation (previous/next).
 * - Current reading progress for the edition.
 * - Never returns full PDF, private file storage paths, or other customer data.
 */
export async function getAuthorizedChapterContent(
  customerId: string,
  bookIdOrSlug: string,
  chapterId: string,
  requestedEditionId?: string
): Promise<AuthorizedChapterResult> {
  // 1. Resolve purchased edition
  const resolution = await resolvePurchasedEdition(
    customerId,
    bookIdOrSlug,
    requestedEditionId
  );

  if (!resolution.authorized || !resolution.edition || !resolution.book) {
    return {
      authorized: false,
      status: resolution.status,
      error: resolution.reason || 'Unauthorized access.',
    };
  }

  const editionId = resolution.edition.id;
  const supabase = createAdminClient();

  // 2. Validate chapter ID format
  if (!UUID_REGEX.test(chapterId)) {
    return {
      authorized: false,
      status: 400,
      error: 'Invalid chapter identifier format.',
    };
  }

  // 3. Query the requested chapter with strict edition and book boundaries
  const { data: chapter, error: chapterError } = await supabase
    .from('ebook_chapters')
    .select(`
      id,
      ebook_id,
      edition_id,
      chapter_index,
      title,
      slug,
      content_body,
      word_count,
      status,
      is_free_sample
    `)
    .eq('id', chapterId)
    .eq('edition_id', editionId)
    .eq('ebook_id', resolution.book.id)
    .eq('status', 'ready')
    .maybeSingle();

  if (chapterError || !chapter) {
    return {
      authorized: false,
      status: 404,
      error: 'Chapter not found in this purchased edition.',
    };
  }

  // 4. Fetch all chapters for this edition for navigation and Table of Contents
  const { data: tocRows } = await supabase
    .from('ebook_chapters')
    .select('id, chapter_index, title, slug, is_free_sample')
    .eq('edition_id', editionId)
    .eq('status', 'ready')
    .order('chapter_index', { ascending: true });

  const tableOfContents: ChapterTocItem[] = (tocRows || []).map((row) => ({
    id: row.id,
    chapterIndex: row.chapter_index,
    title: row.title,
    slug: row.slug,
    isFreeSample: Boolean(row.is_free_sample),
  }));

  // Find previous and next chapters
  const currentIndex = tableOfContents.findIndex((c) => c.id === chapter.id);
  const previousChapter = currentIndex > 0 ? tableOfContents[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < tableOfContents.length - 1
      ? tableOfContents[currentIndex + 1]
      : null;

  // 5. Fetch current reading progress for this customer & edition
  const { data: progressRow } = await supabase
    .from('ebook_reading_progress')
    .select('last_chapter_id, scroll_percent, completed_at')
    .eq('customer_id', customerId)
    .eq('edition_id', editionId)
    .maybeSingle();

  const progress = progressRow
    ? {
        scrollPercent: Number(progressRow.scroll_percent) || 0,
        lastChapterId: progressRow.last_chapter_id || null,
        completedAt: progressRow.completed_at || null,
      }
    : null;

  // 6. Safe Markdown rendering
  const safeHtml = renderSafeMarkdown(chapter.content_body || '');

  return {
    authorized: true,
    status: 200,
    book: resolution.book,
    edition: resolution.edition,
    chapter: {
      id: chapter.id,
      chapterIndex: chapter.chapter_index,
      title: chapter.title,
      slug: chapter.slug,
      wordCount: chapter.word_count || 0,
      safeHtml,
      isFreeSample: Boolean(chapter.is_free_sample),
    },
    navigation: {
      previousChapter,
      nextChapter,
      tableOfContents,
    },
    progress,
    ownedEditions: resolution.ownedEditions,
    entitlement: resolution.entitlement || null,
  };
}

/**
 * 3. Save Reading Progress.
 * Validates:
 * - Customer owns active entitlement for the book and edition.
 * - Chapter belongs strictly to that edition.
 * - Scroll percent bounds (0.0 to 100.0).
 * - Updates completed_at when finishing the last chapter (>= 95% scroll).
 */
export async function saveReadingProgress(
  customerId: string,
  bookId: string,
  editionId: string,
  chapterId: string,
  scrollPercent: number
): Promise<{ success: boolean; error?: string; status: number; progress?: any }> {
  if (!customerId) {
    return { success: false, status: 401, error: 'Authentication required.' };
  }

  // Validate bounds
  if (typeof scrollPercent !== 'number' || isNaN(scrollPercent)) {
    return { success: false, status: 400, error: 'Scroll percent must be a valid number.' };
  }
  const boundedScroll = Math.max(0, Math.min(100, Math.round(scrollPercent * 100) / 100));

  if (!UUID_REGEX.test(chapterId)) {
    return { success: false, status: 400, error: 'Invalid chapter identifier.' };
  }

  const supabase = createAdminClient();

  // 1. Verify active entitlement for this customer, book, and edition
  const { data: entitlement, error: entError } = await supabase
    .from('ebook_entitlements')
    .select('id, is_active, can_read_online')
    .eq('customer_id', customerId)
    .eq('ebook_id', bookId)
    .eq('edition_id', editionId)
    .eq('is_active', true)
    .eq('can_read_online', true)
    .maybeSingle();

  if (entError || !entitlement) {
    return {
      success: false,
      status: 403,
      error: 'You do not own an active online reading entitlement for this edition.',
    };
  }

  // 2. Verify chapter belongs to edition
  const { data: chapter, error: chError } = await supabase
    .from('ebook_chapters')
    .select('id, chapter_index, edition_id')
    .eq('id', chapterId)
    .eq('edition_id', editionId)
    .maybeSingle();

  if (chError || !chapter) {
    return {
      success: false,
      status: 400,
      error: 'Chapter does not belong to the specified edition.',
    };
  }

  // 3. Determine completion
  // Fetch total chapters in this edition
  const { count: totalChapters } = await supabase
    .from('ebook_chapters')
    .select('id', { count: 'exact', head: true })
    .eq('edition_id', editionId)
    .eq('status', 'ready');

  let completedAt: string | null = null;
  // If reading the last chapter and >= 95% scrolled
  if (totalChapters && chapter.chapter_index >= totalChapters && boundedScroll >= 95) {
    completedAt = new Date().toISOString();
  }

  // Check existing progress to preserve previous completedAt if already completed
  const { data: existingProgress } = await supabase
    .from('ebook_reading_progress')
    .select('id, completed_at')
    .eq('customer_id', customerId)
    .eq('edition_id', editionId)
    .maybeSingle();

  const finalCompletedAt = completedAt || existingProgress?.completed_at || null;

  // 4. Upsert progress record
  const { data: saved, error: saveError } = await supabase
    .from('ebook_reading_progress')
    .upsert(
      {
        customer_id: customerId,
        ebook_id: bookId,
        edition_id: editionId,
        last_chapter_id: chapterId,
        scroll_percent: boundedScroll,
        completed_at: finalCompletedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id,ebook_id,edition_id' }
    )
    .select()
    .single();

  if (saveError) {
    console.error('Failed to save reading progress:', saveError);
    return { success: false, status: 500, error: 'Database error saving progress.' };
  }

  return {
    success: true,
    status: 200,
    progress: {
      scrollPercent: boundedScroll,
      lastChapterId: chapterId,
      completedAt: finalCompletedAt,
    },
  };
}

/**
 * 4. Authorised Book Search.
 * Strictly searches only within the chapters of the customer's authorised edition.
 * Returns bounded snippet results with context.
 * Never exposes full manuscript or unpurchased book text.
 */
export async function searchAuthorizedBook(
  customerId: string,
  bookId: string,
  editionId: string,
  query: string
): Promise<{ success: boolean; status: number; error?: string; results?: SearchMatch[] }> {
  const cleanQuery = (query || '').trim();

  if (!cleanQuery) {
    return { success: true, status: 200, results: [] };
  }

  if (cleanQuery.length < 2) {
    return { success: false, status: 400, error: 'Search term must be at least 2 characters.' };
  }

  if (cleanQuery.length > 100) {
    return { success: false, status: 400, error: 'Search query exceeds maximum length (100 characters).' };
  }

  // 1. Verify active entitlement for this edition
  const supabase = createAdminClient();
  const { data: entitlement, error: entError } = await supabase
    .from('ebook_entitlements')
    .select('id, is_active, can_read_online')
    .eq('customer_id', customerId)
    .eq('ebook_id', bookId)
    .eq('edition_id', editionId)
    .eq('is_active', true)
    .eq('can_read_online', true)
    .maybeSingle();

  if (entError || !entitlement) {
    return {
      success: false,
      status: 403,
      error: 'You do not have access to search this edition.',
    };
  }

  // 2. Fetch chapters for this edition only
  const { data: chapters, error: chError } = await supabase
    .from('ebook_chapters')
    .select('id, chapter_index, title, content_body')
    .eq('edition_id', editionId)
    .eq('status', 'ready')
    .order('chapter_index', { ascending: true });

  if (chError || !chapters) {
    return { success: false, status: 500, error: 'Failed to search chapter content.' };
  }

  const results: SearchMatch[] = [];
  const lowerQuery = cleanQuery.toLowerCase();

  for (const ch of chapters) {
    const body = ch.content_body || '';
    const lowerBody = body.toLowerCase();
    const titleMatch = ch.title.toLowerCase().includes(lowerQuery);

    const matchIndex = lowerBody.indexOf(lowerQuery);
    let matchCount = 0;

    // Count occurrences
    let pos = 0;
    while ((pos = lowerBody.indexOf(lowerQuery, pos)) !== -1) {
      matchCount++;
      pos += lowerQuery.length;
    }

    if (matchIndex !== -1 || titleMatch) {
      // Create a contextual snippet (~60 chars before and after)
      let snippet = '';
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 60);
        const end = Math.min(body.length, matchIndex + cleanQuery.length + 60);
        const prefix = start > 0 ? '…' : '';
        const suffix = end < body.length ? '…' : '';
        snippet = prefix + body.substring(start, end).replace(/\s+/g, ' ').trim() + suffix;
      } else {
        snippet = body.substring(0, 120).replace(/\s+/g, ' ').trim() + '…';
      }

      results.push({
        chapterId: ch.id,
        chapterIndex: ch.chapter_index,
        chapterTitle: ch.title,
        snippet,
        matchCount: matchCount || (titleMatch ? 1 : 0),
      });

      if (results.length >= 20) break; // Limit to 20 results
    }
  }

  return { success: true, status: 200, results };
}

/**
 * 5. Bookmarks Management.
 * Checks entitlement and manages bookmarks scoped to customer and edition in the database.
 */
export async function listBookmarks(
  customerId: string,
  bookId: string,
  editionId: string
): Promise<{ success: boolean; status: number; error?: string; bookmarks: BookmarkItem[] }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ebook_bookmarks')
    .select(`
      id,
      customer_id,
      ebook_id,
      edition_id,
      chapter_id,
      scroll_percent,
      title,
      created_at,
      chapter:ebook_chapters (
        chapter_index,
        title
      )
    `)
    .eq('customer_id', customerId)
    .eq('edition_id', editionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error listing bookmarks:', error);
    return {
      success: false,
      status: 500,
      error: `Database error retrieving bookmarks: ${error.message}`,
      bookmarks: [],
    };
  }

  const items: BookmarkItem[] = (data || []).map((row: any) => {
    const ch = Array.isArray(row.chapter) ? row.chapter[0] : row.chapter;
    return {
      id: row.id,
      customerId: row.customer_id,
      ebookId: row.ebook_id,
      editionId: row.edition_id,
      chapterId: row.chapter_id,
      chapterIndex: ch?.chapter_index,
      chapterTitle: ch?.title || row.title || 'Chapter Bookmark',
      scrollPercent: Number(row.scroll_percent) || 0,
      title: row.title,
      createdAt: row.created_at,
    };
  });

  return { success: true, status: 200, bookmarks: items };
}

export async function addBookmark(
  customerId: string,
  bookId: string,
  editionId: string,
  chapterId: string,
  scrollPercent: number = 0,
  title?: string
): Promise<{ success: boolean; status: number; error?: string; bookmark?: BookmarkItem }> {
  const supabase = createAdminClient();

  // Validate active entitlement
  const { data: ent } = await supabase
    .from('ebook_entitlements')
    .select('id')
    .eq('customer_id', customerId)
    .eq('edition_id', editionId)
    .eq('is_active', true)
    .maybeSingle();

  if (!ent) {
    return { success: false, status: 403, error: 'Unauthorized to bookmark this edition.' };
  }

  const boundedScroll = Math.max(0, Math.min(100, scrollPercent));
  const bookmarkTitle = title || 'Chapter Bookmark';
  const now = new Date().toISOString();

  // Insert bookmark into DB
  const { data, error } = await supabase
    .from('ebook_bookmarks')
    .upsert(
      {
        customer_id: customerId,
        ebook_id: bookId,
        edition_id: editionId,
        chapter_id: chapterId,
        scroll_percent: boundedScroll,
        title: bookmarkTitle,
        created_at: now,
      },
      { onConflict: 'customer_id,edition_id,chapter_id' }
    )
    .select()
    .single();

  if (error || !data) {
    console.error('Database error adding bookmark:', error);
    return {
      success: false,
      status: 500,
      error: `Database error saving bookmark: ${error?.message || 'Insert failed'}`,
    };
  }

  return {
    success: true,
    status: 200,
    bookmark: {
      id: data.id,
      customerId: data.customer_id,
      ebookId: data.ebook_id,
      editionId: data.edition_id,
      chapterId: data.chapter_id,
      scrollPercent: Number(data.scroll_percent),
      title: data.title,
      createdAt: data.created_at,
    },
  };
}

export async function removeBookmark(
  customerId: string,
  bookmarkId: string
): Promise<{ success: boolean; status: number; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('ebook_bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('customer_id', customerId);

  if (error) {
    console.error('Database error removing bookmark:', error);
    return {
      success: false,
      status: 500,
      error: `Database error removing bookmark: ${error.message}`,
    };
  }

  return { success: true, status: 200 };
}

/**
 * 6. Reading Preferences
 */
export async function getReadingPreferences(
  customerId: string
): Promise<ReadingPreferences> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ebook_reading_preferences')
    .select('theme, font_size, font_family, line_width')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('Database error fetching reading preferences:', error.message);
    return DEFAULT_READING_PREFERENCES;
  }

  if (!data) {
    return DEFAULT_READING_PREFERENCES;
  }

  return {
    theme: data.theme || 'light',
    fontSize: data.font_size || 'normal',
    fontFamily: data.font_family || 'sans',
    lineWidth: data.line_width || 'medium',
  };
}

export async function saveReadingPreferences(
  customerId: string,
  prefs: Partial<ReadingPreferences>
): Promise<{ success: boolean; status: number; error?: string; preferences: ReadingPreferences }> {
  const supabase = createAdminClient();

  const current = await getReadingPreferences(customerId);
  const updated: ReadingPreferences = {
    theme: prefs.theme || current.theme,
    fontSize: prefs.fontSize || current.fontSize,
    fontFamily: prefs.fontFamily || current.fontFamily,
    lineWidth: prefs.lineWidth || current.lineWidth,
  };

  const { error } = await supabase
    .from('ebook_reading_preferences')
    .upsert(
      {
        customer_id: customerId,
        theme: updated.theme,
        font_size: updated.fontSize,
        font_family: updated.fontFamily,
        line_width: updated.lineWidth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'customer_id' }
    );

  if (error) {
    console.error('Database error saving reading preferences:', error.message);
    return {
      success: false,
      status: 500,
      error: `Database error saving reading preferences: ${error.message}`,
      preferences: current,
    };
  }

  return { success: true, status: 200, preferences: updated };
}
