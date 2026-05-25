import type { NextApiRequest, NextApiResponse } from 'next';

import {
  AuthenticatedSessionError,
  deleteAuthenticatedSession,
  importAuthenticatedSession,
  listAuthenticatedSessions,
} from '@/lib/authenticatedSessions';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { LEGACY_SESSION_HEADER, SESSION_HEADER, readHeaderValue } from '@/lib/internalIdentifiers';

function sessionFromRequest(req: NextApiRequest): string | null {
  const value = readHeaderValue(req.headers, SESSION_HEADER, LEGACY_SESSION_HEADER);
  return value ? value.slice(0, 128) : null;
}

function readLabel(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = String((body as { label?: unknown }).label || '').trim();
  return value ? value.slice(0, 120) : null;
}

function readPayloadJson(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  return String((body as { payloadJson?: unknown }).payloadJson || '');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const ownerSessionId = sessionFromRequest(req);
  if (!ownerSessionId) {
    return res.status(400).json({
      success: false,
      error: 'Missing anonymous client session identifier.',
    });
  }

  if (req.method === 'GET') {
    const sessions = listAuthenticatedSessions(ownerSessionId);
    return res.status(200).json({
      success: true,
      sessions,
    });
  }

  if (req.method === 'POST') {
    try {
      const session = importAuthenticatedSession({
        ownerSessionId,
        label: readLabel(req.body),
        payloadJson: readPayloadJson(req.body),
      });

      trackAnalyticsEvent(req, {
        eventName: 'authenticated_session_import',
        eventGroup: 'extract',
        status: 'success',
        pagePath: '/',
        metadata: {
          authSessionId: session.id,
          importKind: session.importKind,
          allowedDomains: session.allowedDomains,
        },
      });

      return res.status(201).json({
        success: true,
        session,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authenticated session import failed.';
      const statusCode = error instanceof AuthenticatedSessionError ? error.statusCode : 400;

      trackAnalyticsEvent(req, {
        eventName: 'authenticated_session_import',
        eventGroup: 'extract',
        status: 'failure',
        pagePath: '/',
        errorCode: error instanceof AuthenticatedSessionError ? error.code : 'AUTH_SESSION_IMPORT_FAILED',
        errorMessage: message,
      });

      return res.status(statusCode).json({
        success: false,
        error: message,
      });
    }
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing authenticated session id.',
      });
    }

    const deleted = deleteAuthenticatedSession(ownerSessionId, id);

    trackAnalyticsEvent(req, {
      eventName: 'authenticated_session_delete',
      eventGroup: 'extract',
      status: deleted ? 'success' : 'success',
      pagePath: '/',
      metadata: {
        authSessionId: id,
        deleted,
      },
    });

    return res.status(200).json({
      success: true,
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed.',
  });
}
