import type { IncomingHttpHeaders } from 'node:http';

const LEGACY_BRAND_SLUG = ['clear', 'page'].join('');

export const SESSION_HEADER = 'x-oleriq-session';
export const LEGACY_SESSION_HEADER = `x-${LEGACY_BRAND_SLUG}-session`;

export const BATCH_HEADER = 'x-oleriq-batch';
export const LEGACY_BATCH_HEADER = `x-${LEGACY_BRAND_SLUG}-batch`;

export const AUTH_SESSION_HEADER = 'x-oleriq-auth-session';

export const FALLBACK_FORMAT_HEADER = 'x-oleriq-fallback-format';
export const LEGACY_FALLBACK_FORMAT_HEADER = `x-${LEGACY_BRAND_SLUG}-fallback-format`;

export const SESSION_STORAGE_KEY = 'oleriq_session_id';
export const LEGACY_SESSION_STORAGE_KEY = `${LEGACY_BRAND_SLUG}_session_id`;
export const AUTH_SESSION_STORAGE_KEY = 'oleriq_auth_session_id';

export function readHeaderValue(
  headers: IncomingHttpHeaders,
  primaryName: string,
  legacyName?: string,
): string | null {
  const primary = headers[primaryName];
  if (typeof primary === 'string' && primary.trim()) {
    return primary.trim();
  }

  if (Array.isArray(primary) && primary[0]?.trim()) {
    return primary[0].trim();
  }

  if (!legacyName) {
    return null;
  }

  const legacy = headers[legacyName];
  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.trim();
  }

  if (Array.isArray(legacy) && legacy[0]?.trim()) {
    return legacy[0].trim();
  }

  return null;
}
