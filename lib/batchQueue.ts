import crypto from 'crypto';
import path from 'path';
import readline from 'node:readline';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

import { cleanupBatchStorageArtifacts, getUploadedDocumentsByIds, readStoredObjectBuffer, storeOutputBuffer } from '@/lib/batchStorage';
import { summarizeLaneCounts, type DocumentProcessingLane } from '@/lib/documentBatchRouter';
import db from '@/lib/db';
import {
  convertDocumentBuffer,
  isSupportedDocumentFilename,
  MAX_DOCUMENT_BATCH_BYTES,
  MAX_DOCUMENT_BATCH_FILES,
} from '@/lib/documentConversion';
import { storeExtractSnapshot } from '@/lib/extractCache';
import { extractFromUrl } from '@/lib/extract';
import { buildMarkdownExport } from '@/lib/exportMarkdown';
import { buildTxtExport } from '@/lib/exportTxt';
import { recordPublicConversionEvent } from '@/lib/publicProof';
import { recoverDocumentFromHtml } from '@/lib/recoveredStructure';
import { structuralDiagnosticReasonsForRecoveredDocumentExport } from '@/lib/structuralFidelity';
import {
  deriveResultState,
  diagnosticReasonsForExtractErrorCode,
  normalizeStoredResultState,
  warningForDiagnosticReason,
} from '@/lib/trustGuidance';
import type {
  BatchDiagnosticReason,
  BatchDocumentUploadInput,
  BatchInputMode,
  ExportFormat,
  ExtractErrorCode,
  ExtractSuccessResponse,
  ExtractResultState,
  ImageMode,
  ReaderSettings,
} from '@/lib/types';

export type BatchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BatchItemStatus = 'pending' | 'running' | 'success' | 'failure';

export type BatchJobRow = {
  id: string;
  sessionId: string | null;
  status: BatchJobStatus;
  phase: 'queued' | 'classifying' | 'converting' | 'assembling' | 'review' | 'failed';
  inputMode: BatchInputMode;
  exportFormat: ExportFormat;
  imagesMode: ImageMode;
  settingsJson: string | null;
  totalUrls: number;
  processedUrls: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number | null;
  degradedCount: number;
  usableCount: number;
  emptyOutputCount: number;
  partialOutputCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export type BatchItemRow = {
  id: number;
  jobId: string;
  position: number;
  url: string;
  status: BatchItemStatus;
  qualityState: ExtractResultState | null;
  warnings: string[];
  diagnosticReasons: BatchDiagnosticReason[];
  durationMs: number;
  extractionId: string | null;
  sourceUrl: string | null;
  title: string | null;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  sourceObjectKey: string | null;
  processingLane: DocumentProcessingLane | null;
  confidenceScore: number | null;
  escalated: boolean;
  pageCount: number | null;
  attemptCount: number;
  outputObjectKey: string | null;
  outputFilename: string | null;
  outputFormat: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

function parseStringArrayJson(value: unknown): string[] {
  if (!value || typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => String(entry)).filter(Boolean);
  } catch {
    return [];
  }
}

export const MAX_BATCH_JOB_URLS = 50_000;
const DEFAULT_MS_PER_URL = 9_000;
const DEFAULT_DOCUMENT_SETTINGS: ReaderSettings = {
  fontFace: 'serif',
  fontSize: 16,
  lineSpacing: 1.6,
  colorTheme: 'light',
};
const BATCH_WORKER_CONCURRENCY = 3;
const BATCH_ITEM_MAX_ATTEMPTS = 3;
const BATCH_RETRY_BASE_DELAY_MS = 1_500;
const BATCH_RETRY_MAX_DELAY_MS = 12_000;
const DOMAIN_FAILURE_COOLDOWN_BASE_MS = 2_000;
const DOMAIN_FAILURE_COOLDOWN_MAX_MS = 20_000;
const LOCAL_DOCUMENT_WORKER_CONCURRENCY = 6;
const RETRYABLE_ERROR_CODES = new Set<ExtractErrorCode>(['TIMEOUT', 'FETCH_FAILED']);

const BOT_UA_MARKERS = [
  'bot',
  'spider',
  'crawl',
  'crawler',
  'slurp',
  'headless',
  'phantom',
  'python-requests',
  'python-urllib',
  'curl/',
  'wget/',
  'uptime',
  'monitor',
  'axios/',
  'postmanruntime',
  'httpclient',
];

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  const safeMs = Math.max(0, Math.floor(ms));
  if (safeMs === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, safeMs));
}

function getHostnameFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return 'unknown-host';
  }
}

function getTitleFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    const decoded = decodeURIComponent(lastSegment);
    return decoded || parsed.hostname;
  } catch {
    return 'Direct File';
  }
}

function shouldRetryFailure(errorCode: string): boolean {
  return RETRYABLE_ERROR_CODES.has(errorCode as ExtractErrorCode);
}

function computeRetryDelayMs(attemptNumber: number): number {
  const exponent = Math.max(0, attemptNumber - 1);
  const delay = BATCH_RETRY_BASE_DELAY_MS * 2 ** exponent;
  return Math.min(BATCH_RETRY_MAX_DELAY_MS, delay);
}

function computeDomainCooldownMs(consecutiveFailures: number): number {
  const exponent = Math.max(0, consecutiveFailures - 1);
  const delay = DOMAIN_FAILURE_COOLDOWN_BASE_MS * 2 ** exponent;
  return Math.min(DOMAIN_FAILURE_COOLDOWN_MAX_MS, delay);
}

function parseUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeBatchUrls(rawUrls: string[]): string[] {
  const unique = new Set<string>();
  const urls: string[] = [];

  for (const raw of rawUrls) {
    const normalized = parseUrl(raw);
    if (!normalized || unique.has(normalized)) continue;

    unique.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

function normalizeInputMode(value: unknown): BatchInputMode {
  return value === 'document' ? 'document' : 'url';
}

function normalizeExportFormat(value: unknown): ExportFormat {
  if (value === 'txt' || value === 'md' || value === 'docx' || value === 'pdf') return value;
  return 'md';
}

function normalizeImageMode(value: unknown): ImageMode {
  if (value === 'off' || value === 'captions' || value === 'on') return value;
  return 'off';
}

function normalizeSettings(input: unknown): Partial<ReaderSettings> {
  if (!input || typeof input !== 'object') return {};

  const candidate = input as Partial<ReaderSettings>;
  const out: Partial<ReaderSettings> = {};

  if (
    candidate.fontFace === 'serif' ||
    candidate.fontFace === 'sans-serif' ||
    candidate.fontFace === 'monospace' ||
    candidate.fontFace === 'dyslexic'
  ) {
    out.fontFace = candidate.fontFace;
  }

  if (typeof candidate.fontSize === 'number' && Number.isFinite(candidate.fontSize)) {
    out.fontSize = Math.max(12, Math.min(28, candidate.fontSize));
  }

  if (typeof candidate.lineSpacing === 'number' && Number.isFinite(candidate.lineSpacing)) {
    out.lineSpacing = Math.max(1.2, Math.min(2.4, candidate.lineSpacing));
  }

  if (candidate.colorTheme === 'light' || candidate.colorTheme === 'dark' || candidate.colorTheme === 'sepia') {
    out.colorTheme = candidate.colorTheme;
  }

  return out;
}

function resolveReaderSettings(settingsJson: string | null): ReaderSettings {
  if (!settingsJson) return DEFAULT_DOCUMENT_SETTINGS;

  try {
    return {
      ...DEFAULT_DOCUMENT_SETTINGS,
      ...normalizeSettings(JSON.parse(settingsJson) as unknown),
    };
  } catch {
    return DEFAULT_DOCUMENT_SETTINGS;
  }
}

function mapJobRow(row: Record<string, unknown>): BatchJobRow {
  return {
    id: String(row.id),
    sessionId: row.sessionId ? String(row.sessionId) : null,
    status: String(row.status) as BatchJobStatus,
    phase: String(row.phase || 'queued') as BatchJobRow['phase'],
    inputMode: String(row.inputMode || 'url') as BatchInputMode,
    exportFormat: String(row.exportFormat) as ExportFormat,
    imagesMode: String(row.imagesMode) as ImageMode,
    settingsJson: row.settingsJson ? String(row.settingsJson) : null,
    totalUrls: Number(row.totalUrls || 0),
    processedUrls: Number(row.processedUrls || 0),
    successCount: Number(row.successCount || 0),
    failureCount: Number(row.failureCount || 0),
    averageDurationMs: row.averageDurationMs === null || row.averageDurationMs === undefined ? null : Number(row.averageDurationMs),
    degradedCount: Number(row.degradedCount || 0),
    usableCount: Number(row.usableCount || 0),
    emptyOutputCount: Number(row.emptyOutputCount || 0),
    partialOutputCount: Number(row.partialOutputCount || 0),
    createdAt: String(row.createdAt),
    startedAt: row.startedAt ? String(row.startedAt) : null,
    completedAt: row.completedAt ? String(row.completedAt) : null,
    updatedAt: String(row.updatedAt),
    lastErrorCode: row.lastErrorCode ? String(row.lastErrorCode) : null,
    lastErrorMessage: row.lastErrorMessage ? String(row.lastErrorMessage) : null,
  };
}

function mapItemRow(row: Record<string, unknown>): BatchItemRow {
  const diagnosticReasons = parseStringArrayJson(row.diagnosticReasonJson) as BatchDiagnosticReason[];
  return {
    id: Number(row.id),
    jobId: String(row.jobId),
    position: Number(row.position || 0),
    url: String(row.url),
    status: String(row.status) as BatchItemStatus,
    qualityState: normalizeStoredResultState(
      row.qualityState ? (String(row.qualityState) as ExtractResultState) : null,
      diagnosticReasons,
    ),
    warnings: parseStringArrayJson(row.warningJson),
    diagnosticReasons,
    durationMs: Number(row.durationMs || 0),
    extractionId: row.extractionId ? String(row.extractionId) : null,
    sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
    title: row.title ? String(row.title) : null,
    originalFilename: row.originalFilename ? String(row.originalFilename) : null,
    contentType: row.contentType ? String(row.contentType) : null,
    byteSize: row.byteSize === null || row.byteSize === undefined ? null : Number(row.byteSize),
    sourceObjectKey: row.sourceObjectKey ? String(row.sourceObjectKey) : null,
    processingLane: row.processingLane ? (String(row.processingLane) as DocumentProcessingLane) : null,
    confidenceScore:
      row.confidenceScore === null || row.confidenceScore === undefined ? null : Number(row.confidenceScore),
    escalated: Boolean(row.escalated),
    pageCount: row.pageCount === null || row.pageCount === undefined ? null : Number(row.pageCount),
    attemptCount: Number(row.attemptCount || 0),
    outputObjectKey: row.outputObjectKey ? String(row.outputObjectKey) : null,
    outputFilename: row.outputFilename ? String(row.outputFilename) : null,
    outputFormat: row.outputFormat ? String(row.outputFormat) : null,
    errorCode: row.errorCode ? String(row.errorCode) : null,
    errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    startedAt: row.startedAt ? String(row.startedAt) : null,
    completedAt: row.completedAt ? String(row.completedAt) : null,
  };
}

export function getBatchJob(jobId: string): BatchJobRow | null {
  const row = db
    .prepare(
      `
      SELECT
        id,
        session_id AS sessionId,
        status,
        phase,
        input_mode AS inputMode,
        export_format AS exportFormat,
        images_mode AS imagesMode,
        settings_json AS settingsJson,
        total_urls AS totalUrls,
        processed_urls AS processedUrls,
        success_count AS successCount,
        failure_count AS failureCount,
        average_duration_ms AS averageDurationMs,
        created_at AS createdAt,
        started_at AS startedAt,
        completed_at AS completedAt,
        updated_at AS updatedAt,
        last_error_code AS lastErrorCode,
        last_error_message AS lastErrorMessage
      FROM batch_jobs
      WHERE id = ?
      LIMIT 1
      `,
    )
    .get(jobId) as Record<string, unknown> | undefined;

  return row ? mapJobRow(row) : null;
}

export function getBatchJobItems(jobId: string, limit: number, offset: number): BatchItemRow[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit) || 200));
  const safeOffset = Math.max(0, Math.floor(offset) || 0);

  const rows = db
    .prepare(
      `
      SELECT
        id,
        job_id AS jobId,
        position,
        url,
        status,
        quality_state AS qualityState,
        warning_json AS warningJson,
        diagnostic_reason_json AS diagnosticReasonJson,
        duration_ms AS durationMs,
        extraction_id AS extractionId,
        source_url AS sourceUrl,
        title,
        original_filename AS originalFilename,
        content_type AS contentType,
        byte_size AS byteSize,
        source_object_key AS sourceObjectKey,
        processing_lane AS processingLane,
        confidence_score AS confidenceScore,
        escalated,
        page_count AS pageCount,
        attempt_count AS attemptCount,
        output_object_key AS outputObjectKey,
        output_filename AS outputFilename,
        output_format AS outputFormat,
        error_code AS errorCode,
        error_message AS errorMessage,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM batch_job_items
      WHERE job_id = ?
      ORDER BY position ASC
      LIMIT ? OFFSET ?
      `,
    )
    .all(jobId, safeLimit, safeOffset) as Array<Record<string, unknown>>;

  return rows.map(mapItemRow);
}

