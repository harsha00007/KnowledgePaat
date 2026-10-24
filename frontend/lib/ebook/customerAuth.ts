/**
/**
 * Customer Identity & Verification Helper for KnowledgePaat eBook Platform
 * - Uses authoritative Supabase Auth verification via server client.
 * - Never trusts browser-supplied IDs, emails, roles, or client-decoded tokens.
 * - Strictly enforces email verification (user.email_confirmed_at).
 * - Auto-provisions minimal profile so book buyers are not blocked by career fields.
 */

import { createClient } from '@/utils/supabase/server';
import { User } from '@supabase/supabase-js';

export interface VerifiedCustomer {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
  user: User;
}

export type CustomerAuthResult =
  | { success: true; customer: VerifiedCustomer }
  | { success: false; status: 401 | 403; code: string; message: string };

export async function getVerifiedCustomer(): Promise<CustomerAuthResult> {
  try {
    const supabase = await createClient();
    let user = null;
    let authError = null;

    try {
      const { headers } = await import('next/headers');
      const headerList = await headers();
      const authHeader = headerList.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const res = await supabase.auth.getUser(token);
          user = res.data.user;
          authError = res.error;
        }
      }
    } catch {
      // Outside request headers context
    }

    if (!user) {
      const res = await supabase.auth.getUser();
      user = res.data.user;
      authError = res.error;
    }

    if (authError || !user) {
      return {
        success: false,
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Sign in to access your digital library.',
      };
    }

    // Required email verification enforcement
    const userWithConfirmed = user as unknown as { confirmed_at?: string };
    const isVerified = Boolean(
      user.email_confirmed_at ||
      userWithConfirmed.confirmed_at ||
      user.user_metadata?.email_verified === true
    );

    if (!isVerified) {
      return {
        success: false,
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access your eBook library.',
      };
    }

    // Resolve or auto-provision lightweight profile (career fields optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      // Auto-provision minimal profile so book buyers are never blocked
      await supabase.from('profiles').upsert({
        id: user.id,
        user_id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
        role: 'student',
        is_active: true,
      }, { onConflict: 'id' });
    }

    return {
      success: true,
      customer: {
        userId: user.id,
        email: user.email || '',
        fullName: profile?.full_name || user.user_metadata?.full_name || 'Customer',
        role: profile?.role || 'student',
        isEmailVerified: true,
        user,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      status: 401,
      code: 'AUTH_ERROR',
      message: err instanceof Error ? err.message : 'Authentication error occurred.',
    };
  }
}
