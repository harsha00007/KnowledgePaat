import { NextRequest, NextResponse } from 'next/server';
import { processPendingReceiptOutbox } from '@/lib/ebook/receipts';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution for batch outbox sweep

function verifyCronOrAdminAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Authenticate with Vercel CRON_SECRET if configured
  if (cronSecret && token) {
    const cronBuf = Buffer.from(cronSecret);
    const tokenBuf = Buffer.from(token);
    if (cronBuf.length === tokenBuf.length && crypto.timingSafeEqual(cronBuf, tokenBuf)) {
      return true;
    }
  }

  // 2. Authenticate with Service Role Key if invoked internally
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && token) {
    const sBuf = Buffer.from(serviceKey);
    const tBuf = Buffer.from(token);
    if (sBuf.length === tBuf.length && crypto.timingSafeEqual(sBuf, tBuf)) {
      return true;
    }
  }

  // 3. Fallback for explicit development/isolated test harness
  if (process.env.NODE_ENV === 'development' || process.env.ISOLATED_TEST_RUN === 'true') {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  return handleOutboxSweep(req);
}

export async function POST(req: NextRequest) {
  return handleOutboxSweep(req);
}

async function handleOutboxSweep(req: NextRequest) {
  if (!verifyCronOrAdminAuth(req)) {
    logger.warn('Unauthorized invocation of receipt outbox processor', {
      module: 'receipt_cron',
      ip: req.headers.get('x-real-ip') || 'unknown',
    });
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Valid CRON_SECRET or service authentication required.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  logger.info('Executing scheduled receipt outbox sweep', { module: 'receipt_cron', limit });
  const result = await processPendingReceiptOutbox(limit);

  return NextResponse.json({
    success: result.success,
    eligibleCount: result.eligibleCount,
    processedCount: result.processedCount,
    results: result.results,
    timestamp: new Date().toISOString(),
  });
}
