import crypto from 'crypto';

import db from '@/lib/db';
import type { ExtractErrorCode } from '@/lib/types';

const AUTH_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_AUTH_SESSION_BYTES = 512 * 1024;

type ImportedCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
};

type ImportedOrigin = {
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
};

export type ImportedStorageState = {
  cookies: ImportedCookie[];
  origins: ImportedOrigin[];
};

export type AuthenticatedSessionImportKind = 'storage_state' | 'cookie_array';
export type AuthenticatedSessionHealthState =
  | 'ready'
  | 'used'
  | 'domain_mismatch'
  | 'expired'
  | 'invalid';

export type AuthenticatedSessionSummary = {
  id: string;
  label: string;
  importKind: AuthenticatedSessionImportKind;
  allowedDomains: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  lastHealthState: AuthenticatedSessionHealthState;
};

export type ResolvedAuthenticatedSession = AuthenticatedSessionSummary & {
  storageState: ImportedStorageState;
};

type AuthenticatedSessionRow = {
  id: string;
  ownerSessionId: string;
  label: string;
  importKind: AuthenticatedSessionImportKind;
  encryptedPayload: string;
  allowedDomainJson: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  lastHealthState: AuthenticatedSessionHealthState;
};

type ParsedImport = {
  importKind: AuthenticatedSessionImportKind;
  storageState: ImportedStorageState;
  allowedDomains: string[];
  defaultLabel: string;
};

type EncryptionEnvelope = {
  iv: string;
  tag: string;
  ciphertext: string;
};

export class AuthenticatedSessionError extends Error {
  readonly code:
    | ExtractErrorCode
    | 'AUTH_SESSION_DISABLED'
    | 'AUTH_SESSION_MALFORMED'
    | 'AUTH_SESSION_OWNERSHIP_INVALID';

  readonly statusCode: number;

  constructor(
    code:
      | ExtractErrorCode
      | 'AUTH_SESSION_DISABLED'
      | 'AUTH_SESSION_MALFORMED'
      | 'AUTH_SESSION_OWNERSHIP_INVALID',
    message: string,
    statusCode = 400,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^\.+/, '');
  if (!trimmed) return null;
  if (trimmed.includes('/')) return null;
  return trimmed;
}

function parseAllowedDomainsJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeDomain(String(entry)))
      .filter((entry): entry is string => Boolean(entry));
  } catch {
    return [];
  }
}

function requireSecret(): Buffer {
  const rawSecret = process.env.OLERIQ_AUTH_SESSION_SECRET?.trim();
  if (!rawSecret) {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_DISABLED',
      'Authenticated session import is not configured on this server.',
      503,
    );
  }

  return crypto.createHash('sha256').update(rawSecret).digest();
}

function encryptPayload(payload: string): string {
  const key = requireSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: EncryptionEnvelope = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };

  return JSON.stringify(envelope);
}

function decryptPayload(payload: string): string {
  const key = requireSecret();
  let envelope: EncryptionEnvelope;

  try {
    envelope = JSON.parse(payload) as EncryptionEnvelope;
  } catch {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_INVALID',
      'The saved authenticated session payload could not be read.',
    );
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(envelope.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_INVALID',
      'The saved authenticated session payload is no longer valid.',
    );
  }
}

function normalizeCookie(input: unknown): ImportedCookie | null {
  if (!input || typeof input !== 'object') return null;

  const raw = input as Record<string, unknown>;
  const name = String(raw.name || '').trim();
  const value = String(raw.value || '');
  const domain = normalizeDomain(String(raw.domain || ''));
  if (!name || !domain) return null;

  const cookie: ImportedCookie = {
    name,
    value,
    domain,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };

  if (typeof raw.path === 'string' && raw.path.trim()) cookie.path = raw.path.trim();
  if (typeof raw.expires === 'number' && Number.isFinite(raw.expires)) cookie.expires = raw.expires;
  if (typeof raw.httpOnly === 'boolean') cookie.httpOnly = raw.httpOnly;
  if (typeof raw.secure === 'boolean') cookie.secure = raw.secure;
  if (raw.sameSite === 'Strict' || raw.sameSite === 'Lax' || raw.sameSite === 'None') {
    cookie.sameSite = raw.sameSite;
  }

  return cookie;
}

