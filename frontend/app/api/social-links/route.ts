import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { DEFAULT_SOCIAL_LINKS, SocialLinksSettings } from '@/lib/socialLinks';
import { checkRateLimit, rateLimitResponse, getRealClientIp, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'social_links.json');

function getFallbackData(): SocialLinksSettings {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          facebook: {
            url: parsed.facebook?.url ?? DEFAULT_SOCIAL_LINKS.facebook.url,
            enabled: parsed.facebook?.enabled ?? true,
          },
          x: {
            url: parsed.x?.url ?? DEFAULT_SOCIAL_LINKS.x.url,
            enabled: parsed.x?.enabled ?? true,
          },
          linkedin: {
            url: parsed.linkedin?.url ?? DEFAULT_SOCIAL_LINKS.linkedin.url,
            enabled: parsed.linkedin?.enabled ?? true,
          },
          youtube: {
            url: parsed.youtube?.url ?? DEFAULT_SOCIAL_LINKS.youtube.url,
            enabled: parsed.youtube?.enabled ?? true,
          },
          instagram: {
            url: parsed.instagram?.url ?? DEFAULT_SOCIAL_LINKS.instagram.url,
            enabled: parsed.instagram?.enabled ?? true,
          },
        };
      }
    }
  } catch {
    // Ignore read errors
  }
  return DEFAULT_SOCIAL_LINKS;
}

function saveFallbackData(data: SocialLinksSettings) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local social links fallback:', err);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('social_links')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data?.social_links) {
      return NextResponse.json({
        success: true,
        social_links: data.social_links,
      });
    }
  } catch {
    // Fall back to local file or default
  }

  const fallback = getFallbackData();
  return NextResponse.json({
    success: true,
    social_links: fallback,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Enforce Rate Limit for Social Links Settings
    const rateLimitKey = user ? `admin_social:${user.id}` : `admin_social_ip:${getRealClientIp(req)}`;
    const rl = await checkRateLimit(rateLimitKey, RATE_LIMIT_POLICIES.ADMIN_SETTINGS);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    const body = await req.json();
    const socialLinks: SocialLinksSettings = body.social_links || DEFAULT_SOCIAL_LINKS;

    // Always persist to local fallback file so it works instantly even without database migration
    saveFallbackData(socialLinks);

    // Also attempt saving to Supabase platform_settings
    try {

      await supabase
        .from('platform_settings')
        .upsert(
          {
            id: 'global',
            social_links: socialLinks,
            updated_by: user?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
    } catch {
      // Ignored if column not yet added to Supabase
    }

    return NextResponse.json({
      success: true,
      social_links: socialLinks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save social links' },
      { status: 500 }
    );
  }
}
