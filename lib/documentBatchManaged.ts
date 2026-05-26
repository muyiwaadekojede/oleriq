import { Queue, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { Pool } from 'pg';

import { resolveManagedDocumentBatchConfig } from '@/lib/documentBatchManagedConfig';

export const MANAGED_DOCUMENT_BATCH_QUEUE_NAMES = {
  classify: 'oleriq-document-classify',
  convertFast: 'oleriq-document-convert-fast',
  convertDeep: 'oleriq-document-convert-deep',
  assemble: 'oleriq-document-assemble',
  finalize: 'oleriq-document-finalize',
} as const;

export type ManagedDocumentBatchPhase = 'queued' | 'classifying' | 'converting' | 'assembling' | 'review' | 'failed';

export type ManagedQueueName = (typeof MANAGED_DOCUMENT_BATCH_QUEUE_NAMES)[keyof typeof MANAGED_DOCUMENT_BATCH_QUEUE_NAMES];

export type ManagedDocumentBatchJobPayload = {
  jobId: string;
  itemId: string;
};

export type ManagedQueueSet = {
  classify: Queue<ManagedDocumentBatchJobPayload>;
  convertFast: Queue<ManagedDocumentBatchJobPayload>;
  convertDeep: Queue<ManagedDocumentBatchJobPayload>;
  assemble: Queue<ManagedDocumentBatchJobPayload>;
  finalize: Queue<ManagedDocumentBatchJobPayload>;
};

export type ManagedSqlExecutor = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export const MANAGED_DOCUMENT_BATCH_SCHEMA_STATEMENTS = [
  `
  CREATE TABLE IF NOT EXISTS managed_document_batch_jobs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    status TEXT NOT NULL,
    phase TEXT NOT NULL,
    export_format TEXT NOT NULL,
    images_mode TEXT NOT NULL,
    settings_json TEXT,
    total_items INTEGER NOT NULL,
    processed_items INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    last_error_code TEXT,
    last_error_message TEXT
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS managed_document_batch_items (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    upload_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    source_object_key TEXT NOT NULL,
    status TEXT NOT NULL,
    processing_lane TEXT,
    confidence_score DOUBLE PRECISION,
    escalated BOOLEAN NOT NULL DEFAULT FALSE,
    page_count INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    quality_state TEXT,
    warning_json TEXT,
    diagnostic_reason_json TEXT,
    output_object_key TEXT,
    output_filename TEXT,
    output_format TEXT,
    error_code TEXT,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (job_id) REFERENCES managed_document_batch_jobs(id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS managed_document_batch_attempts (
    id BIGSERIAL PRIMARY KEY,
    item_id TEXT NOT NULL,
    queue_name TEXT NOT NULL,
    phase TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS managed_document_batch_worker_heartbeats (
    worker_id TEXT PRIMARY KEY,
    queue_name TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    metadata_json TEXT
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS managed_document_batch_phase_metrics (
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    item_id TEXT,
    phase TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
  `,
  `CREATE INDEX IF NOT EXISTS idx_managed_document_batch_jobs_status_created ON managed_document_batch_jobs(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_managed_document_batch_items_job_position ON managed_document_batch_items(job_id, position)`,
  `CREATE INDEX IF NOT EXISTS idx_managed_document_batch_items_job_status ON managed_document_batch_items(job_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_managed_document_batch_attempts_item ON managed_document_batch_attempts(item_id, started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_managed_document_batch_phase_metrics_job ON managed_document_batch_phase_metrics(job_id, created_at DESC)`,
] as const;

export async function ensureManagedDocumentBatchSchema(executor: ManagedSqlExecutor): Promise<void> {
  for (const statement of MANAGED_DOCUMENT_BATCH_SCHEMA_STATEMENTS) {
    await executor.query(statement);
  }
}

export function createManagedDocumentBatchPool(): Pool {
  const config = resolveManagedDocumentBatchConfig();
  if (!config.enabled || !config.postgresUrl) {
    throw new Error('Managed document batch infrastructure is not configured.');
  }

  return new Pool({
    connectionString: config.postgresUrl,
    max: 10,
  });
}

export function createManagedDocumentBatchRedis(): Redis {
  const config = resolveManagedDocumentBatchConfig();
  if (!config.enabled || !config.redisUrl) {
    throw new Error('Managed document batch infrastructure is not configured.');
  }

  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export function createManagedDocumentBatchQueues(
  connection: Redis,
  defaultJobOptions: JobsOptions = { removeOnComplete: 1000, removeOnFail: 1000 },
): ManagedQueueSet {
  return {
    classify: new Queue(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.classify, { connection, defaultJobOptions }),
    convertFast: new Queue(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.convertFast, { connection, defaultJobOptions }),
    convertDeep: new Queue(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.convertDeep, { connection, defaultJobOptions }),
    assemble: new Queue(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.assemble, { connection, defaultJobOptions }),
    finalize: new Queue(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.finalize, { connection, defaultJobOptions }),
  };
}

export async function closeManagedDocumentBatchQueues(queues: ManagedQueueSet): Promise<void> {
  await Promise.all([
    queues.classify.close(),
    queues.convertFast.close(),
    queues.convertDeep.close(),
    queues.assemble.close(),
    queues.finalize.close(),
  ]);
}
