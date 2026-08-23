export interface SocialPlatformConfig {
  url: string;
  enabled: boolean;
}

export interface SocialLinksSettings {
  facebook: SocialPlatformConfig;
  x: SocialPlatformConfig;
  linkedin: SocialPlatformConfig;
  youtube: SocialPlatformConfig;
  instagram: SocialPlatformConfig;
}

export const DEFAULT_SOCIAL_LINKS: SocialLinksSettings = {
  facebook: { url: 'https://facebook.com/knowledgepaat', enabled: true },
  x: { url: 'https://x.com/knowledgepaat', enabled: true },
  linkedin: { url: 'https://linkedin.com/company/knowledgepaat', enabled: true },
  youtube: { url: 'https://youtube.com/@knowledgepaat', enabled: true },
  instagram: { url: 'https://instagram.com/knowledgepaat', enabled: true },
};

export interface SocialPlatformDef {
  key: keyof SocialLinksSettings;
  label: string;
  domain: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  { key: 'facebook', label: 'Facebook', domain: 'facebook.com', placeholder: 'https://facebook.com/knowledgepaat' },
  { key: 'x', label: 'X / Twitter', domain: 'x.com', placeholder: 'https://x.com/knowledgepaat' },
  { key: 'linkedin', label: 'LinkedIn', domain: 'linkedin.com', placeholder: 'https://linkedin.com/company/knowledgepaat' },
  { key: 'youtube', label: 'YouTube', domain: 'youtube.com', placeholder: 'https://youtube.com/@knowledgepaat' },
  { key: 'instagram', label: 'Instagram', domain: 'instagram.com', placeholder: 'https://instagram.com/knowledgepaat' },
];

/**
 * Validate social link URL
 */
export function validateSocialUrl(url: string): { isValid: boolean; normalizedUrl?: string; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: true, normalizedUrl: '' };
  }

  let formatted = trimmed;
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must use http:// or https://' };
    }
    if (parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid web domain address' };
    }
    return { isValid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

/**
 * Fetch social links from API with resilient fallback
 */
export async function fetchSocialLinks(): Promise<SocialLinksSettings> {
  try {
    const res = await fetch('/api/social-links', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.social_links) {
        return {
          facebook: {
            url: data.social_links.facebook?.url || DEFAULT_SOCIAL_LINKS.facebook.url,
            enabled: data.social_links.facebook !== undefined ? Boolean(data.social_links.facebook.enabled) : true,
          },
          x: {
            url: data.social_links.x?.url || DEFAULT_SOCIAL_LINKS.x.url,
            enabled: data.social_links.x !== undefined ? Boolean(data.social_links.x.enabled) : true,
          },
          linkedin: {
            url: data.social_links.linkedin?.url || DEFAULT_SOCIAL_LINKS.linkedin.url,
            enabled: data.social_links.linkedin !== undefined ? Boolean(data.social_links.linkedin.enabled) : true,
          },
          youtube: {
            url: data.social_links.youtube?.url || DEFAULT_SOCIAL_LINKS.youtube.url,
            enabled: data.social_links.youtube !== undefined ? Boolean(data.social_links.youtube.enabled) : true,
          },
          instagram: {
            url: data.social_links.instagram?.url || DEFAULT_SOCIAL_LINKS.instagram.url,
            enabled: data.social_links.instagram !== undefined ? Boolean(data.social_links.instagram.enabled) : true,
          },
        };
      }
    }
  } catch {
    // Return default on error
  }
  return DEFAULT_SOCIAL_LINKS;
}

/**
 * Save social links to API endpoint
 */
export async function saveSocialLinks(
  socialLinks: SocialLinksSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/social-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ social_links: socialLinks }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to save social media links.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unable to save social media links.' };
  }
}
