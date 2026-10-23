import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { DEFAULT_MEDIA_CARD, MediaCardConfig } from '@/types/ebook';

export const dynamic = 'force-dynamic';

function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Safe relative paths (e.g. /e-books, /e-books#catalogue)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  // Safe in-page anchor links (e.g. #catalogue, #featured)
  if (/^#[a-zA-Z0-9_\-]+$/.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, status: 401, error: 'Authentication required.' };
  }

  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
  if (rpcErr || !isAdmin) {
    return { authorized: false, status: 403, error: 'Administrator access required.' };
  }

  return { authorized: true, user, supabase };
}

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const adminClient = createAdminClient();

    // 1. Fetch draft content
    const { data: draft, error: draftErr } = await adminClient
      .from('ebook_homepage_content')
      .select(`
        *,
        updater:profiles!ebook_homepage_content_updated_by_fkey (full_name, email),
        publisher:profiles!ebook_homepage_content_published_by_fkey (full_name, email)
      `)
      .eq('status', 'draft')
      .maybeSingle();

    // 2. Fetch published content
    const { data: published } = await adminClient
      .from('ebook_homepage_content')
      .select(`
        *,
        publisher:profiles!ebook_homepage_content_published_by_fkey (full_name, email)
      `)
      .eq('status', 'published')
      .maybeSingle();

    // 3. Fetch all published books with their current edition for selection picker
    const { data: books } = await adminClient
      .from('ebooks')
      .select(`
        id,
        slug,
        title,
        subtitle,
        author,
        cover_image_url,
        category,
        status,
        editions:ebook_editions!inner (
          id,
          version_name,
          edition_number,
          status,
          is_current_edition
        )
      `)
      .eq('status', 'published')
      .eq('editions.status', 'published')
      .eq('editions.is_current_edition', true)
      .order('title', { ascending: true });

    // 4. Fetch recent homepage audit logs
    const { data: auditLogs } = await adminClient
      .from('ebook_audit_logs')
      .select(`
        id,
        actor_id,
        action,
        metadata,
        created_at
      `)
      .eq('entity_type', 'ebook_homepage')
      .order('created_at', { ascending: false })
      .limit(10);

    const actorIds = Array.from(new Set((auditLogs || []).map((l: any) => l.actor_id).filter(Boolean)));
    const actorsMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (actorIds.length > 0) {
      const { data: actorProfiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);
      for (const ap of (actorProfiles || [])) {
        actorsMap.set(ap.id, { full_name: ap.full_name, email: ap.email });
      }
    }

    return NextResponse.json({
      success: true,
      draft: draft ? {
        ...draft,
        updater_name: draft.updater?.full_name || null,
        updater_email: draft.updater?.email || null,
        publisher_name: draft.publisher?.full_name || null,
      } : null,
      published: published ? {
        ...published,
        publisher_name: published.publisher?.full_name || null,
      } : null,
      catalog_books: (books || []).map((b: any) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        author: b.author,
        category: b.category,
        cover_image_url: b.cover_image_url,
      })),
      audit_history: (auditLogs || []).map((log: any) => ({
        id: log.id,
        created_at: log.created_at,
        action: log.action,
        actor_name: actorsMap.get(log.actor_id)?.full_name || 'Administrator',
        metadata: log.metadata,
      })),
    });
  } catch (err: any) {
    logger.error('Error fetching admin homepage content', err);
    return NextResponse.json({ success: false, error: 'Internal server error loading homepage content.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const rl = await checkRateLimit(
      `admin_homepage:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_HOMEPAGE_MUTATION
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action === 'publish' ? 'publish' : 'save_draft';
    const content = body?.content || {};

    // Validate URLs to prevent XSS / malicious schemes
    if (content.primary_button_url && !isSafeUrl(content.primary_button_url)) {
      return NextResponse.json({ success: false, error: 'Primary button URL must be a valid relative path (e.g. /e-books) or HTTPS URL.' }, { status: 400 });
    }
    if (content.secondary_button_url && !isSafeUrl(content.secondary_button_url)) {
      return NextResponse.json({ success: false, error: 'Secondary button URL must be a valid relative path or HTTPS URL.' }, { status: 400 });
    }
    if (content.hero_artwork_url && !isSafeUrl(content.hero_artwork_url)) {
      return NextResponse.json({ success: false, error: 'Hero artwork URL must be a valid HTTPS image URL or asset path.' }, { status: 400 });
    }
    if (content.promotional_banner?.link && !isSafeUrl(content.promotional_banner.link)) {
      return NextResponse.json({ success: false, error: 'Promotional banner link must be a valid relative path or HTTPS URL.' }, { status: 400 });
    }

    // Required fields check
    const hero_eyebrow = String(content.hero_eyebrow || 'Engineering & System Design eBooks').trim();
    const hero_heading = String(content.hero_heading || '').trim();
    const hero_highlighted_text = String(content.hero_highlighted_text || '').trim();
    const hero_description = String(content.hero_description || '').trim();
    const hero_artwork_url = content.hero_artwork_url ? String(content.hero_artwork_url).trim() : null;
    const hero_artwork_alt = String(content.hero_artwork_alt || 'KnowledgePaat eBook Library').trim();

    if (!hero_heading) {
      return NextResponse.json({ success: false, error: 'Hero heading is required.' }, { status: 400 });
    }

    const primary_button_label = String(content.primary_button_label || 'Explore Library').trim();
    const primary_button_url = String(content.primary_button_url || '/e-books').trim();
    const secondary_button_label = String(content.secondary_button_label || 'Free Sample Chapters').trim();
    const secondary_button_url = String(content.secondary_button_url || '/e-books?filter=sample').trim();

    const featured_book_ids = Array.isArray(content.featured_book_ids) ? content.featured_book_ids : [];
    const highlighted_book_id = content.highlighted_book_id || null;
    const category_order = Array.isArray(content.category_order) ? content.category_order : [
      'Engineering', 'System Design', 'Career Prep', 'DevOps & Cloud', 'Quality Assurance', 'Frontend & Mobile'
    ];

    const promotional_banner = content.promotional_banner || { is_active: false, text: '', link: '' };
    const section_visibility = content.section_visibility || {
      hero: true, featured: true, categories: true, banner: false, testimonials: true
    };
    const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];

    // Media Card validation & sanitization
    let media_card: MediaCardConfig = DEFAULT_MEDIA_CARD;
    if (content.media_card && typeof content.media_card === 'object') {
      const is_visible = typeof content.media_card.is_visible === 'boolean' ? content.media_card.is_visible : true;
      const rawSlides = Array.isArray(content.media_card.slides) ? content.media_card.slides : [];
      const slides = rawSlides.map((s: any, idx: number) => {
        const type = s.type === 'video' ? 'video' : 'image';
        const media_url = String(s.media_url || '').trim();
        const poster_url = s.poster_url ? String(s.poster_url).trim() : null;
        const cta_url = s.cta_url ? String(s.cta_url).trim() : null;

        if (media_url && !isSafeUrl(media_url)) {
          throw new Error(`Slide media URL is invalid or unsafe: ${media_url}`);
        }
        if (poster_url && !isSafeUrl(poster_url)) {
          throw new Error(`Slide poster URL is invalid or unsafe: ${poster_url}`);
        }
        if (cta_url && !isSafeUrl(cta_url)) {
          throw new Error(`Slide CTA URL is invalid or unsafe: ${cta_url}`);
        }

        return {
          id: String(s.id || `slide-${Date.now()}-${idx}`),
          type,
          media_url,
          poster_url,
          alt_text: String(s.alt_text || '').trim(),
          heading: String(s.heading || '').trim(),
          description: String(s.description || '').trim(),
          cta_label: s.cta_label ? String(s.cta_label).trim() : null,
          cta_url,
          is_active: typeof s.is_active === 'boolean' ? s.is_active : true,
          order: typeof s.order === 'number' ? s.order : idx,
          book_id: s.book_id ? String(s.book_id).trim() : null,
          badge_label: s.badge_label ? String(s.badge_label).trim() : null,
        };
      });

      media_card = { is_visible, slides };
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    if (action === 'save_draft') {
      // Upsert draft row
      const { data: updatedDraft, error: draftErr } = await adminClient
        .from('ebook_homepage_content')
        .upsert({
          status: 'draft',
          hero_eyebrow,
          hero_heading,
          hero_highlighted_text,
          hero_description,
          hero_artwork_url,
          hero_artwork_alt,
          primary_button_label,
          primary_button_url,
          secondary_button_label,
          secondary_button_url,
          featured_book_ids,
          highlighted_book_id,
          category_order,
          promotional_banner,
          section_visibility,
          media_card,
          testimonials,
          updated_at: now,
          updated_by: auth.user.id,
        }, { onConflict: 'status' })
        .select()
        .single();

      if (draftErr || !updatedDraft) {
        logger.error('Failed to save draft homepage content', draftErr);
        return NextResponse.json({ success: false, error: 'Failed to save draft content.' }, { status: 500 });
      }

      // Record audit log
      await adminClient.from('ebook_audit_logs').insert({
        actor_id: auth.user.id,
        action: 'homepage_draft_saved',
        entity_type: 'ebook_homepage',
        entity_id: updatedDraft.id,
        metadata: {
          action: 'save_draft',
          featured_count: featured_book_ids.length,
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Draft homepage configuration saved successfully.',
        draft: updatedDraft,
      });
    }

    if (action === 'publish') {
      // 1. Validate complete configuration before publishing
      if (featured_book_ids.length > 0) {
        // Verify featured books exist and are published
        const { data: validBooks } = await adminClient
          .from('ebooks')
          .select('id')
          .in('id', featured_book_ids)
          .eq('status', 'published');

        const validIds = new Set((validBooks || []).map((b: any) => b.id));
        const filteredFeaturedIds = featured_book_ids.filter((id: string) => validIds.has(id));
        if (filteredFeaturedIds.length === 0 && featured_book_ids.length > 0) {
          return NextResponse.json({
            success: false,
            error: 'None of the selected featured books are currently published in the catalog.'
          }, { status: 400 });
        }
      }

      // 2. Fetch current published version for audit previous values
      const { data: previousPublished } = await adminClient
        .from('ebook_homepage_content')
        .select('version')
        .eq('status', 'published')
        .maybeSingle();

      const nextVersion = (previousPublished?.version || 0) + 1;

      // 3. Publish atomically
      const { data: publishedResult, error: pubErr } = await adminClient
        .from('ebook_homepage_content')
        .upsert({
          status: 'published',
          hero_eyebrow,
          hero_heading,
          hero_highlighted_text,
          hero_description,
          hero_artwork_url,
          hero_artwork_alt,
          primary_button_label,
          primary_button_url,
          secondary_button_label,
          secondary_button_url,
          featured_book_ids,
          highlighted_book_id,
          category_order,
          promotional_banner,
          section_visibility,
          media_card,
          testimonials,
          version: nextVersion,
          published_at: now,
          published_by: auth.user.id,
          updated_at: now,
          updated_by: auth.user.id,
        }, { onConflict: 'status' })
        .select()
        .single();

      if (pubErr || !publishedResult) {
        logger.error('Failed to publish homepage content', pubErr);
        return NextResponse.json({ success: false, error: 'Failed to publish homepage content. Previous published version preserved.' }, { status: 500 });
      }

      // 4. Also keep draft synchronized with published state
      await adminClient
        .from('ebook_homepage_content')
        .upsert({
          status: 'draft',
          hero_eyebrow,
          hero_heading,
          hero_highlighted_text,
          hero_description,
          hero_artwork_url,
          hero_artwork_alt,
          primary_button_label,
          primary_button_url,
          secondary_button_label,
          secondary_button_url,
          featured_book_ids,
          highlighted_book_id,
          category_order,
          promotional_banner,
          section_visibility,
          media_card,
          testimonials,
          version: nextVersion,
          updated_at: now,
          updated_by: auth.user.id,
        }, { onConflict: 'status' });

      // 5. Emit audit trail entry
      await adminClient.from('ebook_audit_logs').insert({
        actor_id: auth.user.id,
        action: 'homepage_published',
        entity_type: 'ebook_homepage',
        entity_id: publishedResult.id,
        metadata: {
          action: 'publish',
          version: nextVersion,
          featured_count: featured_book_ids.length,
          published_at: now,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Homepage configuration v${nextVersion} published successfully to the live storefront.`,
        published: publishedResult,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    logger.error('Error updating admin homepage content', err);
    const isValidationErr = typeof err?.message === 'string' && (err.message.includes('URL is invalid') || err.message.includes('required'));
    return NextResponse.json({
      success: false,
      error: isValidationErr ? err.message : 'Internal server error saving homepage content.'
    }, { status: isValidationErr ? 400 : 500 });
  }
}