export function getBatchJobItem(jobId: string, itemId: number): BatchItemRow | null {
  const row = db
    .prepare(
      `
      SELECT
        id,
        job_id AS jobId,
        position,
        url,
        status,
        quality_state AS qualityState,
        warning_json AS warningJson,
        diagnostic_reason_json AS diagnosticReasonJson,
        duration_ms AS durationMs,
        extraction_id AS extractionId,
        source_url AS sourceUrl,
        title,
        original_filename AS originalFilename,
        content_type AS contentType,
        byte_size AS byteSize,
        source_object_key AS sourceObjectKey,
        processing_lane AS processingLane,
        confidence_score AS confidenceScore,
        escalated,
        page_count AS pageCount,
        attempt_count AS attemptCount,
        output_object_key AS outputObjectKey,
        output_filename AS outputFilename,
        output_format AS outputFormat,
        error_code AS errorCode,
        error_message AS errorMessage,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM batch_job_items
      WHERE job_id = ? AND id = ?
      LIMIT 1
      `,
    )
    .get(jobId, itemId) as Record<string, unknown> | undefined;

  return row ? mapItemRow(row) : null;
}

export function createBatchJob(input: {
  sessionId: string | null;
  authSessionId?: string | null;
  inputMode?: unknown;
  urls?: string[];
  files?: BatchDocumentUploadInput[];
  format: unknown;
  images: unknown;
  settings?: unknown;
}): {
  jobId: string;
  totalUrls: number;
  status: BatchJobStatus;
  estimatedProcessingMs: number;
} {
  const inputMode = normalizeInputMode(input.inputMode);
  const now = nowIso();
  const jobId = crypto.randomUUID();
  const format = normalizeExportFormat(input.format);
  const images = normalizeImageMode(input.images);
  const settingsJson = JSON.stringify(normalizeSettings(input.settings));

  if (inputMode === 'document') {
    const uploadIds = Array.from(
      new Set(
        (input.files || [])
          .map((file) => String(file?.uploadId || '').trim())
          .filter(Boolean),
      ),
    );

    if (uploadIds.length === 0) {
      throw new Error('No uploaded files were provided for this batch.');
    }

    if (uploadIds.length > MAX_DOCUMENT_BATCH_FILES) {
      throw new Error(`Batch exceeds maximum of ${MAX_DOCUMENT_BATCH_FILES.toLocaleString()} files.`);
    }

    const uploads = getUploadedDocumentsByIds(input.sessionId, uploadIds);
    if (uploads.length !== uploadIds.length) {
      throw new Error('One or more uploaded files are missing or unavailable for this session.');
    }

    const totalBytes = uploads.reduce((sum, upload) => sum + upload.byteSize, 0);
    if (totalBytes > MAX_DOCUMENT_BATCH_BYTES) {
      throw new Error('Combined uploaded files exceed the technical batch size limit.');
    }

    for (const upload of uploads) {
      if (!isSupportedDocumentFilename(upload.originalFilename)) {
        throw new Error(`Unsupported uploaded file type: ${upload.originalFilename}`);
      }
    }

    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO batch_jobs (
          id,
          session_id,
          auth_session_id,
          status,
          phase,
          input_mode,
          export_format,
          images_mode,
          settings_json,
          total_urls,
          processed_urls,
          success_count,
          failure_count,
          average_duration_ms,
          created_at,
          started_at,
          completed_at,
          updated_at,
          last_error_code,
          last_error_message
        )
        VALUES (?, ?, ?, 'queued', 'queued', 'document', ?, ?, ?, ?, 0, 0, 0, NULL, ?, NULL, NULL, ?, NULL, NULL)
        `,
      ).run(jobId, input.sessionId, input.authSessionId || null, format, images, settingsJson, uploads.length, now, now);

      const insertItem = db.prepare(
        `
        INSERT INTO batch_job_items (
          job_id,
          position,
          url,
          status,
          duration_ms,
          extraction_id,
          source_url,
          title,
          original_filename,
          content_type,
          byte_size,
          source_object_key,
          processing_lane,
          confidence_score,
          escalated,
          page_count,
          attempt_count,
          output_object_key,
          output_filename,
          output_format,
          error_code,
          error_message,
          started_at,
          completed_at
        )
        VALUES (?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?, ?, ?, ?, NULL, NULL, 0, NULL, 0, NULL, NULL, ?, NULL, NULL, NULL, NULL)
        `,
      );

      uploads.forEach((upload, index) => {
        insertItem.run(
          jobId,
          index,
          `upload://${upload.uploadId}`,
          upload.originalFilename,
          upload.contentType,
          upload.byteSize,
          upload.objectKey,
          format,
        );
      });
    });

    tx();

    return {
      jobId,
      totalUrls: uploads.length,
      status: 'queued',
      estimatedProcessingMs: uploads.length * DEFAULT_MS_PER_URL,
    };
  }

  const urls = normalizeBatchUrls(input.urls || []);
  if (urls.length === 0) {
    throw new Error('No valid URLs were provided for this batch.');
  }

  if (urls.length > MAX_BATCH_JOB_URLS) {
    throw new Error(`Batch exceeds maximum of ${MAX_BATCH_JOB_URLS.toLocaleString()} URLs.`);
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO batch_jobs (
          id,
          session_id,
          auth_session_id,
          status,
          phase,
          input_mode,
          export_format,
        images_mode,
        settings_json,
        total_urls,
        processed_urls,
        success_count,
        failure_count,
        average_duration_ms,
        created_at,
        started_at,
        completed_at,
        updated_at,
          last_error_code,
          last_error_message
        )
      VALUES (?, ?, ?, 'queued', 'queued', 'url', ?, ?, ?, ?, 0, 0, 0, NULL, ?, NULL, NULL, ?, NULL, NULL)
      `,
    ).run(jobId, input.sessionId, input.authSessionId || null, format, images, settingsJson, urls.length, now, now);

    const insertItem = db.prepare(
      `
      INSERT INTO batch_job_items (
        job_id,
        position,
        url,
        status,
        duration_ms,
        extraction_id,
        source_url,
        title,
        processing_lane,
        confidence_score,
        escalated,
        page_count,
        attempt_count,
        error_code,
        error_message,
        started_at,
        completed_at
      )
      VALUES (?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL)
      `,
    );

    for (let index = 0; index < urls.length; index += 1) {
      insertItem.run(jobId, index, urls[index]);
    }
  });

  tx();

  return {
    jobId,
    totalUrls: urls.length,
    status: 'queued',
    estimatedProcessingMs: urls.length * DEFAULT_MS_PER_URL,
  };
}

function claimNextQueuedJob(): { id: string } | null {
  const now = nowIso();
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        `
        SELECT id
        FROM batch_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        `,
      )
      .get() as { id: string } | undefined;

    if (!row) return null;

    db.prepare(
      `
      UPDATE batch_jobs
      SET status = 'running', started_at = COALESCE(started_at, ?), updated_at = ?
      WHERE id = ?
      `,
    ).run(now, now, row.id);

    return row;
  });

  return tx();
}

function claimNextPendingItem(jobId: string): BatchItemRow | null {
  const now = nowIso();
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        `
        SELECT
          id,
          job_id AS jobId,
        position,
        url,
        status,
        quality_state AS qualityState,
        warning_json AS warningJson,
        diagnostic_reason_json AS diagnosticReasonJson,
        duration_ms AS durationMs,
          extraction_id AS extractionId,
          source_url AS sourceUrl,
        title,
        original_filename AS originalFilename,
        content_type AS contentType,
        byte_size AS byteSize,
        source_object_key AS sourceObjectKey,
        processing_lane AS processingLane,
        confidence_score AS confidenceScore,
        escalated,
        page_count AS pageCount,
        attempt_count AS attemptCount,
        output_object_key AS outputObjectKey,
        output_filename AS outputFilename,
        output_format AS outputFormat,
          error_code AS errorCode,
          error_message AS errorMessage,
          started_at AS startedAt,
          completed_at AS completedAt
        FROM batch_job_items
        WHERE job_id = ? AND status = 'pending'
        ORDER BY position ASC
        LIMIT 1
        `,
      )
      .get(jobId) as Record<string, unknown> | undefined;

    if (!row) return null;

    db.prepare(
      `
      UPDATE batch_job_items
      SET status = 'running', started_at = ?, attempt_count = attempt_count + 1
      WHERE id = ?
      `,
    ).run(now, row.id);

    return mapItemRow(row);
  });

  return tx();
}

function markItemSuccess(input: {
  jobId: string;
  itemId: number;
  durationMs: number;
  qualityState: ExtractResultState;
  warnings: string[];
  diagnosticReasons: BatchDiagnosticReason[];
  extractionId: string | null;
  sourceUrl: string | null;
  title: string;
  processingLane?: DocumentProcessingLane | null;
  confidenceScore?: number | null;
  escalated?: boolean;
  pageCount?: number | null;
  outputObjectKey?: string | null;
  outputFilename?: string | null;
  outputFormat?: string | null;
}): void {
  const now = nowIso();

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE batch_job_items
      SET
        status = 'success',
        duration_ms = ?,
        quality_state = ?,
        warning_json = ?,
        diagnostic_reason_json = ?,
        extraction_id = ?,
        source_url = ?,
        title = ?,
        processing_lane = ?,
        confidence_score = ?,
        escalated = ?,
        page_count = ?,
        output_object_key = ?,
        output_filename = ?,
        output_format = ?,
        error_code = NULL,
        error_message = NULL,
        completed_at = ?
      WHERE id = ?
      `,
    ).run(
      input.durationMs,
      input.qualityState,
      JSON.stringify(input.warnings),
      JSON.stringify(input.diagnosticReasons),
      input.extractionId,
      input.sourceUrl,
      input.title,
      input.processingLane || null,
      input.confidenceScore ?? null,
      input.escalated ? 1 : 0,
      input.pageCount ?? null,
      input.outputObjectKey || null,
      input.outputFilename || null,
      input.outputFormat || null,
      now,
      input.itemId,
    );

    db.prepare(
      `
      UPDATE batch_jobs
      SET
        processed_urls = processed_urls + 1,
        success_count = success_count + 1,
        average_duration_ms = CAST(
          ((COALESCE(average_duration_ms, 0) * processed_urls) + ?) / (processed_urls + 1)
          AS INTEGER
        ),
        phase = 'converting',
        updated_at = ?,
        last_error_code = NULL,
        last_error_message = NULL
      WHERE id = ?
      `,
    ).run(input.durationMs, now, input.jobId);
  });

  tx();
}

