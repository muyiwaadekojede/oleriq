'use client';

import {
  LEGACY_SESSION_STORAGE_KEY,
  SESSION_HEADER,
  SESSION_STORAGE_KEY,
} from '@/lib/internalIdentifiers';

type ClientAnalyticsEvent = {
  eventName: string;
  eventGroup?: string;
  status?: 'attempt' | 'success' | 'failure' | string;
  pagePath?: string;
  attemptedUrl?: string;
  sourceUrl?: string;
  exportFormat?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: unknown;
};

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

function resolveUtmParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  return value ? value.slice(0, 255) : null;
}

function getAttribution(): {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
} {
  if (!canUseBrowser()) {
    return {
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    referrer: document.referrer ? document.referrer.slice(0, 2000) : null,
    utmSource: resolveUtmParam(params, 'utm_source'),
    utmMedium: resolveUtmParam(params, 'utm_medium'),
    utmCampaign: resolveUtmParam(params, 'utm_campaign'),
    utmTerm: resolveUtmParam(params, 'utm_term'),
    utmContent: resolveUtmParam(params, 'utm_content'),
  };
}

export function getClientSessionId(): string {
  if (!canUseBrowser()) {
    return 'server-session';
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const legacy = window.localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
  if (legacy) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, legacy);
    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    return legacy;
  }

  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

export async function trackClientEvent(event: ClientAnalyticsEvent): Promise<void> {
  if (!canUseBrowser()) return;

  const sessionId = getClientSessionId();
  const attribution = getAttribution();

  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SESSION_HEADER]: sessionId,
      },
      body: JSON.stringify({
        sessionId,
        eventName: event.eventName,
        eventGroup: event.eventGroup,
        status: event.status,
        pagePath: event.pagePath || window.location.pathname,
        attemptedUrl: event.attemptedUrl,
        sourceUrl: event.sourceUrl,
        exportFormat: event.exportFormat,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        referrer: attribution.referrer,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        utmTerm: attribution.utmTerm,
        utmContent: attribution.utmContent,
        metadata: event.metadata,
      }),
      keepalive: true,
    });
  } catch {
    // Client telemetry should never block UX.
  }
}
