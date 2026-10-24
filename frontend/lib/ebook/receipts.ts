/**
 * KnowledgePaat — Phase 5: EBook Receipts & Outbox Delivery Handler
 * - Implements durable receipt record logging and safe outbox delivery.
 * - Inspects real transactional email configuration (Resend / SMTP).
 * - If email credentials are missing, records status truthfully as UNCONFIGURED/BLOCKED.
 * - Outbox failure NEVER undoes or rolls back a paid order or unlocked entitlement.
 */

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { renderEBookReceiptEmail } from '@/lib/email/templates';
import { sendTransactionalEmail, inspectEmailTransportConfig } from '@/lib/email/transport';

export interface EmailTransportStatus {
  configured: boolean;
  transportType: 'resend' | 'smtp' | 'sandbox_mock' | 'none';
  missingVariables: string[];
}

export function checkEmailTransportConfig(): EmailTransportStatus {
  const status = inspectEmailTransportConfig();
  return {
    configured: status.configured,
    transportType: status.transportType,
    missingVariables: status.missingVariables,
  };
}

export interface ProcessReceiptResult {
  success: boolean;
  orderId: string;
  status: 'sent' | 'unconfigured_blocked' | 'failed';
  message: string;
}

/**
 * Process a receipt outbox entry for an order.
 * Strictly non-blocking: never fails the purchase or entitlement grant if email sending fails.
 */
