import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluatePurchaseIntent } from '@/lib/ebook/entitlements';
import { UUID_REGEX } from '@/lib/ebook/validation';
import { EBookAccessPlan } from '@/types/ebook';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bookId = String(body?.bookId || '').trim();
    const plan = String(body?.plan || '').trim() as EBookAccessPlan;

    if (!UUID_REGEX.test(bookId)) {
      return NextResponse.json(
        { success: false, error: 'Valid bookId is required.' },
        { status: 400 }
      );
    }

    if (plan !== 'read_online' && plan !== 'read_download') {
      return NextResponse.json(
        { success: false, error: 'Valid plan (read_online or read_download) is required.' },
        { status: 400 }
      );
    }

    // Resolve optional customer session from Supabase server client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const intent = await evaluatePurchaseIntent(userId, bookId, plan);

    return NextResponse.json({
      success: true,
      intent,
    });
  } catch (err: any) {
    console.error('Error in POST /api/ebooks/intent:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to evaluate purchase intent.' },
      { status: 500 }
    );
  }
}
