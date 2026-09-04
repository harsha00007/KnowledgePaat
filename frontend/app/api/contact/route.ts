import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getRealClientIp(req);
    const rateLimitKey = `contact:${clientIp}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.CONTACT_SUBMIT);

    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, email, message } = body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      message?: string;
    };

    // Validation
    const cleanFirst = (firstName || '').trim();
    const cleanLast = (lastName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanMessage = (message || '').trim();

    if (!cleanFirst || cleanFirst.length > 50) {
      return NextResponse.json({ error: 'First name is required (max 50 characters).' }, { status: 400 });
    }

    if (!cleanLast || cleanLast.length > 50) {
      return NextResponse.json({ error: 'Last name is required (max 50 characters).' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!cleanMessage || cleanMessage.length < 5 || cleanMessage.length > 2000) {
      return NextResponse.json({ error: 'Message must be between 5 and 2000 characters.' }, { status: 400 });
    }

    // Log the contact inquiry securely
    logger.info('Contact inquiry received', {
      module: 'contact',
      sender: `${cleanFirst} ${cleanLast}`,
      email: cleanEmail,
      messageLength: cleanMessage.length,
      ip: clientIp
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully.'
    });
  } catch (err: any) {
    logger.error('Error handling contact form submission', err, { module: 'contact' });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