function markItemFailure(input: {
  jobId: string;
  itemId: number;
  durationMs: number;
  errorCode: string;
  errorMessage: string;
  diagnosticReasons: BatchDiagnosticReason[];
  processingLane?: DocumentProcessingLane | null;
  confidenceScore?: number | null;
  escalated?: boolean;
  pageCount?: number | null;
}): void {
  const now = nowIso();

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE batch_job_items
      SET
        status = 'failure',
        duration_ms = ?,
        quality_state = NULL,
        warning_json = NULL,
        diagnostic_reason_json = ?,
        extraction_id = NULL,
        source_url = NULL,
        title = NULL,
        processing_lane = ?,
        confidence_score = ?,
        escalated = ?,
        page_count = ?,
        output_object_key = NULL,
        output_filename = NULL,
        error_code = ?,
        error_message = ?,
        completed_at = ?
      WHERE id = ?
      `,
    ).run(
      input.durationMs,
      JSON.stringify(input.diagnosticReasons),
      input.processingLane || null,
      input.confidenceScore ?? null,
      input.escalated ? 1 : 0,
      input.pageCount ?? null,
      input.errorCode,
      input.errorMessage.slice(0, 1200),
      now,
      input.itemId,
    );

    db.prepare(
      `
      UPDATE batch_jobs
      SET
        processed_urls = processed_urls + 1,
        failure_count = failure_count + 1,
        average_duration_ms = CAST(
          ((COALESCE(average_duration_ms, 0) * processed_urls) + ?) / (processed_urls + 1)
          AS INTEGER
        ),
        phase = 'converting',
        updated_at = ?,
        last_error_code = ?,
        last_error_message = ?
      WHERE id = ?
      `,
    ).run(input.durationMs, now, input.errorCode.slice(0, 120), input.errorMessage.slice(0, 1200), input.jobId);
  });

  tx();
}

function finalizeJob(jobId: string): void {
  const now = nowIso();
  const row = db
    .prepare(
      `
      SELECT
        total_urls AS totalUrls,
        processed_urls AS processedUrls,
        success_count AS successCount,
        failure_count AS failureCount
      FROM batch_jobs
      WHERE id = ?
      LIMIT 1
      `,
    )
    .get(jobId) as
    | {
        totalUrls: number;
        processedUrls: number;
        successCount: number;
        failureCount: number;
      }
    | undefined;

  if (!row) return;

  const done = Number(row.processedUrls) >= Number(row.totalUrls);
  const status: BatchJobStatus = done ? 'completed' : 'running';

  db.prepare(
    `
    UPDATE batch_jobs
    SET
      status = ?,
      phase = CASE WHEN ? = 1 THEN 'review' ELSE phase END,
      completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
      updated_at = ?
    WHERE id = ?
    `,
  ).run(status, done ? 1 : 0, done ? 1 : 0, now, now, jobId);
}

function setJobPhase(jobId: string, phase: BatchJobRow['phase']): void {
  db.prepare(
    `
    UPDATE batch_jobs
    SET phase = ?, updated_at = ?
    WHERE id = ?
    `,
  ).run(phase, nowIso(), jobId);
}

function setDocumentItemPlan(input: {
  itemId: number;
  processingLane: DocumentProcessingLane;
  confidenceScore: number;
  escalated: boolean;
  pageCount: number | null;
}): void {
  db.prepare(
    `
    UPDATE batch_job_items
    SET
      processing_lane = ?,
      confidence_score = ?,
      escalated = ?,
      page_count = ?
    WHERE id = ?
    `,
  ).run(
    input.processingLane,
    input.confidenceScore,
    input.escalated ? 1 : 0,
    input.pageCount ?? null,
    input.itemId,
  );
}

function incrementItemAttempt(itemId: number): void {
  db.prepare(
    `
    UPDATE batch_job_items
    SET attempt_count = attempt_count + 1
    WHERE id = ?
    `,
  ).run(itemId);
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  const safeConcurrency = Math.max(1, Math.floor(concurrency) || 1);
  let index = 0;

  const runners = Array.from({ length: Math.min(safeConcurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      const item = items[currentIndex];
      if (item === undefined) break;
      await worker(item);
    }
  });

  await Promise.all(runners);
}

type LocalDocumentWorkerResult =
  | {
      success: true;
      title: string;
      resultState: ExtractResultState;
      warnings: string[];
      diagnosticReasons: BatchDiagnosticReason[];
      outputObjectKey: string;
      outputFilename: string;
      outputFormat: ExportFormat;
      processingLane: DocumentProcessingLane;
      confidenceScore: number;
      escalated: boolean;
      pageCount: number | null;
      attemptCount: number;
    }
  | {
      success: false;
      errorCode: string;
      errorMessage: string;
      processingLane: DocumentProcessingLane | null;
      confidenceScore: number | null;
      escalated: boolean;
      pageCount: number | null;
      attemptCount: number;
    };

type LocalDocumentWorkerWarmupResult = {
  success: true;
  kind: 'warmup';
};

type LocalDocumentWorkerResponseBody = LocalDocumentWorkerResult | LocalDocumentWorkerWarmupResult;

type LocalDocumentWorkerRequest =
  | {
      taskId: string;
      kind: 'warmup';
    }
  | {
      taskId: string;
      kind: 'convert';
      payload: {
        sourceObjectKey: string;
        originalFilename: string;
        contentType: string;
        exportFormat: ExportFormat;
        imagesMode: ImageMode;
        settings: ReaderSettings;
        sessionId: string | null;
      };
    };

type LocalDocumentWorkerResponse = LocalDocumentWorkerResponseBody & {
  taskId: string;
};

type LocalDocumentWorkerHandle = {
  child: ChildProcessWithoutNullStreams;
  reader: readline.Interface;
  pending:
    | {
        taskId: string;
        resolve: (value: LocalDocumentWorkerResponse) => void;
        reject: (error: Error) => void;
      }
    | null;
};

type LocalDocumentWorkerPool = {
  workers: LocalDocumentWorkerHandle[];
  nextWorkerIndex: number;
};

function resolveTsxCliPath(): string {
  return path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

function resolveLocalDocumentWorkerScriptPath(): string {
  return path.join(process.cwd(), 'workers', 'localDocumentTaskWorker.ts');
}

async function runLocalDocumentTaskWorker(input: {
  sourceObjectKey: string;
  originalFilename: string;
  contentType: string;
  exportFormat: ExportFormat;
  imagesMode: ImageMode;
  settings: ReaderSettings;
  sessionId: string | null;
}): Promise<LocalDocumentWorkerResult> {
  const pool = await ensureLocalDocumentWorkerPool();
  const worker = pool.workers[pool.nextWorkerIndex % pool.workers.length];
  pool.nextWorkerIndex += 1;
  const response = await runLocalDocumentWorkerRequest<LocalDocumentWorkerResult>(worker, {
    taskId: crypto.randomUUID(),
    kind: 'convert',
    payload: input,
  });

  if (!('attemptCount' in response)) {
    throw new Error('Local document worker returned a warmup response for a conversion task.');
  }

  return response;
}

function createLocalDocumentWorkerPool(): LocalDocumentWorkerPool {
  const workers = Array.from({ length: LOCAL_DOCUMENT_WORKER_CONCURRENCY }, () => {
    const child = spawn(
      process.execPath,
      [resolveTsxCliPath(), resolveLocalDocumentWorkerScriptPath()],
      {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const reader = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });
    const handle: LocalDocumentWorkerHandle = {
      child,
      reader,
      pending: null,
    };

    void (async () => {
      for await (const line of reader) {
        if (!line.trim()) continue;
        const pending = handle.pending;
        handle.pending = null;

        if (!pending) {
          continue;
        }

        try {
          const response = JSON.parse(line) as LocalDocumentWorkerResponse;
          if (response.taskId !== pending.taskId) {
            pending.reject(new Error(`Local document worker response task mismatch: expected ${pending.taskId}, got ${response.taskId}.`));
            continue;
          }
          pending.resolve(response);
        } catch (error) {
          pending.reject(
            new Error(
              `Local document worker returned invalid JSON: ${
                error instanceof Error ? error.message : String(error)
              }\n${line}`,
            ),
          );
        }
      }
    })();

    child.stderr.on('data', () => {
      // The worker reports structured failures through stdout.
    });

    child.on('close', (code) => {
      if (handle.pending) {
        handle.pending.reject(
          new Error(`Local document worker exited before completing task ${handle.pending.taskId} (${code ?? 'unknown'}).`),
        );
        handle.pending = null;
      }
    });

    return handle;
  });

  return {
    workers,
    nextWorkerIndex: 0,
  };
}

async function runLocalDocumentWorkerRequest<TResponse extends LocalDocumentWorkerResponseBody>(
  worker: LocalDocumentWorkerHandle,
  request: LocalDocumentWorkerRequest,
): Promise<TResponse> {
  return await new Promise<TResponse>((resolve, reject) => {
    if (worker.pending) {
      reject(new Error('Local document worker was assigned a task while still busy.'));
      return;
    }

    worker.pending = {
      taskId: request.taskId,
      resolve: (value) => {
        const { taskId: _taskId, ...body } = value as LocalDocumentWorkerResponse;
        resolve(body as TResponse);
      },
      reject,
    };
    worker.child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

async function warmLocalDocumentWorkerPool(pool: LocalDocumentWorkerPool): Promise<void> {
  await Promise.all(
    pool.workers.map(async (worker) => {
      const response = await runLocalDocumentWorkerRequest<LocalDocumentWorkerWarmupResult>(worker, {
        taskId: crypto.randomUUID(),
        kind: 'warmup',
      });
      if (!response.success || response.kind !== 'warmup') {
        throw new Error('Local document worker warmup returned an unexpected response.');
      }
    }),
  );
}

function destroyLocalDocumentWorkerPool(pool: LocalDocumentWorkerPool): void {
  for (const worker of pool.workers) {
    if (worker.pending) {
      worker.pending.reject(new Error(`Local document worker task ${worker.pending.taskId} was interrupted during shutdown.`));
      worker.pending = null;
    }
    worker.reader.close();
    worker.child.kill();
  }
}

function getJobProcessingConfig(jobId: string): {
  inputMode: BatchInputMode;
  imagesMode: ImageMode;
  exportFormat: ExportFormat;
  settingsJson: string | null;
  sessionId: string | null;
  authSessionId: string | null;
} | null {
  const row = db
    .prepare(
      `
      SELECT
        input_mode AS inputMode,
        images_mode AS imagesMode,
        export_format AS exportFormat,
        settings_json AS settingsJson,
        session_id AS sessionId,
        auth_session_id AS authSessionId
      FROM batch_jobs
      WHERE id = ?
      LIMIT 1
      `,
    )
    .get(jobId) as {
      inputMode: BatchInputMode;
      imagesMode: ImageMode;
      exportFormat: ExportFormat;
      settingsJson: string | null;
      sessionId: string | null;
      authSessionId: string | null;
    } | undefined;

  return row || null;
}

function exportTrustSurfaceForUrlResult(input: {
  exportFormat: ExportFormat;
  imagesMode: ImageMode;
  result: ExtractSuccessResponse;
}): {
  qualityState: ExtractResultState;
  warnings: string[];
  diagnosticReasons: BatchDiagnosticReason[];
} {
  const sourceHtml = input.result.contentVariants[input.imagesMode];
  const sourceDocument = recoverDocumentFromHtml(sourceHtml);
  let outputContent = '';

  if (input.exportFormat === 'md') {
    outputContent = buildMarkdownExport({
      title: input.result.title,
      byline: input.result.byline,
      sourceUrl: input.result.sourceUrl,
      siteName: input.result.siteName,
      publishedTime: input.result.publishedTime,
      document: sourceDocument,
    });
  } else if (input.exportFormat === 'txt') {
    outputContent = buildTxtExport({
      title: input.result.title,
      byline: input.result.byline,
      sourceUrl: input.result.sourceUrl,
      siteName: input.result.siteName,
      publishedTime: input.result.publishedTime,
      document: sourceDocument,
      textContent: input.result.textContent,
    });
  }

  const exportDiagnosticReasons = structuralDiagnosticReasonsForRecoveredDocumentExport({
    sourceDocument,
    format: input.exportFormat,
    outputContent,
  });

  const diagnosticReasons = [...new Set([...input.result.diagnosticReasons, ...exportDiagnosticReasons])];
  const warnings = [
    ...input.result.warnings,
    ...exportDiagnosticReasons
      .map((reason) => warningForDiagnosticReason(reason))
      .filter((warning): warning is string => Boolean(warning)),
  ];

  return {
    qualityState: deriveResultState({
      baseState: input.result.resultState,
      diagnosticReasons,
      warnings,
    }),
    warnings,
    diagnosticReasons,
  };
}

async function runUrlJob(
  jobId: string,
  config: {
    imagesMode: ImageMode;
    exportFormat: ExportFormat;
    sessionId: string | null;
    authSessionId: string | null;
  },
): Promise<void> {
  while (true) {
    const item = claimNextPendingItem(jobId);
    if (!item) break;

    const hostname = getHostnameFromUrl(item.url);
    const startedAt = Date.now();
    let completed = false;
    let lastErrorCode = 'EXTRACTION_FAILED';
    let lastErrorMessage = 'Extraction failed for this URL.';

    for (let attempt = 1; attempt <= BATCH_ITEM_MAX_ATTEMPTS; attempt += 1) {
      await waitForDomainCooldown(hostname);

      try {
        const result = await extractFromUrl(item.url, config.imagesMode, {
          ownerSessionId: config.sessionId,
          authSessionId: config.authSessionId,
        });

        if (!result.success) {
          lastErrorCode = result.errorCode || 'EXTRACTION_FAILED';
          lastErrorMessage = result.errorMessage || 'Extraction failed for this URL.';

          if (lastErrorCode === 'DIRECT_FILE_URL') {
            markDomainSuccess(hostname);
            markItemSuccess({
              jobId,
              itemId: item.id,
              durationMs: Date.now() - startedAt,
              qualityState: 'usable',
              warnings: [],
              diagnosticReasons: [],
              extractionId: null,
              sourceUrl: item.url,
              title: getTitleFromUrl(item.url),
            });
            completed = true;
            break;
          }

          if (shouldRetryFailure(lastErrorCode) && attempt < BATCH_ITEM_MAX_ATTEMPTS) {
            const domainCooldownMs = markDomainTransientFailure(hostname);
            const retryDelayMs = computeRetryDelayMs(attempt);
            await sleep(Math.max(domainCooldownMs, retryDelayMs));
            continue;
          }

          break;
        }

        const extractionId = storeExtractSnapshot({
          title: result.title,
          byline: result.byline,
          siteName: result.siteName,
          publishedTime: result.publishedTime,
          sourceUrl: result.sourceUrl,
          textContent: result.textContent,
          contentVariants: result.contentVariants,
          recoveredDocumentVariants: {
            on: recoverDocumentFromHtml(result.contentVariants.on),
            off: recoverDocumentFromHtml(result.contentVariants.off),
            captions: recoverDocumentFromHtml(result.contentVariants.captions),
          },
        });
        const trustSurface = exportTrustSurfaceForUrlResult({
          exportFormat: config.exportFormat,
          imagesMode: config.imagesMode,
          result,
        });

        markDomainSuccess(hostname);
        markItemSuccess({
          jobId,
          itemId: item.id,
          durationMs: Date.now() - startedAt,
          qualityState: trustSurface.qualityState,
          warnings: trustSurface.warnings,
          diagnosticReasons: trustSurface.diagnosticReasons,
          extractionId,
          sourceUrl: result.sourceUrl,
          title: result.title,
        });
        completed = true;
        break;
      } catch (error) {
        lastErrorCode = 'EXTRACTION_FAILED';
        lastErrorMessage = error instanceof Error ? error.message : 'Unexpected extraction error.';

        if (attempt < BATCH_ITEM_MAX_ATTEMPTS) {
          const domainCooldownMs = markDomainTransientFailure(hostname);
          const retryDelayMs = computeRetryDelayMs(attempt);
          await sleep(Math.max(domainCooldownMs, retryDelayMs));
          continue;
        }
      }
    }

    if (completed) continue;

    markItemFailure({
      jobId,
      itemId: item.id,
      durationMs: Date.now() - startedAt,
      errorCode: lastErrorCode,
      errorMessage: lastErrorMessage,
      diagnosticReasons: diagnosticReasonsForExtractErrorCode(lastErrorCode),
    });
  }
}

async function runDocumentJob(
  jobId: string,
  config: { exportFormat: ExportFormat; imagesMode: ImageMode; settingsJson: string | null; sessionId: string | null },
): Promise<void> {
  const settings = resolveReaderSettings(config.settingsJson);
  const claimedItems: BatchItemRow[] = [];

  while (true) {
    const item = claimNextPendingItem(jobId);
    if (!item) break;
    claimedItems.push(item);
  }

  if (claimedItems.length === 0) {
    return;
  }

  setJobPhase(jobId, 'classifying');
  setJobPhase(jobId, 'converting');

  await runWithConcurrency(claimedItems, LOCAL_DOCUMENT_WORKER_CONCURRENCY, async (item) => {
    const startedAt = Date.now();

    try {
      if (!item.sourceObjectKey || !item.originalFilename || !item.contentType) {
        throw new Error('Uploaded document metadata is incomplete.');
      }

      const result = await runLocalDocumentTaskWorker({
        sourceObjectKey: item.sourceObjectKey,
        originalFilename: item.originalFilename,
        contentType: item.contentType,
        exportFormat: config.exportFormat,
        imagesMode: config.imagesMode,
        settings,
        sessionId: config.sessionId,
      });

      if (result.success) {
        setDocumentItemPlan({
          itemId: item.id,
          processingLane: result.processingLane,
          confidenceScore: result.confidenceScore,
          escalated: result.escalated,
          pageCount: result.pageCount,
        });
        if (result.attemptCount > 1) {
          for (let attempt = 2; attempt <= result.attemptCount; attempt += 1) {
            incrementItemAttempt(item.id);
          }
        }

        markItemSuccess({
          jobId,
          itemId: item.id,
          durationMs: Date.now() - startedAt,
          qualityState: result.resultState,
          warnings: result.warnings,
          diagnosticReasons: result.diagnosticReasons,
          extractionId: null,
          sourceUrl: null,
          title: result.title,
          processingLane: result.processingLane,
          confidenceScore: result.confidenceScore,
          escalated: result.escalated,
          pageCount: result.pageCount,
          outputObjectKey: result.outputObjectKey,
          outputFilename: result.outputFilename,
          outputFormat: result.outputFormat,
        });
        recordPublicConversionEvent({
          sessionId: config.sessionId,
          sourceSurface: 'batch_document',
          conversionKind: 'converted',
          exportFormat: config.exportFormat,
        });
        return;
      }

      if (result.processingLane && result.confidenceScore !== null) {
        setDocumentItemPlan({
          itemId: item.id,
          processingLane: result.processingLane,
          confidenceScore: result.confidenceScore,
          escalated: result.escalated,
          pageCount: result.pageCount,
        });
      }
      if (result.attemptCount > 1) {
        for (let attempt = 2; attempt <= result.attemptCount; attempt += 1) {
          incrementItemAttempt(item.id);
        }
      }

      markItemFailure({
        jobId,
        itemId: item.id,
        durationMs: Date.now() - startedAt,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        diagnosticReasons: [],
        processingLane: result.processingLane,
        confidenceScore: result.confidenceScore,
        escalated: result.escalated,
        pageCount: result.pageCount,
      });
    } catch (error) {
      markItemFailure({
        jobId,
        itemId: item.id,
        durationMs: Date.now() - startedAt,
        errorCode: 'DOCUMENT_CONVERSION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unexpected document conversion error.',
        diagnosticReasons: [],
      });
    }
  });

  setJobPhase(jobId, 'assembling');
}

async function runJob(jobId: string): Promise<void> {
  await cleanupBatchStorageArtifacts();
  const config = getJobProcessingConfig(jobId);
  if (!config) return;

  if (config.inputMode === 'document') {
    await runDocumentJob(jobId, config);
  } else {
    await runUrlJob(jobId, config);
  }

  finalizeJob(jobId);
}

type QueueRuntime = {
  running: boolean;
  bootstrapped: boolean;
  domainCooldowns: Map<string, { nextAllowedAt: number; consecutiveFailures: number }>;
  documentWorkerPool?: LocalDocumentWorkerPool;
  documentWorkerPoolReady?: Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __oleriqBatchQueue: QueueRuntime | undefined;
}

function getRuntime(): QueueRuntime {
  if (!global.__oleriqBatchQueue) {
    global.__oleriqBatchQueue = {
      running: false,
      bootstrapped: false,
      domainCooldowns: new Map(),
    };
  }

  if (!global.__oleriqBatchQueue.domainCooldowns) {
    global.__oleriqBatchQueue.domainCooldowns = new Map();
  }

  return global.__oleriqBatchQueue;
}

async function ensureLocalDocumentWorkerPool(): Promise<LocalDocumentWorkerPool> {
  const runtime = getRuntime();
  if (!runtime.documentWorkerPool) {
    runtime.documentWorkerPool = createLocalDocumentWorkerPool();
  }

  if (!runtime.documentWorkerPoolReady) {
    const pool = runtime.documentWorkerPool;
    runtime.documentWorkerPoolReady = warmLocalDocumentWorkerPool(pool).catch((error) => {
      destroyLocalDocumentWorkerPool(pool);
      runtime.documentWorkerPool = undefined;
      runtime.documentWorkerPoolReady = undefined;
      throw error;
    });
  }

  await runtime.documentWorkerPoolReady;
  return runtime.documentWorkerPool;
}

export async function prepareDocumentBatchWorkers(): Promise<void> {
  await ensureLocalDocumentWorkerPool();
}

export function primeDocumentBatchWorkers(): void {
  void prepareDocumentBatchWorkers().catch(() => {
    // The real batch run will surface the failure if warmup cannot complete.
  });
}

async function waitForDomainCooldown(hostname: string): Promise<void> {
  const runtime = getRuntime();
  const state = runtime.domainCooldowns.get(hostname);
  if (!state) return;

  const waitMs = state.nextAllowedAt - Date.now();
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function markDomainSuccess(hostname: string): void {
  const runtime = getRuntime();
  runtime.domainCooldowns.delete(hostname);
}

function markDomainTransientFailure(hostname: string): number {
  const runtime = getRuntime();
  const previous = runtime.domainCooldowns.get(hostname);
  const consecutiveFailures = (previous?.consecutiveFailures || 0) + 1;
  const cooldownMs = computeDomainCooldownMs(consecutiveFailures);

  runtime.domainCooldowns.set(hostname, {
    consecutiveFailures,
    nextAllowedAt: Date.now() + cooldownMs,
  });

  return cooldownMs;
}

function bootstrapQueueState(): void {
  const runtime = getRuntime();
  if (runtime.bootstrapped) return;

  const now = nowIso();

  const tx = db.transaction(() => {
    db.prepare(
      `
      UPDATE batch_job_items
      SET status = 'pending', started_at = NULL
      WHERE status = 'running'
      `,
    ).run();

    db.prepare(
      `
      UPDATE batch_jobs
      SET status = 'queued', updated_at = ?
      WHERE status = 'running' AND processed_urls < total_urls
      `,
    ).run(now);
  });

  tx();
  runtime.bootstrapped = true;
}

function hasQueuedJobs(): boolean {
  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM batch_jobs
      WHERE status = 'queued'
      `,
    )
    .get() as { count: number };

  return Number(row.count || 0) > 0;
}

