'use client';

import { upload } from '@vercel/blob/client';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BatchBelowFoldContent } from '@/components/BatchBelowFoldContent';
import { BatchDocumentPanel, type DocumentUploadItem } from '@/components/BatchDocumentPanel';
import { BatchUrlPanel } from '@/components/BatchUrlPanel';
import type { BatchItemResult } from '@/components/batchTypes';
import { getClientSessionId, trackClientEvent } from '@/lib/clientAnalytics';
import { BATCH_HEADER, FALLBACK_FORMAT_HEADER, SESSION_HEADER } from '@/lib/internalIdentifiers';
import type { BatchDiagnosticReason, BatchInputMode, ExportFormat, ImageMode, ReaderSettings } from '@/lib/types';

type BatchJobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type BatchJobApi = {
  id: string;
  status: Exclude<BatchJobStatus, 'idle'>;
  inputMode: BatchInputMode;
  totalUrls: number;
  processedUrls: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  usableCount: number;
  emptyOutputCount: number;
  partialOutputCount: number;
  averageDurationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
};

type BatchItemApi = {
  id: number;
  url: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  qualityState: 'usable' | 'partial' | 'degraded' | null;
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
  outputObjectKey: string | null;
  outputFilename: string | null;
  outputFormat: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type UploadConfig = {
  success: boolean;
  mode: 'blob' | 'filesystem';
  accept: string;
  limits: {
    maxFileBytes: number;
    maxFiles: number;
    maxBatchBytes: number;
    retentionHours: number;
  };
};

type UploadedDocumentRef = {
  uploadId: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  createdAt: string;
};

type DocumentUploadEntry = DocumentUploadItem & {
  file: File;
  uploadRef?: UploadedDocumentRef;
};

const BATCH_MAX_URLS = 50_000;
const BATCH_ESTIMATED_MS_PER_URL = 9_000;
const DEFAULT_SETTINGS: ReaderSettings = {
  fontFace: 'serif',
  fontSize: 16,
  lineSpacing: 1.6,
  colorTheme: 'light',
};
const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  success: true,
  mode: 'filesystem',
  accept: '.pdf,.docx,.epub,.txt,.md,.html,.htm,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.rst',
  limits: {
    maxFileBytes: 60 * 1024 * 1024,
    maxFiles: 500,
    maxBatchBytes: 2 * 1024 * 1024 * 1024,
    retentionHours: 24,
  },
};
const DOCUMENT_IMAGE_CAPABLE_EXTENSIONS = new Set(['.pdf', '.epub', '.html', '.htm', '.docx']);

