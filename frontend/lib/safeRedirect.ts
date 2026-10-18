/**
 * Safe Internal Redirect URL Validator
 * Strictly validates that redirect targets are relative application paths.
 * Blocks open-redirect vulnerabilities (e.g. //evil.com, /\evil.com, javascript:, external domains).
 */

export function sanitizeInternalRedirectUrl(
  rawUrl: string | null | undefined,
  fallback: string = '/student/dashboard'
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;

  const trimmed = rawUrl.trim();

  // Must start with a single slash, never double slash or backslash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject newlines, tabs, and carriage returns (CRLF injection)
  if (/[\r\n\t]/.test(trimmed)) {
    return fallback;
  }

  // Reject protocol strings (e.g. javascript:, data:, vbscript:)
  if (/^[a-z0-9+.-]+:/i.test(trimmed)) {
    return fallback;
  }

  try {
    // Resolve against a dummy local base
    const resolved = new URL(trimmed, 'https://knowledgepaat.internal');
    if (resolved.origin !== 'https://knowledgepaat.internal') {
      return fallback;
    }

    // Only allow pathname + search + hash
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}
