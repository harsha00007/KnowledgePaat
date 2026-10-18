import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { validatePublicationPrerequisites, UUID_REGEX } from '@/lib/ebook/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string; editionId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'publish');
    if (!auth.authorized) return auth.response!;

    const { bookId, editionId } = await params;
    if (!UUID_REGEX.test(bookId) || !UUID_REGEX.test(editionId)) {
      return NextResponse.json({ error: 'Invalid UUID provided.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'publish'; // 'publish' | 'unpublish' | 'withdraw'

    // Fetch book, edition, and all chapters for preflight validation
    const { data: book, error: bookErr } = await auth.supabase
      .from('ebooks')
      .select('*')
      .eq('id', bookId)
      .maybeSingle();

    if (bookErr || !book) {
      return NextResponse.json({ error: 'eBook not found.' }, { status: 404 });
    }

    const { data: edition, error: edErr } = await auth.supabase
      .from('ebook_editions')
      .select('*')
      .eq('id', editionId)
      .eq('ebook_id', bookId)
      .maybeSingle();

    if (edErr || !edition) {
      return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
    }

    const { data: chapters, error: chErr } = await auth.supabase
      .from('ebook_chapters')
      .select('*')
      .eq('edition_id', editionId)
      .order('chapter_index', { ascending: true });

    if (chErr) {
      return NextResponse.json({ error: 'Failed to inspect chapters.' }, { status: 500 });
    }

    // =========================================================================
    // CASE A: PUBLISH EDITION (Strict Database Transaction / RPC)
    // =========================================================================
    if (action === 'publish') {
      // 1. Client preflight validation checklist
      const checklist = validatePublicationPrerequisites(book, edition, chapters || []);

      if (!checklist.isEligibleForPublication) {
        return NextResponse.json({
          error: 'Publication blocked. One or more requirements have not been satisfied.',
          checklist,
          blockingReasons: checklist.blockingReasons
        }, { status: 400 });
      }

      // 2. Execute atomic publication RPC in PostgreSQL:
      // Handles serialization via row locks, DB prerequisite checks, demotion,
      // promotion, and audit logging in a single database transaction.
      const { data: rpcResult, error: rpcErr } = await auth.supabase.rpc('publish_ebook_edition', {
        p_book_id: bookId,
        p_edition_id: editionId,
        p_actor_id: auth.user.id
      });

      if (rpcErr) {
        console.error('Database publication RPC error:', rpcErr);
        const isPreconditionFailed = rpcErr.message?.includes('Publication precondition failed');
        const isAuthFailed = rpcErr.code === '42501' || rpcErr.message?.includes('Forbidden');
        
        return NextResponse.json({
          error: rpcErr.message || 'Failed to publish eBook edition.',
          details: rpcErr.details || null
        }, { status: isAuthFailed ? 403 : isPreconditionFailed ? 400 : 500 });
      }

      // Fetch freshly committed records
      const { data: freshBook } = await auth.supabase.from('ebooks').select('*').eq('id', bookId).single();
      const { data: freshEdition } = await auth.supabase.from('ebook_editions').select('*').eq('id', editionId).single();

      return NextResponse.json({
        success: true,
        message: `Edition ${edition.edition_number} and book "${book.title}" published atomically.`,
        book: freshBook || book,
        edition: freshEdition || edition,
        checklist,
        rpcResult
      });
    }

    // =========================================================================
    // CASE B: WITHDRAW FROM SALE (Strict Database Transaction / RPC)
    // =========================================================================
    if (action === 'unpublish' || action === 'withdraw') {
      // Execute atomic withdrawal RPC in PostgreSQL:
      // Locks rows, demotes edition, updates book status if no other published editions,
      // and logs the audit event.
      const { data: rpcResult, error: rpcErr } = await auth.supabase.rpc('withdraw_ebook_edition', {
        p_book_id: bookId,
        p_edition_id: editionId,
        p_actor_id: auth.user.id
      });

      if (rpcErr) {
        console.error('Database withdrawal RPC error:', rpcErr);
        const isAuthFailed = rpcErr.code === '42501' || rpcErr.message?.includes('Forbidden');
        return NextResponse.json({
          error: rpcErr.message || 'Failed to withdraw eBook edition.',
          details: rpcErr.details || null
        }, { status: isAuthFailed ? 403 : 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Edition ${edition.edition_number} has been withdrawn from sale. Content remains protected for existing purchasers.`,
        rpcResult
      });
    }

    return NextResponse.json({ error: 'Invalid publication action. Must be "publish", "unpublish", or "withdraw".' }, { status: 400 });
  } catch (err: any) {
    console.error('Unhandled error in edition publish POST:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
