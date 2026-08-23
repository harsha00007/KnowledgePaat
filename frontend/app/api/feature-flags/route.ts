import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_FEATURE_FLAGS, FeatureKey } from '@/lib/featureFlags';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'feature_flags.json');

interface StoredFlagsPayload {
  flags: Record<FeatureKey, boolean>;
  updated_at: string;
  updated_by: string;
}

function getFallbackData(): StoredFlagsPayload {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          flags: {
            ...DEFAULT_FEATURE_FLAGS,
            ...(parsed.flags || {}),
          },
          updated_at: parsed.updated_at || new Date().toISOString(),
          updated_by: parsed.updated_by || 'system',
        };
      }
    }
  } catch {
    // Ignore read errors
  }
  return {
    flags: DEFAULT_FEATURE_FLAGS,
    updated_at: new Date().toISOString(),
    updated_by: 'default',
  };
}

function saveFallbackData(data: StoredFlagsPayload) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local feature flags fallback:', err);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('feature_flags, updated_at, updated_by')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data?.feature_flags) {
      return NextResponse.json({
        success: true,
        flags: {
          ...DEFAULT_FEATURE_FLAGS,
          ...data.feature_flags,
        },
        updated_at: data.updated_at,
        updated_by: data.updated_by,
      });
    }
  } catch {
    // Fall back to local file or defaults
  }

  const fallback = getFallbackData();
  return NextResponse.json({
    success: true,
    flags: fallback.flags,
    updated_at: fallback.updated_at,
    updated_by: fallback.updated_by,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    // Role check: Only administrator may modify feature flags
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const flags: Record<FeatureKey, boolean> = {
      ...DEFAULT_FEATURE_FLAGS,
      ...(body.flags || {}),
    };

    const payload: StoredFlagsPayload = {
      flags,
      updated_at: new Date().toISOString(),
      updated_by: user.email || user.id,
    };

    // Always persist to local fallback file
    saveFallbackData(payload);

    // Also persist to Supabase platform_settings
    try {
      await supabase
        .from('platform_settings')
        .upsert(
          {
            id: 'global',
            feature_flags: flags,
            updated_at: payload.updated_at,
            updated_by: payload.updated_by,
          },
          { onConflict: 'id' }
        );
    } catch (dbErr) {
      console.warn('Could not update Supabase platform_settings table directly:', dbErr);
    }

    return NextResponse.json({
      success: true,
      flags,
      updated_at: payload.updated_at,
      updated_by: payload.updated_by,
    });
  } catch (err: any) {
    console.error('Error saving feature flags:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