function normalizeOrigin(input: unknown): ImportedOrigin | null {
  if (!input || typeof input !== 'object') return null;

  const raw = input as Record<string, unknown>;
  const origin = String(raw.origin || '').trim();
  if (!origin) return null;

  try {
    const parsed = new URL(origin);
    const localStorage = Array.isArray(raw.localStorage)
      ? raw.localStorage
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => ({
            name: String((entry as Record<string, unknown>).name || ''),
            value: String((entry as Record<string, unknown>).value || ''),
          }))
          .filter((entry) => entry.name.length > 0)
      : [];

    return {
      origin: parsed.origin,
      localStorage,
    };
  } catch {
    return null;
  }
}

function collectAllowedDomains(storageState: ImportedStorageState): string[] {
  const allowed = new Set<string>();

  for (const cookie of storageState.cookies) {
    const domain = normalizeDomain(cookie.domain);
    if (domain) {
      allowed.add(domain);
    }
  }

  for (const origin of storageState.origins) {
    try {
      allowed.add(new URL(origin.origin).hostname.toLowerCase());
    } catch {
      // ignored
    }
  }

  return Array.from(allowed);
}

function parseImportedStorageState(payloadJson: string): ParsedImport {
  if (!payloadJson || typeof payloadJson !== 'string') {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import must be a JSON string payload.',
    );
  }

  const byteLength = Buffer.byteLength(payloadJson, 'utf8');
  if (byteLength > MAX_AUTH_SESSION_BYTES) {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import is too large for this product.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import must be valid JSON.',
    );
  }

  let importKind: AuthenticatedSessionImportKind;
  let cookies: ImportedCookie[] = [];
  let origins: ImportedOrigin[] = [];

  if (Array.isArray(parsed)) {
    importKind = 'cookie_array';
    cookies = parsed.map(normalizeCookie).filter((entry): entry is ImportedCookie => Boolean(entry));
  } else if (parsed && typeof parsed === 'object') {
    const raw = parsed as Record<string, unknown>;
    importKind = 'storage_state';
    cookies = Array.isArray(raw.cookies)
      ? raw.cookies.map(normalizeCookie).filter((entry): entry is ImportedCookie => Boolean(entry))
      : [];
    origins = Array.isArray(raw.origins)
      ? raw.origins.map(normalizeOrigin).filter((entry): entry is ImportedOrigin => Boolean(entry))
      : [];
  } else {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import must be Playwright storageState JSON or a cookie-array export.',
    );
  }

  if (cookies.length === 0 && origins.length === 0) {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import did not contain any reusable cookies or origins.',
    );
  }

  const storageState: ImportedStorageState = {
    cookies,
    origins,
  };

  const allowedDomains = collectAllowedDomains(storageState);
  if (allowedDomains.length === 0) {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_MALFORMED',
      'Authenticated session import did not contain any valid target domains.',
    );
  }

  return {
    importKind,
    storageState,
    allowedDomains,
    defaultLabel: allowedDomains[0],
  };
}

function mapSummary(row: AuthenticatedSessionRow): AuthenticatedSessionSummary {
  return {
    id: row.id,
    label: row.label,
    importKind: row.importKind,
    allowedDomains: parseAllowedDomainsJson(row.allowedDomainJson),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    lastHealthState: row.lastHealthState,
  };
}

function getSessionRow(id: string, ownerSessionId: string): AuthenticatedSessionRow | null {
  const row = db
    .prepare(
      `
      SELECT
        id,
        owner_session_id AS ownerSessionId,
        label,
        import_kind AS importKind,
        encrypted_payload AS encryptedPayload,
        allowed_domain_json AS allowedDomainJson,
        created_at AS createdAt,
        expires_at AS expiresAt,
        last_used_at AS lastUsedAt,
        last_health_state AS lastHealthState
      FROM authenticated_sessions
      WHERE id = ? AND owner_session_id = ?
      LIMIT 1
      `,
    )
    .get(id, ownerSessionId) as AuthenticatedSessionRow | undefined;

  return row || null;
}

function setSessionHealthState(id: string, state: AuthenticatedSessionHealthState, lastUsedAt?: string | null): void {
  db.prepare(
    `
    UPDATE authenticated_sessions
    SET last_health_state = ?, last_used_at = COALESCE(?, last_used_at)
    WHERE id = ?
    `,
  ).run(state, lastUsedAt ?? null, id);
}

export function purgeExpiredAuthenticatedSessions(now = nowIso()): number {
  const result = db
    .prepare(
      `
      DELETE FROM authenticated_sessions
      WHERE expires_at <= ?
      `,
    )
    .run(now);

  return result.changes;
}

