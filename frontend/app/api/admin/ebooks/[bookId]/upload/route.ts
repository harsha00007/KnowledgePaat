import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/ebook/adminAuth';
import { 
  validateCoverUpload, 
  validatePdfUpload, 
  generateSafeStoragePath, 
  STORAGE_BUCKETS 
} from '@/lib/ebook/storage';
import { logAdminAuditEvent } from '@/lib/ebook/audit';
import { UUID_REGEX, isEditionContentLocked } from '@/lib/ebook/validation';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const auth = await verifyAdminRequest(req, 'upload');
    if (!auth.authorized) return auth.response!;

    const rl = await checkRateLimit(
      `admin_upload:${auth.user.id}`,
      RATE_LIMIT_POLICIES.ADMIN_UPLOAD
    );
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const { bookId } = await params;
    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json({ error: 'Invalid book UUID.' }, { status: 400 });
    }

    // Verify book exists
    const { data: book, error: bookErr } = await auth.supabase
      .from('ebooks')
      .select('id, title, cover_image_url')
      .eq('id', bookId)
      .maybeSingle();

    if (bookErr || !book) {
      return NextResponse.json({ error: 'eBook not found.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = formData.get('kind') as string | null; // 'cover' | 'pdf'
    const editionId = formData.get('editionId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No valid file provided in request.' }, { status: 400 });
    }

    if (kind !== 'cover' && kind !== 'pdf') {
      return NextResponse.json({ error: 'Invalid asset kind. Must be "cover" or "pdf".' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // =========================================================================
    // CASE A: COVER IMAGE UPLOAD (Public Bucket: ebook-covers)
    // =========================================================================
    if (kind === 'cover') {
      const validation = validateCoverUpload(fileBuffer, file.name);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const storagePath = generateSafeStoragePath({
        kind: 'cover',
        bookId,
        originalFilename: file.name
      });

      // Upload to public covers bucket
      const { data: uploadData, error: uploadErr } = await auth.supabase.storage
        .from(STORAGE_BUCKETS.COVERS)
        .upload(storagePath, fileBuffer, {
          contentType: validation.verifiedMimeType,
          upsert: true
        });

      if (uploadErr || !uploadData) {
        console.error('Storage upload error for cover:', uploadErr);
        return NextResponse.json({ error: uploadErr?.message || 'Failed to upload cover to storage.' }, { status: 500 });
      }

      // Get public URL
      const { data: publicUrlData } = auth.supabase.storage
        .from(STORAGE_BUCKETS.COVERS)
        .getPublicUrl(storagePath);

      const coverUrl = publicUrlData?.publicUrl || storagePath;

      // Update book record
      await auth.supabase
        .from('ebooks')
        .update({ cover_image_url: coverUrl, updated_at: new Date().toISOString() })
        .eq('id', bookId);

      // Record in ebook_assets
      await auth.supabase.from('ebook_assets').insert({
        ebook_id: bookId,
        asset_kind: 'cover',
        visibility: 'public',
        storage_bucket: STORAGE_BUCKETS.COVERS,
        storage_path: storagePath,
        original_filename: file.name,
        verified_mime_type: validation.verifiedMimeType!,
        byte_size: validation.byteSize!,
        checksum_sha256: validation.checksumSha256!,
        uploaded_by: auth.user.id
      });

      await logAdminAuditEvent(auth.supabase, {
        actorId: auth.user.id,
        action: 'asset_uploaded',
        entityType: 'asset',
        entityId: bookId,
        metadata: { kind: 'cover', path: storagePath, size: validation.byteSize }
      });

      return NextResponse.json({
        success: true,
        coverUrl,
        storagePath,
        fileSize: validation.byteSize,
        mimeType: validation.verifiedMimeType
      });
    }

    // =========================================================================
    // CASE B: PUBLICATION PDF UPLOAD (Private Bucket: ebook-pdfs)
    // =========================================================================
    if (kind === 'pdf') {
      if (!editionId || !UUID_REGEX.test(editionId)) {
        return NextResponse.json({ error: 'A valid editionId is required for PDF publication uploads.' }, { status: 400 });
      }

      // Verify edition belongs to this book
      const { data: edition, error: edErr } = await auth.supabase
        .from('ebook_editions')
        .select('id, edition_number, version_name, status, published_at, pdf_storage_path')
        .eq('id', editionId)
        .eq('ebook_id', bookId)
        .maybeSingle();

      if (edErr || !edition) {
        return NextResponse.json({ error: 'Edition not found for this book.' }, { status: 404 });
      }

      if (isEditionContentLocked(edition)) {
        return NextResponse.json({
          error: 'Cannot overwrite or replace the publication PDF of a published or historical edition. Content must remain immutable to protect reader access. Please create a new draft edition revision to upload an updated publication PDF.'
        }, { status: 403 });
      }

      const validation = validatePdfUpload(fileBuffer, file.name);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const storagePath = generateSafeStoragePath({
        kind: 'pdf',
        bookId,
        editionId,
        originalFilename: file.name
      });

      // Upload to private PDFs bucket
      const { data: uploadData, error: uploadErr } = await auth.supabase.storage
        .from(STORAGE_BUCKETS.PDFS)
        .upload(storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadErr || !uploadData) {
        console.error('Storage upload error for PDF:', uploadErr);
        return NextResponse.json({ error: uploadErr?.message || 'Failed to upload PDF to storage.' }, { status: 500 });
      }

      // Retain old PDF if this edition was published or referenced, else cleanup safely
      const previousPath = edition.pdf_storage_path;
      if (previousPath && previousPath !== storagePath && edition.status === 'draft') {
        auth.supabase.storage
          .from(STORAGE_BUCKETS.PDFS)
          .remove([previousPath])
          .catch((cleanupErr: any) => console.warn('Non-fatal cleanup warning:', cleanupErr));
      }

      // Update edition record
      const nowIso = new Date().toISOString();
      await auth.supabase
        .from('ebook_editions')
        .update({
          pdf_storage_path: storagePath,
          pdf_file_size_bytes: validation.byteSize,
          pdf_checksum: validation.checksumSha256,
          pdf_original_filename: file.name,
          pdf_uploaded_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', editionId);

      // Record in ebook_assets
      await auth.supabase.from('ebook_assets').insert({
        ebook_id: bookId,
        edition_id: editionId,
        asset_kind: 'publication_pdf',
        visibility: 'private',
        storage_bucket: STORAGE_BUCKETS.PDFS,
        storage_path: storagePath,
        original_filename: file.name,
        verified_mime_type: 'application/pdf',
        byte_size: validation.byteSize!,
        checksum_sha256: validation.checksumSha256!,
        uploaded_by: auth.user.id
      });

      await logAdminAuditEvent(auth.supabase, {
        actorId: auth.user.id,
        action: 'asset_uploaded',
        entityType: 'asset',
        entityId: editionId,
        metadata: { kind: 'pdf', path: storagePath, size: validation.byteSize }
      });

      return NextResponse.json({
        success: true,
        pdfStoragePath: storagePath,
        fileSize: validation.byteSize,
        originalFilename: file.name,
        checksum: validation.checksumSha256
      });
    }

    return NextResponse.json({ error: 'Unsupported upload kind.' }, { status: 400 });
  } catch (err: any) {
    console.error('Unhandled upload error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
