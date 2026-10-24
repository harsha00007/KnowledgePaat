import './dnsPin';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BLOCKED_PRODUCTION_REF = 'csjywuflkvohytbvglxf';

function assertNotProductionInStaging(url: string) {
  const isStaging = 
    process.env.STAGING_MODE === 'true' || 
    process.env.VERCEL_ENV === 'preview' || 
    process.env.NEXT_PUBLIC_SITE_URL?.includes('staging') ||
    process.env.VERCEL_URL?.includes('staging');

  if (isStaging && url.includes(BLOCKED_PRODUCTION_REF)) {
    throw new Error('FAIL-CLOSED: Staging deployment attempted connection to protected production Supabase (csjywuflkvohytbvglxf). Connection rejected.');
  }
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  assertNotProductionInStaging(supabaseUrl);

  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside request store (e.g. background job or test invocation)
    cookieStore = null;
  }

  return createServerClient(
    supabaseUrl,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  assertNotProductionInStaging(supabaseUrl);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
  }
  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

