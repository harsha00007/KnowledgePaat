import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  profile?: any;
  supabase?: any;
  response?: NextResponse;
}

export interface VerifyAdminOptions {
  supabaseClient?: any;
}

/**
 * Server-side administrator verification for eBook management endpoints.
 * Enforces authenticated session, strict admin role verification via profiles table,
 * and rate-limiting. Uses official Supabase Auth verification without test bypasses.
 */
export async function verifyAdminRequest(
  req?: NextRequest,
  rateLimitKeySuffix?: string,
  options?: VerifyAdminOptions
): Promise<AdminAuthResult> {
  let supabase = options?.supabaseClient;
  let authUser: any = null;

  const authHeader = req?.headers?.get('authorization') || req?.headers?.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (bearerToken) {
    // 1a. Validate Bearer Token via standard Supabase client configured with token header
    if (!supabase) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !anonKey) {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Server authentication configuration missing.' },
            { status: 500 }
          )
        };
      }
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`
            }
          },
          cookies: {
            getAll: () => [],
            setAll: () => {}
          }
        }
      );
    }

    try {
      const { data: tokenData, error: tokenErr } = await supabase.auth.getUser(bearerToken);
      if (tokenErr || !tokenData?.user) {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Unauthorized: Invalid or expired authentication token.' },
            { status: 401 }
          )
        };
      }
      authUser = tokenData.user;
    } catch {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized: Authentication service error.' },
          { status: 401 }
        )
      };
    }
  } else {
    // 1b. Standard cookie-based session
    if (!supabase) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !anonKey) {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Server authentication configuration missing.' },
            { status: 500 }
          )
        };
      }
      supabase = await createClient();
    }

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Unauthorized. Please sign in as an administrator.' },
            { status: 401 }
          )
        };
      }
      authUser = user;
    } catch {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized. Session verification failed.' },
          { status: 401 }
        )
      };
    }
  }

  if (!authUser) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized. Please sign in as an administrator.' },
        { status: 401 }
      )
    };
  }

  // 2. Strict Admin Role Verification:
  // ONLY the server-controlled `profiles` table is authoritative.
  // User metadata, JWT claims, or client-supplied flags are NEVER trusted.
  let adminProfile: any = null;
  try {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden. Administrator privileges required.' },
          { status: 403 }
        )
      };
    }

    adminProfile = profile;
  } catch {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden. Failed to verify administrator role.' },
        { status: 403 }
      )
    };
  }

  // 3. Optional Rate-limiting
  if (req && rateLimitKeySuffix) {
    const rl = await checkRateLimit(
      `admin_ebook_${rateLimitKeySuffix}:${authUser.id}`,
      RATE_LIMIT_POLICIES.ADMIN_SETTINGS
    );
    if (!rl.success) {
      return {
        authorized: false,
        response: rateLimitResponse(rl)
      };
    }
  }

  return {
    authorized: true,
    user: authUser,
    profile: adminProfile,
    supabase
  };
}
