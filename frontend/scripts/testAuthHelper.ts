/**
 * Isolated Test Authentication Helper
 * 
 * Provides direct, server-isolated session creation for test runners and browser harnesses.
 * DOES NOT expose any HTTP endpoint or modify deployable application code.
 * 
 * Works purely in Node test runners by calling Supabase Auth directly via @supabase/ssr,
 * capturing the resulting auth cookies in memory, and supplying them to fetch headers
 * or Puppeteer page instances.
 */

import '../utils/supabase/dnsPin';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

export interface AuthCookie {
  name: string;
  value: string;
  options?: any;
}

export interface SessionResult {
  cookies: AuthCookie[];
  cookieHeader: string;
  userId: string;
  email: string;
}

const sessionCache = new Map<string, { result: SessionResult; expiresAt: number }>();

export async function getTestAuthSession(email: string, password?: string): Promise<SessionResult> {
  const effectivePassword = password || (
    email.includes('admin')
      ? process.env.STAGING_TEST_ADMIN_PASSWORD
      : email.includes('student')
        ? process.env.STAGING_TEST_STUDENT_PASSWORD
        : process.env.STAGING_TEST_CUSTOMER_PASSWORD
  );

  if (!effectivePassword) {
    throw new Error(`No password provided or configured in environment for test user: ${email}`);
  }

  const cacheKey = `${email}:${effectivePassword}`;
  const cached = sessionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const cookieBag = new Map<string, AuthCookie>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return Array.from(cookieBag.values()).map(c => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(c => cookieBag.set(c.name, c));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: effectivePassword,
  });

  if (error || !data.session) {
    throw new Error(`Test authentication failed for ${email}: ${error?.message || 'No session'}`);
  }

  const cookies = Array.from(cookieBag.values());
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const result: SessionResult = {
    cookies,
    cookieHeader,
    userId: data.user.id,
    email: data.user.email || email,
  };

  // Cache for 5 minutes
  sessionCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return result;
}

export async function getTestAuthCookieHeader(email: string, password?: string): Promise<string> {
  const session = await getTestAuthSession(email, password);
  return session.cookieHeader;
}

export async function setupPuppeteerSession(page: any, email: string, password?: string, domain = 'localhost') {
  const session = await getTestAuthSession(email, password);

  // Apply cookies to page
  const puppeteerCookies = session.cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain,
    path: '/',
    httpOnly: c.options?.httpOnly ?? true,
    secure: c.options?.secure ?? false,
    sameSite: (c.options?.sameSite?.toLowerCase() === 'strict' ? 'Strict' : 'Lax') as 'Strict' | 'Lax',
  }));

  await page.setCookie(...puppeteerCookies);
  return session;
}