function parseBatchUrls(value: string): string[] {
  const tokens = value
    .split(/[\s,;]+/g)
    .map((token) => token.trim())
    .filter(Boolean);

  const unique = new Set<string>();
  const urls: string[] = [];

  for (const token of tokens) {
    try {
      const parsed = new URL(token);
      if (!['http:', 'https:'].includes(parsed.protocol)) continue;

      const normalized = parsed.toString();
      if (unique.has(normalized)) continue;

      unique.add(normalized);
      urls.push(normalized);
    } catch {
      continue;
    }
  }

  return urls;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function parseIsoMs(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

function hasImageCapableDocument(filename: string): boolean {
  const lowerName = filename.trim().toLowerCase();
  for (const extension of DOCUMENT_IMAGE_CAPABLE_EXTENSIONS) {
    if (lowerName.endsWith(extension)) return true;
  }
  return false;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const contentDisposition = header || '';
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

function mapBatchItem(item: BatchItemApi): BatchItemResult {
  return {
    id: item.id,
    url: item.url,
    status: item.status,
    qualityState: item.qualityState || undefined,
    warnings: Array.isArray(item.warnings) ? item.warnings : [],
    diagnosticReasons: Array.isArray(item.diagnosticReasons) ? item.diagnosticReasons : [],
    durationMs: Number(item.durationMs || 0),
    extractionId: item.extractionId || undefined,
    sourceUrl: item.sourceUrl || undefined,
    title: item.title || undefined,
    originalFilename: item.originalFilename || undefined,
    contentType: item.contentType || undefined,
    byteSize: item.byteSize === null || item.byteSize === undefined ? undefined : Number(item.byteSize),
    sourceObjectKey: item.sourceObjectKey || undefined,
    outputObjectKey: item.outputObjectKey || undefined,
    outputFilename: item.outputFilename || undefined,
    outputFormat: item.outputFormat || undefined,
    errorCode: item.errorCode || undefined,
    errorMessage: item.errorMessage || undefined,
  };
}

export default function BatchPage() {
  const [mode, setMode] = useState<BatchInputMode>('url');
  const [uploadConfig, setUploadConfig] = useState<UploadConfig>(DEFAULT_UPLOAD_CONFIG);

  const [batchUrlsInput, setBatchUrlsInput] = useState('');
  const [batchFormat, setBatchFormat] = useState<ExportFormat>('md');
  const [batchDownloadingAll, setBatchDownloadingAll] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([]);
  const [batchJobId, setBatchJobId] = useState('');
  const [batchJobStatus, setBatchJobStatus] = useState<BatchJobStatus>('idle');
  const [batchProcessedCount, setBatchProcessedCount] = useState(0);
  const [batchTotalCount, setBatchTotalCount] = useState(0);
  const [batchSuccessCount, setBatchSuccessCount] = useState(0);
  const [batchFailureCount, setBatchFailureCount] = useState(0);
  const [batchDegradedCount, setBatchDegradedCount] = useState(0);
  const [batchUsableCount, setBatchUsableCount] = useState(0);
  const [batchEmptyOutputCount, setBatchEmptyOutputCount] = useState(0);
  const [batchPartialOutputCount, setBatchPartialOutputCount] = useState(0);
  const [batchEtaMs, setBatchEtaMs] = useState(0);
  const [batchRunMessage, setBatchRunMessage] = useState('');
  const [batchRetryingFailed, setBatchRetryingFailed] = useState(false);

  const [documentFormat, setDocumentFormat] = useState<ExportFormat>('pdf');
  const [documentUploads, setDocumentUploads] = useState<DocumentUploadEntry[]>([]);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentDownloadingAll, setDocumentDownloadingAll] = useState(false);
  const [documentResults, setDocumentResults] = useState<BatchItemResult[]>([]);
  const [documentJobId, setDocumentJobId] = useState('');
  const [documentJobStatus, setDocumentJobStatus] = useState<BatchJobStatus>('idle');
  const [documentProcessedCount, setDocumentProcessedCount] = useState(0);
  const [documentTotalCount, setDocumentTotalCount] = useState(0);
  const [documentSuccessCount, setDocumentSuccessCount] = useState(0);
  const [documentFailureCount, setDocumentFailureCount] = useState(0);
  const [documentDegradedCount, setDocumentDegradedCount] = useState(0);
  const [documentUsableCount, setDocumentUsableCount] = useState(0);
  const [documentEmptyOutputCount, setDocumentEmptyOutputCount] = useState(0);
  const [documentPartialOutputCount, setDocumentPartialOutputCount] = useState(0);
  const [documentEtaMs, setDocumentEtaMs] = useState(0);
  const [documentRunMessage, setDocumentRunMessage] = useState('');
  const [documentImageMode, setDocumentImageMode] = useState<ImageMode>('off');
  const [documentRetryingFailed, setDocumentRetryingFailed] = useState(false);

  const sessionIdRef = useRef('');
  const imagesRef = useRef<ImageMode>('off');

  useEffect(() => {
    sessionIdRef.current = getClientSessionId();

    void trackClientEvent({
      eventName: 'batch_page_opened',
      eventGroup: 'navigation',
      status: 'success',
      pagePath: '/batch',
    });

    void (async () => {
      try {
        const response = await fetch('/api/batch-upload-config');
        if (!response.ok) return;
        const json = (await response.json()) as UploadConfig;
        if (json.success) {
          setUploadConfig(json);
        }
      } catch {
        // Fallback config is good enough for local rendering.
      }
    })();
  }, []);

  const parsedBatchUrls = useMemo(() => parseBatchUrls(batchUrlsInput), [batchUrlsInput]);

  const selectedDocumentHasImageCapableFiles = useMemo(
    () => documentUploads.some((item) => hasImageCapableDocument(item.name)),
    [documentUploads],
  );
  const selectedDocumentHasMixedImageSupport = useMemo(
    () =>
      selectedDocumentHasImageCapableFiles &&
      documentUploads.some((item) => !hasImageCapableDocument(item.name)),
    [documentUploads, selectedDocumentHasImageCapableFiles],
  );
  const uploadedDocumentHasImageCapableFiles = useMemo(
    () =>
      documentUploads.some(
        (item) => item.status === 'uploaded' && item.uploadRef && hasImageCapableDocument(item.name),
      ),
    [documentUploads],
  );
  const effectiveDocumentImageMode: ImageMode = uploadedDocumentHasImageCapableFiles ? documentImageMode : 'off';

  const batchProcessing = batchJobStatus === 'queued' || batchJobStatus === 'running';
  const documentProcessing = documentJobStatus === 'queued' || documentJobStatus === 'running';

  function buildHeaders(): HeadersInit {
    return {
      ...(sessionIdRef.current ? { [SESSION_HEADER]: sessionIdRef.current } : {}),
      [BATCH_HEADER]: '1',
    };
  }

  async function readErrorMessage(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw) return 'Download failed.';
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('text/html') || /^\s*<!doctype html/i.test(raw) || /^\s*<html/i.test(raw)) {
      if (response.status >= 500) {
        return 'Server error while preparing this file. Retry download.';
      }
      return `Download failed (${response.status}). Retry.`;
    }

    try {
      const parsed = JSON.parse(raw) as { error?: string; details?: string };
      return parsed.error || parsed.details || raw;
    } catch {
      const cleaned = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return `Download failed (${response.status}).`;
      return cleaned.slice(0, 220);
    }
  }

  async function loadBatchJob(
    jobId: string,
    handlers: {
      setStatus: (value: BatchJobStatus) => void;
      setProcessedCount: (value: number) => void;
      setTotalCount: (value: number) => void;
      setSuccessCount: (value: number) => void;
      setFailureCount: (value: number) => void;
      setDegradedCount: (value: number) => void;
      setUsableCount: (value: number) => void;
      setEmptyOutputCount: (value: number) => void;
      setPartialOutputCount: (value: number) => void;
      setEtaMs: (value: number) => void;
      setResults: (rows: BatchItemResult[]) => void;
      setRunMessage: (value: string) => void;
      selectedFormat: ExportFormat;
      pagePath: '/batch';
    },
  ): Promise<BatchJobApi> {
    const response = await fetch(
      `/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=400&offset=0`,
      {
        headers: buildHeaders(),
      },
    );

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || `Batch job lookup failed (${response.status}).`);
    }

    const json = (await response.json()) as {
      success: boolean;
      job: BatchJobApi;
      estimatedRemainingMs: number;
      items: BatchItemApi[];
    };

    if (!json.success || !json.job) {
      throw new Error('Batch job payload was not successful.');
    }

    handlers.setStatus(json.job.status);
    handlers.setProcessedCount(Number(json.job.processedUrls || 0));
    handlers.setTotalCount(Number(json.job.totalUrls || 0));
    handlers.setSuccessCount(Number(json.job.successCount || 0));
    handlers.setFailureCount(Number(json.job.failureCount || 0));
    handlers.setDegradedCount(Number(json.job.degradedCount || 0));
    handlers.setUsableCount(Number(json.job.usableCount || 0));
    handlers.setEmptyOutputCount(Number(json.job.emptyOutputCount || 0));
    handlers.setPartialOutputCount(Number(json.job.partialOutputCount || 0));
    handlers.setEtaMs(Math.max(0, Number(json.estimatedRemainingMs || 0)));
    handlers.setResults((json.items || []).map(mapBatchItem));

    const startedAtMs = parseIsoMs(json.job.startedAt);
    const completedAtMs = parseIsoMs(json.job.completedAt);

    if (json.job.status === 'completed') {
      const durationMs =
        startedAtMs > 0 && completedAtMs > startedAtMs
          ? completedAtMs - startedAtMs
          : Number(json.job.averageDurationMs || 0) * Number(json.job.processedUrls || 0);

      const message = `Completed in ${formatDuration(durationMs)}. ${Number(json.job.usableCount || 0).toLocaleString()} usable, ${Number(json.job.partialOutputCount || 0).toLocaleString()} partial, ${Number(json.job.degradedCount || 0).toLocaleString()} degraded, ${Number(json.job.failureCount || 0).toLocaleString()} failed.`;
      handlers.setRunMessage(message);

      void trackClientEvent({
        eventName: 'batch_extract_result',
        eventGroup: 'extract',
        status: Number(json.job.failureCount || 0) > 0 ? 'failure' : 'success',
        pagePath: handlers.pagePath,
          metadata: {
            jobId: json.job.id,
            count: Number(json.job.totalUrls || 0),
            successCount: Number(json.job.successCount || 0),
            partialOutputCount: Number(json.job.partialOutputCount || 0),
            degradedCount: Number(json.job.degradedCount || 0),
            failureCount: Number(json.job.failureCount || 0),
            format: handlers.selectedFormat,
            inputMode: json.job.inputMode,
          },
      });
    } else if (json.job.status === 'running' || json.job.status === 'queued') {
      handlers.setRunMessage(
        `Processed ${Number(json.job.processedUrls || 0).toLocaleString()} of ${Number(json.job.totalUrls || 0).toLocaleString()} (${json.job.status}).`,
      );
    } else if (json.job.status === 'failed') {
      handlers.setRunMessage('Batch job failed before completion.');
    }

    return json.job;
  }

  useEffect(() => {
    if (!batchJobId) return;

    let active = true;

    async function poll(): Promise<void> {
      try {
        await loadBatchJob(batchJobId, {
          setStatus: setBatchJobStatus,
          setProcessedCount: setBatchProcessedCount,
          setTotalCount: setBatchTotalCount,
          setSuccessCount: setBatchSuccessCount,
          setFailureCount: setBatchFailureCount,
          setDegradedCount: setBatchDegradedCount,
          setUsableCount: setBatchUsableCount,
          setEmptyOutputCount: setBatchEmptyOutputCount,
          setPartialOutputCount: setBatchPartialOutputCount,
          setEtaMs: setBatchEtaMs,
          setResults: setBatchResults,
          setRunMessage: setBatchRunMessage,
          selectedFormat: batchFormat,
          pagePath: '/batch',
        });
      } catch (error) {
        if (!active) return;
        setBatchRunMessage(error instanceof Error ? error.message : 'Failed to refresh batch job status.');
      }
    }

    void poll();
    const interval = setInterval(() => {
      if (!active) return;
      if (batchJobStatus === 'completed' || batchJobStatus === 'failed' || batchJobStatus === 'cancelled') return;
      void poll();
    }, 2200);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [batchFormat, batchJobId, batchJobStatus]);

  useEffect(() => {
    if (!documentJobId) return;

    let active = true;

    async function poll(): Promise<void> {
      try {
        await loadBatchJob(documentJobId, {
          setStatus: setDocumentJobStatus,
          setProcessedCount: setDocumentProcessedCount,
          setTotalCount: setDocumentTotalCount,
          setSuccessCount: setDocumentSuccessCount,
          setFailureCount: setDocumentFailureCount,
          setDegradedCount: setDocumentDegradedCount,
          setUsableCount: setDocumentUsableCount,
          setEmptyOutputCount: setDocumentEmptyOutputCount,
          setPartialOutputCount: setDocumentPartialOutputCount,
          setEtaMs: setDocumentEtaMs,
          setResults: setDocumentResults,
          setRunMessage: setDocumentRunMessage,
          selectedFormat: documentFormat,
          pagePath: '/batch',
        });
      } catch (error) {
        if (!active) return;
        setDocumentRunMessage(error instanceof Error ? error.message : 'Failed to refresh document batch status.');
      }
    }

    void poll();
    const interval = setInterval(() => {
      if (!active) return;
      if (documentJobStatus === 'completed' || documentJobStatus === 'failed' || documentJobStatus === 'cancelled') return;
      void poll();
    }, 2200);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [documentFormat, documentJobId, documentJobStatus]);

  async function downloadBlobResponse(response: Response, fallbackName: string): Promise<void> {
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const blob = await response.blob();
    const filename = filenameFromContentDisposition(response.headers.get('content-disposition'), fallbackName);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  async function downloadBatchItem(
    row: BatchItemResult,
    allowFallback = true,
    requestedFormat: ExportFormat = batchFormat,
  ): Promise<void> {
    if (row.status !== 'success') return;

    if (!row.extractionId && row.sourceUrl) {
      const response = await fetch('/api/direct-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          url: row.sourceUrl,
          format: requestedFormat,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        if (allowFallback && requestedFormat !== 'pdf') {
          setBatchFormat('pdf');
          setBatchRunMessage(
            `Format ${requestedFormat.toUpperCase()} unavailable for one direct file. Falling back to original download.`,
          );
          await downloadBatchItem(row, false, 'pdf');
          return;
        }
        throw new Error(message || `Direct file download failed (${requestedFormat}).`);
      }

      await downloadBlobResponse(
        response,
        `${(row.title || 'Oleriq-direct-file').replace(/\s+/g, '-').toLowerCase()}.${requestedFormat}`,
      );

      if (response.headers.get(FALLBACK_FORMAT_HEADER) === 'original' && requestedFormat !== 'pdf') {
        setBatchRunMessage('Downloaded original file for one item because conversion was unavailable.');
      }
      return;
    }

    const response = await fetch('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildHeaders(),
      },
      body: JSON.stringify({
        format: requestedFormat,
        images: imagesRef.current,
        extractionId: row.extractionId,
        sourceUrl: row.sourceUrl || row.url,
        settings: DEFAULT_SETTINGS,
      }),
    });

    await downloadBlobResponse(
      response,
      `${(row.title || 'Oleriq-batch').replace(/\s+/g, '-').toLowerCase()}.${requestedFormat}`,
    );
  }

  async function downloadDocumentBatchItem(row: BatchItemResult): Promise<void> {
    if (row.status !== 'success' || !row.outputObjectKey || !row.id || !documentJobId) return;

    const response = await fetch(
      `/api/batch-jobs/download?jobId=${encodeURIComponent(documentJobId)}&itemId=${row.id}`,
      {
        headers: buildHeaders(),
      },
    );
    await downloadBlobResponse(response, row.outputFilename || `batch-document.${row.outputFormat || 'pdf'}`);
  }

  async function getAllBatchRows(jobId: string): Promise<BatchItemResult[]> {
    const output: BatchItemResult[] = [];
    const limit = 1000;
    let offset = 0;
    let guard = 0;

    while (guard < 500) {
      const response = await fetch(
        `/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=${limit}&offset=${offset}`,
        {
          headers: buildHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load batch rows (${response.status}).`);
      }

      const json = (await response.json()) as {
        success: boolean;
        job: BatchJobApi;
        items: BatchItemApi[];
      };

      if (!json.success) {
        throw new Error('Failed to load batch rows.');
      }

      const rows = (json.items || []).map(mapBatchItem);
      output.push(...rows);

      offset += rows.length;
      guard += 1;

      if (rows.length === 0 || offset >= Number(json.job.totalUrls || 0)) break;
    }

    return output;
  }

  async function getAllSuccessfulBatchRows(jobId: string): Promise<BatchItemResult[]> {
    const rows = await getAllBatchRows(jobId);
    return rows.filter((item) => item.status === 'success');
  }

  async function handleDownloadAllBatch(): Promise<void> {
    if (!batchJobId || batchDownloadingAll) return;

    setBatchDownloadingAll(true);
    try {
      const rows = await getAllSuccessfulBatchRows(batchJobId);
      for (const row of rows) {
        await downloadBatchItem(row);
        await new Promise((resolve) => setTimeout(resolve, 160));
      }
    } catch (error) {
      setBatchRunMessage(error instanceof Error ? error.message : 'Failed to download batch files.');
    } finally {
      setBatchDownloadingAll(false);
    }
  }

  async function handleDownloadAllDocuments(): Promise<void> {
    if (!documentJobId || documentDownloadingAll) return;

    setDocumentDownloadingAll(true);
    try {
      const rows = await getAllSuccessfulBatchRows(documentJobId);
      for (const row of rows.filter((item) => item.outputObjectKey)) {
        await downloadDocumentBatchItem(row);
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
    } catch (error) {
      setDocumentRunMessage(error instanceof Error ? error.message : 'Failed to download converted files.');
    } finally {
      setDocumentDownloadingAll(false);
    }
  }

  function uploadIdFromBatchRow(row: BatchItemResult): string | null {
    if (!row.url.startsWith('upload://')) return null;
    const uploadId = row.url.slice('upload://'.length).trim();
    return uploadId || null;
  }

  async function retryFailedUrlBatch(): Promise<void> {
    if (!batchJobId || batchRetryingFailed || batchProcessing) return;

    setBatchRetryingFailed(true);
    try {
      const rows = await getAllBatchRows(batchJobId);
      const failedUrls = Array.from(
        new Set(rows.filter((row) => row.status === 'failure').map((row) => row.url).filter(Boolean)),
      );

      if (failedUrls.length === 0) {
        setBatchRunMessage('No failed URLs are available to retry.');
        return;
      }

      void trackClientEvent({
        eventName: 'batch_extract_submit',
        eventGroup: 'extract',
        status: 'attempt',
        pagePath: '/batch',
        metadata: {
          count: failedUrls.length,
          format: batchFormat,
          images: imagesRef.current,
          inputMode: 'url',
          retryOriginJobId: batchJobId,
        },
      });

      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          inputMode: 'url',
          urls: failedUrls,
          format: batchFormat,
          images: imagesRef.current,
          settings: DEFAULT_SETTINGS,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        error?: string;
        job?: {
          jobId: string;
          totalUrls: number;
          status: BatchJobStatus;
          estimatedProcessingMs: number;
        };
      };

      if (!response.ok || !json.success || !json.job) {
        throw new Error(json.error || 'Retry batch creation failed.');
      }

      setBatchResults([]);
      setBatchJobId(json.job.jobId);
      setBatchJobStatus((json.job.status as BatchJobStatus) || 'queued');
      setBatchProcessedCount(0);
      setBatchTotalCount(Number(json.job.totalUrls || failedUrls.length));
      setBatchSuccessCount(0);
      setBatchFailureCount(0);
      setBatchDegradedCount(0);
      setBatchUsableCount(0);
      setBatchEmptyOutputCount(0);
      setBatchPartialOutputCount(0);
      setBatchEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setBatchRunMessage(`Retry job queued (${json.job.jobId.slice(0, 8)}) from ${failedUrls.length.toLocaleString()} failed URLs.`);
    } catch (error) {
      setBatchRunMessage(error instanceof Error ? error.message : 'Retry batch creation failed.');
    } finally {
      setBatchRetryingFailed(false);
    }
  }

  async function retryFailedDocumentBatch(): Promise<void> {
    if (!documentJobId || documentRetryingFailed || documentProcessing) return;

    setDocumentRetryingFailed(true);
    try {
      const rows = await getAllBatchRows(documentJobId);
      const failedFiles = Array.from(
        new Set(
          rows
            .filter((row) => row.status === 'failure')
            .map((row) => uploadIdFromBatchRow(row))
            .filter((uploadId): uploadId is string => Boolean(uploadId)),
        ),
      ).map((uploadId) => ({ uploadId }));

      if (failedFiles.length === 0) {
        setDocumentRunMessage('No failed files are available to retry.');
        return;
      }

      void trackClientEvent({
        eventName: 'batch_extract_submit',
        eventGroup: 'extract',
        status: 'attempt',
        pagePath: '/batch',
        metadata: {
          count: failedFiles.length,
          format: documentFormat,
          images: effectiveDocumentImageMode,
          inputMode: 'document',
          retryOriginJobId: documentJobId,
        },
      });

      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          inputMode: 'document',
          files: failedFiles,
          format: documentFormat,
          images: effectiveDocumentImageMode,
          settings: DEFAULT_SETTINGS,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        error?: string;
        job?: {
          jobId: string;
          totalUrls: number;
          status: BatchJobStatus;
          estimatedProcessingMs: number;
        };
      };

      if (!response.ok || !json.success || !json.job) {
        throw new Error(json.error || 'Retry document batch creation failed.');
      }

      setDocumentResults([]);
      setDocumentJobId(json.job.jobId);
      setDocumentJobStatus((json.job.status as BatchJobStatus) || 'queued');
      setDocumentProcessedCount(0);
      setDocumentTotalCount(Number(json.job.totalUrls || failedFiles.length));
      setDocumentSuccessCount(0);
      setDocumentFailureCount(0);
      setDocumentDegradedCount(0);
      setDocumentUsableCount(0);
      setDocumentEmptyOutputCount(0);
      setDocumentPartialOutputCount(0);
      setDocumentEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setDocumentRunMessage(`Retry job queued (${json.job.jobId.slice(0, 8)}) from ${failedFiles.length.toLocaleString()} failed files.`);
    } catch (error) {
      setDocumentRunMessage(error instanceof Error ? error.message : 'Retry document batch creation failed.');
    } finally {
      setDocumentRetryingFailed(false);
    }
  }

  async function handleBatchSubmit(): Promise<void> {
    const urls = parsedBatchUrls;

    if (urls.length === 0) {
      setBatchRunMessage('Add at least one valid HTTP/HTTPS URL to start a batch.');
      return;
    }

    if (urls.length > BATCH_MAX_URLS) {
      setBatchRunMessage(`Batch limit exceeded. Max allowed is ${BATCH_MAX_URLS.toLocaleString()} URLs.`);
      return;
    }

    setBatchRunMessage('Submitting batch job...');
    setBatchResults([]);
    setBatchProcessedCount(0);
    setBatchTotalCount(urls.length);
    setBatchSuccessCount(0);
    setBatchFailureCount(0);
    setBatchDegradedCount(0);
    setBatchUsableCount(0);
    setBatchEmptyOutputCount(0);
    setBatchPartialOutputCount(0);
    setBatchEtaMs(urls.length * BATCH_ESTIMATED_MS_PER_URL);
    setBatchJobStatus('queued');

    void trackClientEvent({
      eventName: 'batch_extract_submit',
      eventGroup: 'extract',
      status: 'attempt',
      pagePath: '/batch',
      metadata: {
        count: urls.length,
        format: batchFormat,
        images: imagesRef.current,
        inputMode: 'url',
      },
    });

    try {
      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          inputMode: 'url',
          urls,
          format: batchFormat,
          images: imagesRef.current,
          settings: DEFAULT_SETTINGS,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        error?: string;
        job?: {
          jobId: string;
          totalUrls: number;
          status: BatchJobStatus;
          estimatedProcessingMs: number;
        };
      };

      if (!response.ok || !json.success || !json.job) {
        throw new Error(json.error || 'Batch job creation failed.');
      }

      setBatchJobId(json.job.jobId);
      setBatchJobStatus((json.job.status as BatchJobStatus) || 'queued');
      setBatchTotalCount(Number(json.job.totalUrls || urls.length));
      setBatchEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setBatchRunMessage(`Job queued (${json.job.jobId.slice(0, 8)}). Processing has started.`);
    } catch (error) {
      setBatchRunMessage(error instanceof Error ? error.message : 'Batch job creation failed.');
      setBatchJobStatus('failed');
    }
  }

  async function uploadSingleDocument(entry: DocumentUploadEntry): Promise<void> {
    setDocumentUploads((current) =>
      current.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              status: 'uploading',
              progress: 0,
              error: undefined,
            }
          : item,
      ),
    );

    try {
      let uploadRef: UploadedDocumentRef;

      if (uploadConfig.mode === 'blob') {
        const pathname = `${sanitizePathSegment(sessionIdRef.current || 'anonymous')}/${Date.now()}-${sanitizePathSegment(entry.name)}`;
        const blob = await upload(pathname, entry.file, {
          access: 'private',
          handleUploadUrl: '/api/batch-upload-token',
          multipart: entry.file.size > 5 * 1024 * 1024,
          contentType: entry.contentType || 'application/octet-stream',
          clientPayload: JSON.stringify({
            sessionId: sessionIdRef.current || null,
            filename: entry.name,
            contentType: entry.contentType || 'application/octet-stream',
            byteSize: entry.size,
          }),
          headers: buildHeaders() as Record<string, string>,
          onUploadProgress: ({ percentage }) => {
            setDocumentUploads((current) =>
              current.map((item) =>
                item.id === entry.id
                  ? {
                      ...item,
                      progress: percentage,
                    }
                  : item,
              ),
            );
          },
        });

        const completedResponse = await fetch('/api/batch-upload-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildHeaders(),
          },
          body: JSON.stringify({
            mode: 'blob',
            pathname: blob.pathname,
            filename: entry.name,
          }),
        });

        const completedJson = (await completedResponse.json()) as {
          success: boolean;
          error?: string;
          file?: UploadedDocumentRef;
        };

        if (!completedResponse.ok || !completedJson.success || !completedJson.file) {
          throw new Error(completedJson.error || 'Failed to finalize blob upload.');
        }

        uploadRef = completedJson.file;
      } else {
        const uploadResponse = await fetch(
          `/api/batch-upload-local?sessionId=${encodeURIComponent(sessionIdRef.current)}&filename=${encodeURIComponent(entry.name)}&contentType=${encodeURIComponent(entry.contentType || 'application/octet-stream')}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': entry.contentType || 'application/octet-stream',
            },
            body: entry.file,
          },
        );

        const uploadJson = (await uploadResponse.json()) as {
          success: boolean;
          error?: string;
          file?: {
            objectKey: string;
            objectUrl: string | null;
            downloadUrl: string | null;
            contentType: string;
            byteSize: number;
            originalFilename: string;
          };
        };

        if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file) {
          throw new Error(uploadJson.error || 'Failed to upload file.');
        }

        const completedResponse = await fetch('/api/batch-upload-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...buildHeaders(),
          },
          body: JSON.stringify({
            mode: 'filesystem',
            objectKey: uploadJson.file.objectKey,
            objectUrl: uploadJson.file.objectUrl,
            downloadUrl: uploadJson.file.downloadUrl,
            filename: uploadJson.file.originalFilename,
            contentType: uploadJson.file.contentType,
            byteSize: uploadJson.file.byteSize,
          }),
        });

        const completedJson = (await completedResponse.json()) as {
          success: boolean;
          error?: string;
          file?: UploadedDocumentRef;
        };

        if (!completedResponse.ok || !completedJson.success || !completedJson.file) {
          throw new Error(completedJson.error || 'Failed to finalize uploaded file.');
        }

        uploadRef = completedJson.file;
      }

      setDocumentUploads((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                status: 'uploaded',
                progress: 100,
                uploadRef,
              }
            : item,
        ),
      );
    } catch (error) {
      setDocumentUploads((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Failed to upload file.',
              }
            : item,
        ),
      );
    }
  }

  async function handleSelectDocumentFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;

    const currentCount = documentUploads.length;
    const currentBytes = documentUploads.reduce((sum, item) => sum + item.size, 0);
    if (currentCount + files.length > uploadConfig.limits.maxFiles) {
      setDocumentRunMessage(`Document limit exceeded. Max allowed is ${uploadConfig.limits.maxFiles.toLocaleString()} files.`);
      return;
    }

    const nextBytes = currentBytes + files.reduce((sum, file) => sum + file.size, 0);
    if (nextBytes > uploadConfig.limits.maxBatchBytes) {
      setDocumentRunMessage(
        `Document selection exceeds the total technical limit of ${formatBytes(uploadConfig.limits.maxBatchBytes)}.`,
      );
      return;
    }

    const entries = files.map<DocumentUploadEntry>((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
      status: 'queued',
      progress: 0,
    }));

    setDocumentRunMessage('');
    setDocumentUploads((current) => [...current, ...entries]);
    setDocumentUploading(true);

    try {
      for (const entry of entries) {
        if (entry.size > uploadConfig.limits.maxFileBytes) {
          setDocumentUploads((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    status: 'failed',
                    error: `File exceeds the per-file limit of ${formatBytes(uploadConfig.limits.maxFileBytes)}.`,
                  }
                : item,
            ),
          );
          continue;
        }

        await uploadSingleDocument(entry);
      }
    } finally {
      setDocumentUploading(false);
    }
  }

  function removeDocumentUpload(id: string): void {
    setDocumentUploads((current) => current.filter((item) => item.id !== id));
  }

  async function handleDocumentBatchSubmit(): Promise<void> {
    const uploadedFiles = documentUploads
      .filter((item) => item.status === 'uploaded' && item.uploadRef)
      .map((item) => ({ uploadId: item.uploadRef!.uploadId }));

    if (uploadedFiles.length === 0) {
      setDocumentRunMessage('Upload at least one supported file before starting a document batch.');
      return;
    }

    setDocumentResults([]);
    setDocumentProcessedCount(0);
    setDocumentTotalCount(uploadedFiles.length);
    setDocumentSuccessCount(0);
    setDocumentFailureCount(0);
    setDocumentDegradedCount(0);
    setDocumentUsableCount(0);
    setDocumentEmptyOutputCount(0);
    setDocumentPartialOutputCount(0);
    setDocumentEtaMs(uploadedFiles.length * BATCH_ESTIMATED_MS_PER_URL);
    setDocumentJobStatus('queued');
    setDocumentRunMessage('Submitting document batch...');

    void trackClientEvent({
      eventName: 'batch_extract_submit',
      eventGroup: 'extract',
      status: 'attempt',
      pagePath: '/batch',
      metadata: {
        count: uploadedFiles.length,
        format: documentFormat,
        images: effectiveDocumentImageMode,
        inputMode: 'document',
      },
    });

    try {
      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          inputMode: 'document',
          files: uploadedFiles,
          format: documentFormat,
          images: effectiveDocumentImageMode,
          settings: DEFAULT_SETTINGS,
        }),
      });

      const json = (await response.json()) as {
        success: boolean;
        error?: string;
        job?: {
          jobId: string;
          totalUrls: number;
          status: BatchJobStatus;
          estimatedProcessingMs: number;
        };
      };

      if (!response.ok || !json.success || !json.job) {
        throw new Error(json.error || 'Document batch creation failed.');
      }

      setDocumentJobId(json.job.jobId);
      setDocumentJobStatus((json.job.status as BatchJobStatus) || 'queued');
      setDocumentTotalCount(Number(json.job.totalUrls || uploadedFiles.length));
      setDocumentEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setDocumentRunMessage(`Job queued (${json.job.jobId.slice(0, 8)}). Conversion has started.`);
    } catch (error) {
      setDocumentRunMessage(error instanceof Error ? error.message : 'Document batch creation failed.');
      setDocumentJobStatus('failed');
    }
  }

  return (
    <main className="cp-shell cp-enter flex min-h-screen items-start justify-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <h1 className="logo-mark text-6xl font-semibold text-[var(--color-ink)]">Batch convert URLs and documents</h1>
          <p className="mx-auto mt-2 max-w-2xl text-lg text-[var(--color-muted)]">
            Convert many links or files into clean, readable Markdown, TXT, DOCX, or PDF.
          </p>
        </div>

        <div>
          {mode === 'url' ? (
            <BatchUrlPanel
              mode={mode}
              onModeChange={setMode}
              urlsInput={batchUrlsInput}
              onUrlsInputChange={setBatchUrlsInput}
              onSubmit={() => void handleBatchSubmit()}
              format={batchFormat}
              onFormatChange={setBatchFormat}
              processing={batchProcessing}
              downloadingAll={batchDownloadingAll}
              jobId={batchJobId}
              parsedCount={parsedBatchUrls.length}
              maxUrls={BATCH_MAX_URLS}
              processedCount={batchProcessedCount}
              totalCount={batchTotalCount}
              successCount={batchSuccessCount}
              failureCount={batchFailureCount}
              degradedCount={batchDegradedCount}
              usableCount={batchUsableCount}
              emptyOutputCount={batchEmptyOutputCount}
              partialOutputCount={batchPartialOutputCount}
              etaText={formatDuration(batchEtaMs)}
              runMessage={batchRunMessage}
              results={batchResults}
              onDownloadOne={(row) =>
                void downloadBatchItem(row).catch((error) =>
                  setBatchRunMessage(
                    error instanceof Error ? error.message : 'Failed to download selected file.',
                  ),
                )
              }
              onDownloadAll={() => void handleDownloadAllBatch()}
              onRetryFailed={() => void retryFailedUrlBatch()}
              retryingFailed={batchRetryingFailed}
            />
          ) : (
            <BatchDocumentPanel
              mode={mode}
              onModeChange={setMode}
              accept={uploadConfig.accept}
              files={documentUploads}
              format={documentFormat}
              onFormatChange={setDocumentFormat}
              imageMode={documentImageMode}
              onImageModeChange={setDocumentImageMode}
              showMixedImageSupportNote={selectedDocumentHasMixedImageSupport}
              onSelectFiles={(files) => void handleSelectDocumentFiles(files)}
              onRemoveFile={removeDocumentUpload}
              onSubmit={() => void handleDocumentBatchSubmit()}
              processing={documentProcessing}
              uploading={documentUploading}
              downloadingAll={documentDownloadingAll}
              jobId={documentJobId}
              processedCount={documentProcessedCount}
              totalCount={documentTotalCount}
              successCount={documentSuccessCount}
              failureCount={documentFailureCount}
              degradedCount={documentDegradedCount}
              usableCount={documentUsableCount}
              partialOutputCount={documentPartialOutputCount}
              etaText={formatDuration(documentEtaMs)}
              runMessage={documentRunMessage}
              maxFiles={uploadConfig.limits.maxFiles}
              maxFileBytes={uploadConfig.limits.maxFileBytes}
              maxBatchBytes={uploadConfig.limits.maxBatchBytes}
              results={documentResults}
              onDownloadOne={(row) =>
                void downloadDocumentBatchItem(row).catch((error) =>
                  setDocumentRunMessage(
                    error instanceof Error ? error.message : 'Failed to download selected file.',
                  ),
                )
              }
              onDownloadAll={() => void handleDownloadAllDocuments()}
              onRetryFailed={() => void retryFailedDocumentBatch()}
              retryingFailed={documentRetryingFailed}
            />
          )}
        </div>

        <BatchBelowFoldContent />
      </div>
    </main>
  );
}