async function workerLoop(): Promise<void> {
  while (true) {
    const nextJob = claimNextQueuedJob();
    if (!nextJob) break;

    await runJob(nextJob.id);
  }
}

export function enqueueBatchProcessing(): void {
  bootstrapQueueState();

  const runtime = getRuntime();
  if (runtime.running) return;
  if (!hasQueuedJobs()) return;

  runtime.running = true;

  const workers = Array.from({ length: BATCH_WORKER_CONCURRENCY }, () => workerLoop());

  void Promise.allSettled(workers).then(() => {
    runtime.running = false;
    if (hasQueuedJobs()) {
      enqueueBatchProcessing();
    }
  });
}

export function getBatchJobDetail(input: {
  jobId: string;
  limit?: number;
  offset?: number;
}): {
  job: BatchJobRow & {
    laneSummary: Record<DocumentProcessingLane, number>;
    itemsInProgress: number;
    throughputPerMinute: number;
    retryCount: number;
  };
  items: BatchItemRow[];
  estimatedRemainingMs: number;
} | null {
  const job = getBatchJob(input.jobId);
  if (!job) return null;

  const items = getBatchJobItems(job.id, input.limit || 200, input.offset || 0);
  const summaryRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM batch_job_items
      WHERE job_id = ? AND status = 'success' AND quality_state = 'degraded' AND NOT (
        instr(COALESCE(diagnostic_reason_json, ''), '\"extract_rsc_fallback_used\"') > 0 OR
        instr(COALESCE(diagnostic_reason_json, ''), '\"extract_syndication_fallback_used\"') > 0 OR
        instr(COALESCE(diagnostic_reason_json, ''), '\"document_pdf_truncated_pages\"') > 0
      )
      `,
    )
    .get(job.id) as { count: number };
  const emptyOutputRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM batch_job_items
      WHERE job_id = ? AND instr(COALESCE(diagnostic_reason_json, ''), '\"extract_empty_content\"') > 0
      `,
    )
    .get(job.id) as { count: number };
  const partialOutputRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM batch_job_items
      WHERE job_id = ? AND (
        quality_state = 'partial' OR (
          quality_state = 'degraded' AND (
            instr(COALESCE(diagnostic_reason_json, ''), '\"extract_rsc_fallback_used\"') > 0 OR
            instr(COALESCE(diagnostic_reason_json, ''), '\"extract_syndication_fallback_used\"') > 0 OR
            instr(COALESCE(diagnostic_reason_json, ''), '\"document_pdf_truncated_pages\"') > 0
          )
        )
      )
      `,
    )
    .get(job.id) as { count: number };
  const degradedCount = Number(summaryRow.count || 0);
  const emptyOutputCount = Number(emptyOutputRow.count || 0);
  const partialOutputCount = Number(partialOutputRow.count || 0);
  const laneRows = db
    .prepare(
      `
      SELECT processing_lane AS processingLane, COUNT(*) AS count
      FROM batch_job_items
      WHERE job_id = ? AND processing_lane IS NOT NULL
      GROUP BY processing_lane
      `,
    )
    .all(job.id) as Array<{ processingLane: DocumentProcessingLane; count: number }>;
  const itemsInProgressRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM batch_job_items
      WHERE job_id = ? AND status = 'running'
      `,
    )
    .get(job.id) as { count: number };
  const retryCountRow = db
    .prepare(
      `
      SELECT COALESCE(SUM(CASE WHEN attempt_count > 1 THEN attempt_count - 1 ELSE 0 END), 0) AS count
      FROM batch_job_items
      WHERE job_id = ?
      `,
    )
    .get(job.id) as { count: number };
  const laneSummary = summarizeLaneCounts(
    laneRows.flatMap((row) =>
      Array.from({ length: Number(row.count || 0) }, () => ({
        lane: row.processingLane,
      })),
    ),
  );
  const startedAtMs = job.startedAt ? Date.parse(job.startedAt) : NaN;
  const elapsedMinutes =
    Number.isFinite(startedAtMs) && startedAtMs > 0 ? Math.max(1 / 60, (Date.now() - startedAtMs) / 60_000) : 0;
  const throughputPerMinute = elapsedMinutes > 0 ? Number((job.processedUrls / elapsedMinutes).toFixed(2)) : 0;
  const remaining = Math.max(0, job.totalUrls - job.processedUrls);
  const msPerUrl = job.averageDurationMs && job.averageDurationMs > 0 ? job.averageDurationMs : DEFAULT_MS_PER_URL;

  return {
    job: {
      ...job,
      degradedCount,
      usableCount: Math.max(0, job.successCount - degradedCount - partialOutputCount),
      emptyOutputCount,
      partialOutputCount,
      laneSummary,
      itemsInProgress: Number(itemsInProgressRow.count || 0),
      throughputPerMinute,
      retryCount: Number(retryCountRow.count || 0),
    },
    items,
    estimatedRemainingMs: remaining * msPerUrl,
  };
}

export function isLikelyBotUserAgent(userAgent: string): boolean {
  const lowered = (userAgent || '').toLowerCase();
  if (!lowered) return true;
  return BOT_UA_MARKERS.some((marker) => lowered.includes(marker));
}