export async function processOrderReceiptOutbox(orderId: string): Promise<ProcessReceiptResult> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const MAX_RETRIES = 5;
  const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute lock lease
  const now = new Date();
  const nowIso = now.toISOString();
  const staleLeaseCutoff = new Date(now.getTime() - LEASE_DURATION_MS).toISOString();
  const workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    // 1. Fetch current outbox record state
    const { data: existing, error: fetchErr } = await supabase
      .from('ebook_receipt_outbox')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (fetchErr || !existing) {
      logger.warn('Receipt outbox record not found for order', {
        module: 'receipt_outbox',
        orderId,
        error: fetchErr?.message,
      });
      return {
        success: false,
        orderId,
        status: 'failed',
        message: 'Outbox record not found',
      };
    }

    // A. Terminal state: Already delivered
    if (existing.status === 'sent') {
      return {
        success: true,
        orderId,
        status: 'sent',
        message: 'Receipt already sent',
      };
    }

    // B. Terminal failure state: Max retries exceeded
    const isTerminal = existing.status === 'failed' && (
      (existing.retry_count || 0) >= MAX_RETRIES ||
      existing.last_error?.startsWith('PERMANENTLY_FAILED')
    );

    if (isTerminal) {
      return {
        success: false,
        orderId,
        status: 'failed',
        message: `Permanently failed: Max retries (${MAX_RETRIES}) reached. Requires admin review.`,
      };
    }

    // C. Concurrency protection: Active lease check
    if (existing.status === 'processing' && existing.updated_at && existing.updated_at > staleLeaseCutoff) {
      logger.info('Receipt delivery already in progress by active worker lease', {
        orderId,
        lockedAt: existing.updated_at,
      });
      return {
        success: true,
        orderId,
        status: 'sent',
        message: 'Receipt currently being processed by another worker lease',
      };
    }

    // 2. Atomically claim lease with strict conditional ownership check
    // ELIGIBILITY CONDITION:
    // Only claim if:
    //   a) status = 'pending', OR
    //   b) status = 'failed' AND retry_count < MAX_RETRIES, OR
    //   c) status = 'processing' AND updated_at < staleLeaseCutoff (safe expired lease recovery)
    // If another worker claimed the job or holds an active lease, this query updates 0 rows and returns null.
    const preservedPayload = {
      ...(typeof existing.payload === 'object' && existing.payload !== null ? existing.payload : {}),
      worker_id: workerId,
      locked_at: nowIso,
      idempotency_key: `receipt-order-${orderId}`,
    };

    const { data: claimedRows, error: claimErr } = await supabase
      .from('ebook_receipt_outbox')
      .update({
        status: 'processing',
        payload: preservedPayload,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
      .or(`status.eq.pending,and(status.eq.failed,retry_count.lt.${MAX_RETRIES}),and(status.eq.processing,updated_at.lt.${staleLeaseCutoff})`)
      .select('*');

    const claimedItem = claimedRows && claimedRows.length > 0 ? claimedRows[0] : null;

    if (claimErr || !claimedItem) {
      logger.info('Could not acquire exclusive outbox claim; job already active or terminal', {
        orderId,
        workerId,
      });
      return {
        success: true, // Non-winning worker safely yields without failing the order flow
        orderId,
        status: 'sent',
        message: 'Receipt claim conceded to winning worker or active lease',
      };
    }

    // 3. Inspect email transport credentials
    const transport = checkEmailTransportConfig();

    if (!transport.configured) {
      const errorMsg = `BLOCKED: No transactional email provider configured. Missing: ${transport.missingVariables.join(', ')}`;
      logger.warn('Receipt email delivery blocked due to missing credentials', {
        module: 'receipt_outbox',
        orderId,
        missing: transport.missingVariables,
      });

      const nextRetryCount = (claimedItem.retry_count || 0) + 1;
      const isTerminal = nextRetryCount >= MAX_RETRIES;
      const formattedError = isTerminal ? `PERMANENTLY_FAILED: ${errorMsg}` : errorMsg;

      await supabase
        .from('ebook_receipt_outbox')
        .update({
          status: 'failed',
          last_error: formattedError,
          retry_count: nextRetryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimedItem.id)
        .eq('status', 'processing')
        .filter('payload->>worker_id', 'eq', workerId);

      return {
        success: false,
        orderId,
        status: 'unconfigured_blocked',
        message: errorMsg,
      };
    }

    // 4. Render and dispatch email with stable idempotency key
    logger.info('Dispatching receipt email via configured transport', {
      module: 'receipt_outbox',
      orderId,
      transport: transport.transportType,
      recipient: claimedItem.recipient_email,
    });

    const formattedAmount = claimedItem.currency === 'INR'
      ? `₹${((claimedItem.amount_cents || 0) / 100).toFixed(2)}`
      : `${claimedItem.currency || '₹'} ${((claimedItem.amount_cents || 0) / 100).toFixed(2)}`;

    const rendered = renderEBookReceiptEmail({
      orderNumber: claimedItem.order_id,
      customerName: claimedItem.recipient_name || 'Valued Reader',
      customerEmail: claimedItem.recipient_email,
      bookTitle: claimedItem.payload?.bookTitle || 'KnowledgePaat eBook',
      editionNumber: claimedItem.payload?.editionNumber || 1,
      planLabel: 'Standard Edition',
      formattedAmount,
      readUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://knowledgepaat.com'}/reader`,
      canDownloadPdf: false,
    });

    const dispatchResult = await sendTransactionalEmail({
      to: claimedItem.recipient_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `receipt-order-${orderId}`,
    });

    if (!dispatchResult.success && dispatchResult.status !== 'sandbox_simulated') {
      const nextRetryCount = (claimedItem.retry_count || 0) + 1;
      const isTerminal = nextRetryCount >= MAX_RETRIES;
      const baseErr = dispatchResult.error || 'Delivery failed';
      const formattedError = isTerminal ? `PERMANENTLY_FAILED: ${baseErr}` : baseErr;

      await supabase
        .from('ebook_receipt_outbox')
        .update({
          status: 'failed',
          last_error: formattedError,
          retry_count: nextRetryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimedItem.id)
        .eq('status', 'processing')
        .filter('payload->>worker_id', 'eq', workerId);

      return {
        success: false,
        orderId,
        status: 'failed',
        message: dispatchResult.error || 'Email dispatch failed',
      };
    }

    // 5. Final state: Mark sent with timestamp and verify worker lease ownership
    const { data: sentRows } = await supabase
      .from('ebook_receipt_outbox')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimedItem.id)
      .eq('status', 'processing')
      .filter('payload->>worker_id', 'eq', workerId)
      .select('*');

    if (!sentRows || sentRows.length === 0) {
      logger.warn('Worker completed dispatch but lease was superseded by another worker', {
        orderId,
        workerId,
      });
    }

    return {
      success: true,
      orderId,
      status: 'sent',
      message: dispatchResult.status === 'sandbox_simulated' ? 'Simulated in test sandbox' : 'Receipt delivered successfully',
    };
  } catch (err: unknown) {
    logger.error('Unexpected error in receipt outbox processor', err, {
      module: 'receipt_outbox',
      orderId,
    });
    return {
      success: false,
      orderId,
      status: 'failed',
      message: err instanceof Error ? err.message : 'Unknown receipt processor error',
    };
  }
}

/**
 * Sweep and process pending, retryable failed, or expired-lease receipt outbox jobs.
 * Used by durable worker schedulers (e.g. Vercel Cron, pg_cron, or manual admin sweep).
 */
export async function processPendingReceiptOutbox(limit: number = 20): Promise<{
  success: boolean;
  eligibleCount: number;
  processedCount: number;
  results: ProcessReceiptResult[];
}> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const LEASE_DURATION_MS = 5 * 60 * 1000;
  const staleLeaseCutoff = new Date(Date.now() - LEASE_DURATION_MS).toISOString();

  try {
    // Query eligible jobs: pending, retryable failed (< 5 retries), or expired leases (> 5 mins)
    const { data: eligible, error } = await supabase
      .from('ebook_receipt_outbox')
      .select('order_id')
      .or(`status.eq.pending,and(status.eq.failed,retry_count.lt.5),and(status.eq.processing,updated_at.lt.${staleLeaseCutoff})`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !eligible || eligible.length === 0) {
      return {
        success: true,
        eligibleCount: 0,
        processedCount: 0,
        results: [],
      };
    }

    const results: ProcessReceiptResult[] = [];
    for (const item of eligible) {
      if (item.order_id) {
        const res = await processOrderReceiptOutbox(item.order_id);
        results.push(res);
      }
    }

    return {
      success: true,
      eligibleCount: eligible.length,
      processedCount: results.filter(r => r.success).length,
      results,
    };
  } catch (err: unknown) {
    logger.error('Error sweeping receipt outbox', err, { module: 'receipt_outbox' });
    return {
      success: false,
      eligibleCount: 0,
      processedCount: 0,
      results: [],
    };
  }
}

