import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import { calculateUserAccess } from '@/lib/subscription';
import { logger } from '@/lib/logger';
import { VALID_CONTACT_CATEGORIES, ContactCategory, VALID_PRIORITIES } from '@/types/contact';

/**
 * Generate human-friendly reference code (e.g. KP-2026-000123)
 */
function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `KP-${year}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    const isStudent = Boolean(user);

    // Rate Limiting
    const clientIp = getRealClientIp(req);
    const rateLimitKey = isStudent ? `contact_student:${user!.id}` : `contact_ext:${clientIp}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.CONTACT_SUBMIT);

    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json().catch(() => ({}));
    const referenceCode = generateReferenceCode();

    let sourceType: 'external' | 'student';
    let studentId: string | null = null;
    let subscriptionPlan: string | null = null;
    let cleanFirst = '';
    let cleanLast = '';
    let cleanEmail = '';
    let cleanPhone: string | null = null;
    let cleanCategory = 'Other';
    let cleanSubject = '';
    let cleanMessage = '';
    let safePriority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

    if (isStudent && user) {
      // -------------------------------------------------------------
      // 1. AUTHENTICATED STUDENT INQUIRY
      // -------------------------------------------------------------
      sourceType = 'student';
      studentId = user.id;

      // Server-side profile resolution (do NOT trust identity from request body)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

      const fullName = (profile?.full_name || '').trim();
      if (fullName) {
        const parts = fullName.split(' ');
        cleanFirst = parts[0];
        cleanLast = parts.slice(1).join(' ') || '';
      } else {
        cleanFirst = user.user_metadata?.first_name || 'Student';
        cleanLast = user.user_metadata?.last_name || '';
      }

      cleanEmail = (user.email || profile?.email || '').trim().toLowerCase();
      cleanPhone = profile?.phone || null;

      // Server-side subscription plan snapshot
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const access = calculateUserAccess(subData);
      subscriptionPlan = access.effectivePlan;

      // Validate student fields from body
      const { category, subject, message, priority } = body;

      if (category && VALID_CONTACT_CATEGORIES.includes(category as ContactCategory)) {
        cleanCategory = category;
      }

      cleanSubject = (subject || '').trim();
      if (!cleanSubject || cleanSubject.length < 3 || cleanSubject.length > 150) {
        return NextResponse.json({ error: 'Subject is required (between 3 and 150 characters).' }, { status: 400 });
      }

      cleanMessage = (message || '').trim();
      if (!cleanMessage || cleanMessage.length < 5 || cleanMessage.length > 3000) {
        return NextResponse.json({ error: 'Message must be between 5 and 3000 characters.' }, { status: 400 });
      }

      if (priority && VALID_PRIORITIES.includes(priority)) {
        safePriority = priority;
      }
    } else {
      // -------------------------------------------------------------
      // 2. EXTERNAL VISITOR INQUIRY
      // -------------------------------------------------------------
      sourceType = 'external';
      studentId = null;
      subscriptionPlan = null;

      const { firstName, lastName, email, message, subject, category } = body;

      cleanFirst = (firstName || '').trim();
      cleanLast = (lastName || '').trim();
      cleanEmail = (email || '').trim().toLowerCase();
      cleanMessage = (message || '').trim();

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

      if (category && VALID_CONTACT_CATEGORIES.includes(category as ContactCategory)) {
        cleanCategory = category;
      }

      cleanSubject = (subject || '').trim() || `Inquiry from ${cleanFirst} ${cleanLast}`;
      safePriority = 'normal';
    }

    // -------------------------------------------------------------
    // 3. PERSIST TO SUPABASE
    // -------------------------------------------------------------
    const inquiryPayload = {
      source_type: sourceType,
      status: 'new',
      priority: safePriority,
      category: cleanCategory,
      subject: cleanSubject,
      message: cleanMessage,
      first_name: cleanFirst,
      last_name: cleanLast,
      email: cleanEmail,
      phone: cleanPhone,
      student_id: studentId,
      subscription_plan: subscriptionPlan,
      reference_code: referenceCode,
    };

    const { error: dbError } = await supabase
      .from('contact_inquiries')
      .insert(inquiryPayload);

    if (dbError) {
      // Log error with structured telemetry
      logger.error('Failed to persist contact inquiry to database', dbError, {
        module: 'contact',
        sourceType,
        referenceCode,
        errorCode: dbError.code,
      });

      // If the table does not exist in schema cache yet, log administrative warning
      if (dbError.code === 'PGRST205') {
        logger.warn('contact_inquiries table not found in database. Run supabase_contact_inquiries_setup.sql in Supabase SQL editor.');
      }
    }

    // 4. Log the submission securely (PII scrubbed by structured logger)
    logger.info('Contact inquiry received and processed', {
      module: 'contact',
      sourceType,
      referenceCode,
      sender: `${cleanFirst} ${cleanLast}`,
      email: cleanEmail,
      category: cleanCategory,
      messageLength: cleanMessage.length,
      ip: clientIp,
      persisted: !dbError,
    });

    const userSuccessMessage = isStudent
      ? 'Your support request has been submitted successfully.'
      : 'Your message has been sent successfully.';

    return NextResponse.json({
      success: true,
      referenceCode,
      message: userSuccessMessage,
    });
  } catch (err: any) {
    logger.error('Error handling contact form submission', err, { module: 'contact' });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
