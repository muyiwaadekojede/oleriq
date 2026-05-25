import db from '@/lib/db';

export type PublicProofMetricKey = 'files_converted';
export type PublicConversionKind = 'converted' | 'passthrough' | 'original_fallback';
export type PublicConversionSourceSurface =
  | 'homepage_export'
  | 'batch_url_export'
  | 'direct_file'
  | 'batch_url_direct_file'
  | 'batch_document';

export type PublicProofPayload = {
  primaryMetric: PublicProofMetricKey;
  value: number;
  label: string;
  publishedAt: string;
  nextRefreshAt: string;
};

const PUBLIC_PROOF_METRIC_KEY: PublicProofMetricKey = 'files_converted';
const PUBLIC_PROOF_LABEL = 'files converted';
const PUBLIC_PROOF_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

type SnapshotRow = {
  metricKey: string;
  value: number;
  label: string;
  publishedAt: string;
  nextRefreshAt: string;
};

function safeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  try {
    return JSON.stringify(value).slice(0, 4_000);
  } catch {
    return String(value).slice(0, 4_000);
  }
}

function mapSnapshot(row: SnapshotRow): PublicProofPayload {
  return {
    primaryMetric: PUBLIC_PROOF_METRIC_KEY,
    value: Number(row.value || 0),
    label: String(row.label || PUBLIC_PROOF_LABEL),
    publishedAt: String(row.publishedAt),
    nextRefreshAt: String(row.nextRefreshAt),
  };
}

function getSnapshotRow(): SnapshotRow | null {
  const row = db
    .prepare(
      `
      SELECT
        metric_key AS metricKey,
        metric_value AS value,
        label,
        published_at AS publishedAt,
        next_refresh_at AS nextRefreshAt
      FROM public_proof_snapshots
      WHERE metric_key = ?
      LIMIT 1
      `,
    )
    .get(PUBLIC_PROOF_METRIC_KEY) as SnapshotRow | undefined;

  return row || null;
}

function isSnapshotFresh(row: SnapshotRow, now: Date): boolean {
  const publishedAtMs = Date.parse(row.publishedAt || '');
  const nextRefreshAtMs = Date.parse(row.nextRefreshAt || '');
  if (!Number.isFinite(publishedAtMs) || !Number.isFinite(nextRefreshAtMs)) {
    return false;
  }
  return publishedAtMs <= now.getTime() && nextRefreshAtMs > now.getTime();
}

export function recordPublicConversionEvent(input: {
  sessionId?: string | null;
  sourceSurface: PublicConversionSourceSurface;
  conversionKind: PublicConversionKind;
  exportFormat?: string | null;
  eventTime?: string;
  metadata?: unknown;
}): void {
  const eventTime = input.eventTime || new Date().toISOString();

  try {
    db.prepare(
      `
      INSERT INTO public_conversion_events (
        event_time,
        session_id,
        source_surface,
        conversion_kind,
        export_format,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(
      eventTime,
      input.sessionId?.trim() || null,
      input.sourceSurface,
      input.conversionKind,
      input.exportFormat?.trim() || null,
      safeJson(input.metadata),
    );
  } catch (error) {
    console.error('Public proof tracking error:', error);
  }
}

export function getPublishedPublicProof(now = new Date()): PublicProofPayload {
  const existing = getSnapshotRow();
  if (existing && isSnapshotFresh(existing, now)) {
    return mapSnapshot(existing);
  }

  const publishedAt = now.toISOString();
  const nextRefreshAt = new Date(now.getTime() + PUBLIC_PROOF_REFRESH_MS).toISOString();

  const tx = db.transaction(() => {
    const totals = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM public_conversion_events
        WHERE conversion_kind = 'converted'
        `,
      )
      .get() as { count: number };

    const value = Number(totals?.count || 0);

    db.prepare(
      `
      INSERT INTO public_proof_snapshots (
        metric_key,
        metric_value,
        label,
        published_at,
        next_refresh_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(metric_key) DO UPDATE SET
        metric_value = excluded.metric_value,
        label = excluded.label,
        published_at = excluded.published_at,
        next_refresh_at = excluded.next_refresh_at
      `,
    ).run(PUBLIC_PROOF_METRIC_KEY, value, PUBLIC_PROOF_LABEL, publishedAt, nextRefreshAt);

    return {
      primaryMetric: PUBLIC_PROOF_METRIC_KEY,
      value,
      label: PUBLIC_PROOF_LABEL,
      publishedAt,
      nextRefreshAt,
    } satisfies PublicProofPayload;
  });

  return tx();
}