export function listAuthenticatedSessions(ownerSessionId: string): AuthenticatedSessionSummary[] {
  purgeExpiredAuthenticatedSessions();

  const rows = db
    .prepare(
      `
      SELECT
        id,
        owner_session_id AS ownerSessionId,
        label,
        import_kind AS importKind,
        encrypted_payload AS encryptedPayload,
        allowed_domain_json AS allowedDomainJson,
        created_at AS createdAt,
        expires_at AS expiresAt,
        last_used_at AS lastUsedAt,
        last_health_state AS lastHealthState
      FROM authenticated_sessions
      WHERE owner_session_id = ?
      ORDER BY created_at DESC
      `,
    )
    .all(ownerSessionId) as AuthenticatedSessionRow[];

  return rows.map(mapSummary);
}

export function importAuthenticatedSession(input: {
  ownerSessionId: string;
  label?: string | null;
  payloadJson: string;
}): AuthenticatedSessionSummary {
  purgeExpiredAuthenticatedSessions();

  const parsed = parseImportedStorageState(input.payloadJson);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS).toISOString();
  const id = crypto.randomUUID();
  const label = (input.label || '').trim() || parsed.defaultLabel;

  const encryptedPayload = encryptPayload(JSON.stringify(parsed.storageState));

  db.prepare(
    `
    INSERT INTO authenticated_sessions (
      id,
      owner_session_id,
      label,
      import_kind,
      encrypted_payload,
      allowed_domain_json,
      created_at,
      expires_at,
      last_used_at,
      last_health_state
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'ready')
    `,
  ).run(
    id,
    input.ownerSessionId,
    label,
    parsed.importKind,
    encryptedPayload,
    JSON.stringify(parsed.allowedDomains),
    createdAt,
    expiresAt,
  );

  return {
    id,
    label,
    importKind: parsed.importKind,
    allowedDomains: parsed.allowedDomains,
    createdAt,
    expiresAt,
    lastUsedAt: null,
    lastHealthState: 'ready',
  };
}

export function deleteAuthenticatedSession(ownerSessionId: string, id: string): boolean {
  purgeExpiredAuthenticatedSessions();

  const result = db
    .prepare(
      `
      DELETE FROM authenticated_sessions
      WHERE id = ? AND owner_session_id = ?
      `,
    )
    .run(id, ownerSessionId);

  return result.changes > 0;
}

export function matchesAllowedDomain(hostname: string, allowedDomains: string[]): boolean {
  const normalizedHost = hostname.trim().toLowerCase();
  return allowedDomains.some((domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`));
}

export function resolveAuthenticatedSession(input: {
  ownerSessionId: string | null | undefined;
  authSessionId: string | null | undefined;
  targetUrl: string;
}): ResolvedAuthenticatedSession {
  const ownerSessionId = (input.ownerSessionId || '').trim();
  const authSessionId = (input.authSessionId || '').trim();

  if (!ownerSessionId || !authSessionId) {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_NOT_FOUND',
      'The selected authenticated session could not be found.',
    );
  }

  const row = getSessionRow(authSessionId, ownerSessionId);
  if (!row) {
    purgeExpiredAuthenticatedSessions();
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_NOT_FOUND',
      'The selected authenticated session could not be found.',
    );
  }

  if (Date.parse(row.expiresAt) <= Date.now()) {
    setSessionHealthState(row.id, 'expired');
    db.prepare(`DELETE FROM authenticated_sessions WHERE id = ?`).run(row.id);
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_EXPIRED',
      'The selected authenticated session expired. Import it again to continue.',
    );
  }

  const allowedDomains = parseAllowedDomainsJson(row.allowedDomainJson);
  let hostname = '';
  try {
    hostname = new URL(input.targetUrl).hostname.toLowerCase();
  } catch {
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_INVALID',
      'The target URL for this authenticated session is invalid.',
    );
  }

  if (!matchesAllowedDomain(hostname, allowedDomains)) {
    setSessionHealthState(row.id, 'domain_mismatch');
    throw new AuthenticatedSessionError(
      'AUTH_SESSION_DOMAIN_MISMATCH',
      'The selected authenticated session does not cover this domain.',
    );
  }

  let storageState: ImportedStorageState;
  try {
    storageState = JSON.parse(decryptPayload(row.encryptedPayload)) as ImportedStorageState;
  } catch (error) {
    setSessionHealthState(row.id, 'invalid');
    throw error;
  }

  const usedAt = nowIso();
  setSessionHealthState(row.id, 'used', usedAt);

  return {
    ...mapSummary({
      ...row,
      lastUsedAt: usedAt,
      lastHealthState: 'used',
    }),
    storageState,
  };
}
