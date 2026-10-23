import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { STORAGE_BUCKETS } from '@/lib/ebook/storage';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

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

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No valid file provided.' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json({
        success: false,
        error: `Unsupported file type: ${mimeType}. Allowed formats: JPG, PNG, WEBP for images; MP4, WEBM for videos.`
      }, { status: 400 });
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      const maxMb = maxBytes / (1024 * 1024);
      return NextResponse.json({
        success: false,
        error: `File size exceeds the maximum allowed limit of ${maxMb}MB.`
      }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `promotions/${Date.now()}_${sanitizedName}`;

    const adminClient = createAdminClient();
    const { data: uploadData, error: uploadErr } = await adminClient.storage
      .from(STORAGE_BUCKETS.COVERS)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      logger.error('Failed to upload promotional media to storage', uploadErr);
      return NextResponse.json({
        success: false,
        error: uploadErr?.message || 'Storage service failed to upload file.'
      }, { status: 500 });
    }

    const { data: publicUrlData } = adminClient.storage
      .from(STORAGE_BUCKETS.COVERS)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl || storagePath;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: isVideo ? 'video' : 'image',
      mime_type: mimeType,
      byte_size: file.size,
      filename: file.name,
    });
  } catch (err: any) {
    logger.error('Error handling promotional media upload', err);
    return NextResponse.json({ success: false, error: 'Internal server error processing upload.' }, { status: 500 });
  }
}
