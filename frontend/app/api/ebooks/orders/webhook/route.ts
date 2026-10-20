import { NextRequest, NextResponse } from 'next/server';
import { handleEBookWebhook } from '@/lib/ebook/orders';
import { getRazorpayCredentials } from '@/lib/razorpay';
import { logger } from '@/lib/logger';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getRealClientIp(req);
    const rl = await checkRateLimit(`webhook:${clientIp}`, RATE_LIMIT_POLICIES.PAYMENT_WEBHOOK);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const { webhookSecret } = getRazorpayCredentials();
    if (!webhookSecret) {
      logger.warn('Webhook rejected: endpoint fail-closed because RAZORPAY_WEBHOOK_SECRET is unconfigured', {
        module: 'ebook_webhook_route',
      });
      return NextResponse.json(
        { error: 'Webhook processing disabled: RAZORPAY_WEBHOOK_SECRET is not configured.' },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!rawBody || !signature) {
      return NextResponse.json(
        { error: 'Missing raw webhook payload or signature' },
        { status: 400 }
      );
    }

    const result = await handleEBookWebhook(rawBody, signature);

    if (!result.success) {
      logger.warn('Webhook handling rejected or failed', {
        module: 'ebook_webhook_route',
        status: result.status,
        message: result.message,
      });
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      received: true,
      status: result.status,
      message: result.message,
    });
  } catch (err: any) {
    logger.error('Unexpected webhook error', err, {
      module: 'ebook_webhook_route',
    });
    return NextResponse.json(
      { error: err.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
