'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AuthenticatedSessionManager } from '@/components/AuthenticatedSessionManager';
import { BatchUrlPanel } from '@/components/BatchUrlPanel';
import type { BatchItemResult } from '@/components/batchTypes';
import { FailureModal } from '@/components/FailureModal';
import { ReadingPreview } from '@/components/ReadingPreview';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { getClientSessionId, trackClientEvent } from '@/lib/clientAnalytics';
import {
  AUTH_SESSION_HEADER,
  BATCH_HEADER,
  FALLBACK_FORMAT_HEADER,
  SESSION_HEADER,
} from '@/lib/internalIdentifiers';
import { useAuthenticatedSessions } from '@/lib/useAuthenticatedSessions';
import type {
  BatchDiagnosticReason,
  ExportFormat,
  ExtractErrorCode,
  ExtractionPath,
  ExtractSuccessResponse,
  ImageMode,
  PageComplexitySignal,
  ReaderSettings,
} from '@/lib/types';

type ProtectedMode = 'single' | 'batch';
type BatchJobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type FailureState = {
  errorCode: ExtractErrorCode;
  url: string;
  attemptedExtractionPath?: ExtractionPath;
  browserAttempted?: boolean;
  pageComplexitySignal?: PageComplexitySignal;
};

type ExtractFailurePayload = {
  success: false;
  errorCode?: string;
  errorMessage?: string;
  attemptedExtractionPath?: ExtractionPath;
  browserAttempted?: boolean;
  pageComplexitySignal?: PageComplexitySignal;
};

type BatchJobApi = {
  id: string;
  status: Exclude<BatchJobStatus, 'idle'>;
  phase: 'queued' | 'classifying' | 'converting' | 'assembling' | 'review' | 'failed';
  inputMode: 'url' | 'document';
  totalUrls: number;
  processedUrls: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  usableCount: number;
  emptyOutputCount: number;
  partialOutputCount: number;
  averageDurationMs: number | null;
  laneSummary: {
    fast_text: number;
    deep_layout: number;
    ocr_layout: number;
    structured_text: number;
  };
  itemsInProgress: number;
  throughputPerMinute: number;
  retryCount: number;
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
  processingLane: 'fast_text' | 'deep_layout' | 'ocr_layout' | 'structured_text' | null;
  confidenceScore: number | null;
  escalated: boolean;
  pageCount: number | null;
  attemptCount: number;
  outputObjectKey: string | null;
  outputFilename: string | null;
  outputFormat: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

function initialThemeFromSystem(): ReaderSettings['colorTheme'] {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontFace: 'serif',
  fontSize: 16,
  lineSpacing: 1.6,
  colorTheme: 'light',
};

const PROGRESS_STAGES = ['Checking access', 'Reading page', 'Building document'] as const;
const BATCH_MAX_URLS = 50_000;
const BATCH_ESTIMATED_MS_PER_URL = 9_000;

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

function parseIsoMs(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
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
    processingLane: item.processingLane || undefined,
    confidenceScore:
      item.confidenceScore === null || item.confidenceScore === undefined ? undefined : Number(item.confidenceScore),
    escalated: item.escalated || undefined,
    pageCount: item.pageCount === null || item.pageCount === undefined ? undefined : Number(item.pageCount),
    attemptCount: Number(item.attemptCount || 0) || undefined,
    outputObjectKey: item.outputObjectKey || undefined,
    outputFilename: item.outputFilename || undefined,
    outputFormat: item.outputFormat || undefined,
    errorCode: item.errorCode || undefined,
    errorMessage: item.errorMessage || undefined,
  };
}

export function PagesBehindLoginWorkspace() {
  const [mode, setMode] = useState<ProtectedMode>('single');
  const [clientSessionId, setClientSessionId] = useState('');
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [images, setImages] = useState<ImageMode>('on');
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<ExtractSuccessResponse | null>(null);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [exporting, setExporting] = useState<Partial<Record<ExportFormat, boolean>>>({});
  const [singleRunMessage, setSingleRunMessage] = useState('');
  const [progressStageIndex, setProgressStageIndex] = useState(0);

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

  const sessionIdRef = useRef<string>('');
  const authSessions = useAuthenticatedSessions(clientSessionId);
  const parsedBatchUrls = useMemo(() => parseBatchUrls(batchUrlsInput), [batchUrlsInput]);
  const batchProcessing = batchJobStatus === 'queued' || batchJobStatus === 'running';

  useEffect(() => {
    setSettings((current) => ({ ...current, colorTheme: initialThemeFromSystem() }));

    sessionIdRef.current = getClientSessionId();
    setClientSessionId(sessionIdRef.current);
    void trackClientEvent({
      eventName: 'page_view',
      eventGroup: 'navigation',
      status: 'success',
      pagePath: '/pages-behind-login',
      metadata: {
        href: window.location.href,
      },
    });
  }, []);

  useEffect(() => {
    if (!extracting) {
      setProgressStageIndex(0);
      return;
    }

    setProgressStageIndex(0);
    const intervalId = window.setInterval(() => {
      setProgressStageIndex((current) => (current + 1) % PROGRESS_STAGES.length);
    }, 1100);

    return () => window.clearInterval(intervalId);
  }, [extracting]);

  useEffect(() => {
    if (!batchJobId) return;

    let active = true;

    async function poll(): Promise<void> {
      try {
        await loadBatchJob(batchJobId);
      } catch (error) {
        if (!active) return;
        setBatchRunMessage(error instanceof Error ? error.message : 'Failed to refresh protected batch status.');
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

  const transformedContent = useMemo(() => {
    if (!result) return '';
    return result.contentVariants[images] || result.content;
  }, [images, result]);

  function buildHeaders(options?: { json?: boolean; batch?: boolean }): HeadersInit {
    return {
      ...(options?.json ? { 'Content-Type': 'application/json' } : {}),
      ...(sessionIdRef.current ? { [SESSION_HEADER]: sessionIdRef.current } : {}),
      ...(authSessions.selectedSessionId ? { [AUTH_SESSION_HEADER]: authSessions.selectedSessionId } : {}),
      ...(options?.batch ? { [BATCH_HEADER]: '1' } : {}),
    };
  }

  function ensureSelectedSession(target: 'single' | 'batch'): boolean {
    if (authSessions.selectedSessionId) return true;

    if (target === 'single') {
      setSingleRunMessage('Import a saved browser session file before you try a page behind login.');
    } else {
      setBatchRunMessage('Import a saved browser session file before you start a protected batch run.');
    }
    return false;
  }

  async function readErrorMessage(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw) return 'Download failed.';
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('text/html') || /^\s*<!doctype html/i.test(raw) || /^\s*<html/i.test(raw)) {
      if (response.status >= 500) {
        return 'Server error while preparing this file. Retry.';
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

  async function handleExtract(): Promise<void> {
    if (!ensureSelectedSession('single')) return;

    const targetUrl = url.trim();
    if (!targetUrl) {
      setSingleRunMessage('Paste a full page URL first.');
      return;
    }

    void trackClientEvent({
      eventName: 'extract_submit',
      eventGroup: 'extract',
      status: 'attempt',
      pagePath: '/pages-behind-login',
      attemptedUrl: targetUrl,
      metadata: {
        images,
        accessMode: 'protected',
      },
    });

    setExtracting(true);
    setFailure(null);
    setSingleRunMessage('');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: buildHeaders({ json: true }),
        body: JSON.stringify({ url: targetUrl, images }),
      });

      const json = (await response.json()) as ExtractSuccessResponse | ExtractFailurePayload;

      if (!response.ok || !json.success) {
        const errorCode = ((json as ExtractFailurePayload).errorCode || 'EXTRACTION_FAILED') as ExtractErrorCode;
        if (errorCode === 'DIRECT_FILE_URL') {
          setSingleRunMessage('This tool is for pages behind login, not direct file links.');
          setResult(null);
          return;
        }

        setFailure({
          errorCode,
          url: targetUrl,
          attemptedExtractionPath: (json as ExtractFailurePayload).attemptedExtractionPath,
          browserAttempted: (json as ExtractFailurePayload).browserAttempted,
          pageComplexitySignal: (json as ExtractFailurePayload).pageComplexitySignal,
        });
        setResult(null);
        return;
      }

      setResult(json);
      setSingleRunMessage('');
    } catch (error) {
      console.error(error);
      setFailure({ errorCode: 'EXTRACTION_FAILED', url: targetUrl });
      setResult(null);
    } finally {
      setExtracting(false);
    }
  }

  async function handleExport(format: ExportFormat): Promise<void> {
    if (!result) return;

    setExporting((current) => ({ ...current, [format]: true }));

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: buildHeaders({ json: true }),
        body: JSON.stringify({
          format,
          images,
          extractionId: result.extractionId,
          sourceUrl: result.sourceUrl,
          settings,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || `Export failed (${format}).`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename=\"?([^\"]+)\"?/i);
      const filename = match?.[1] || `Oleriq-export.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error(error);
    } finally {
      setExporting((current) => ({ ...current, [format]: false }));
    }
  }

  function handleSettingsChange(next: ReaderSettings): void {
    setSettings(next);
  }

  function resetSingleState(): void {
    setResult(null);
    setFailure(null);
    setSingleRunMessage('');
    setUrl('');
    setImages('on');
    setSettings((current) => ({ ...DEFAULT_SETTINGS, colorTheme: current.colorTheme }));
  }

  async function loadBatchJob(jobId: string): Promise<BatchJobApi> {
    const response = await fetch(
      `/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=400&offset=0`,
      {
        headers: buildHeaders(),
      },
    );

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || `Protected batch lookup failed (${response.status}).`);
    }

    const json = (await response.json()) as {
      success: boolean;
      job: BatchJobApi;
      estimatedRemainingMs: number;
      items: BatchItemApi[];
    };

    if (!json.success || !json.job) {
      throw new Error('Protected batch payload was not successful.');
    }

    setBatchJobStatus(json.job.status);
    setBatchProcessedCount(Number(json.job.processedUrls || 0));
    setBatchTotalCount(Number(json.job.totalUrls || 0));
    setBatchSuccessCount(Number(json.job.successCount || 0));
    setBatchFailureCount(Number(json.job.failureCount || 0));
    setBatchDegradedCount(Number(json.job.degradedCount || 0));
    setBatchUsableCount(Number(json.job.usableCount || 0));
    setBatchEmptyOutputCount(Number(json.job.emptyOutputCount || 0));
    setBatchPartialOutputCount(Number(json.job.partialOutputCount || 0));
    setBatchEtaMs(Math.max(0, Number(json.estimatedRemainingMs || 0)));
    setBatchResults((json.items || []).map(mapBatchItem));

    const startedAtMs = parseIsoMs(json.job.startedAt);
    const completedAtMs = parseIsoMs(json.job.completedAt);

    if (json.job.status === 'completed') {
      const durationMs =
        startedAtMs > 0 && completedAtMs > startedAtMs
          ? completedAtMs - startedAtMs
          : Number(json.job.averageDurationMs || 0) * Number(json.job.processedUrls || 0);

      setBatchRunMessage(
        `Completed in ${formatDuration(durationMs)}. ${Number(json.job.usableCount || 0).toLocaleString()} usable, ${Number(json.job.partialOutputCount || 0).toLocaleString()} partial, ${Number(json.job.degradedCount || 0).toLocaleString()} degraded, ${Number(json.job.failureCount || 0).toLocaleString()} failed.`,
      );
    } else if (json.job.status === 'running' || json.job.status === 'queued') {
      setBatchRunMessage(
        `Processed ${Number(json.job.processedUrls || 0).toLocaleString()} of ${Number(json.job.totalUrls || 0).toLocaleString()} (${json.job.phase}). ${Number(json.job.itemsInProgress || 0).toLocaleString()} in progress at ${Number(json.job.throughputPerMinute || 0).toLocaleString()} items/min.`,
      );
    } else if (json.job.status === 'failed') {
      setBatchRunMessage('Protected batch job failed before completion.');
    }

    return json.job;
  }

  async function downloadBlobResponse(response: Response, fallbackName: string): Promise<void> {
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const match = contentDisposition.match(/filename=\"?([^\"]+)\"?/i);
    const filename = match?.[1] || fallbackName;
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
        headers: buildHeaders({ json: true }),
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
      headers: buildHeaders({ json: true }),
      body: JSON.stringify({
        format: requestedFormat,
        images: 'off',
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
        throw new Error(`Failed to load protected batch rows (${response.status}).`);
      }

      const json = (await response.json()) as {
        success: boolean;
        job: BatchJobApi;
        items: BatchItemApi[];
      };

      if (!json.success) {
        throw new Error('Failed to load protected batch rows.');
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
      setBatchRunMessage(error instanceof Error ? error.message : 'Failed to download protected batch files.');
    } finally {
      setBatchDownloadingAll(false);
    }
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

      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: buildHeaders({ json: true, batch: true }),
        body: JSON.stringify({
          inputMode: 'url',
          urls: failedUrls,
          format: batchFormat,
          images: 'off',
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
      setBatchRunMessage(
        `Retry job queued (${json.job.jobId.slice(0, 8)}) from ${failedUrls.length.toLocaleString()} failed URLs.`,
      );
    } catch (error) {
      setBatchRunMessage(error instanceof Error ? error.message : 'Retry batch creation failed.');
    } finally {
      setBatchRetryingFailed(false);
    }
  }

  async function handleBatchSubmit(): Promise<void> {
    if (!ensureSelectedSession('batch')) return;

    const urls = parsedBatchUrls;
    if (urls.length === 0) {
      setBatchRunMessage('Add at least one valid HTTP/HTTPS URL to start a protected batch.');
      return;
    }

    if (urls.length > BATCH_MAX_URLS) {
      setBatchRunMessage(`Batch limit exceeded. Max allowed is ${BATCH_MAX_URLS.toLocaleString()} URLs.`);
      return;
    }

    setBatchRunMessage('Submitting protected batch job...');
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

    try {
      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: buildHeaders({ json: true, batch: true }),
        body: JSON.stringify({
          inputMode: 'url',
          urls,
          format: batchFormat,
          images: 'off',
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
        throw new Error(json.error || 'Protected batch creation failed.');
      }

      setBatchJobId(json.job.jobId);
      setBatchJobStatus((json.job.status as BatchJobStatus) || 'queued');
      setBatchTotalCount(Number(json.job.totalUrls || urls.length));
      setBatchEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setBatchRunMessage(`Job queued (${json.job.jobId.slice(0, 8)}). Processing has started.`);
    } catch (error) {
      setBatchRunMessage(error instanceof Error ? error.message : 'Protected batch creation failed.');
      setBatchJobStatus('failed');
    }
  }

  if (result) {
    return (
      <>
        <div
          className={`cp-shell cp-enter theme-${settings.colorTheme} flex min-h-screen flex-col md:h-screen md:flex-row`}
        >
          <SettingsSidebar
            title={result.title}
            byline={result.byline}
            siteName={result.siteName}
            publishedTime={result.publishedTime}
            wordCount={result.wordCount}
            imageCount={result.imageCount}
            exportDiagnosticReasonsByFormat={result.exportDiagnosticReasonsByFormat}
            resultState={result.resultState}
            extractionPath={result.extractionPath}
            browserAttempted={result.browserAttempted}
            pageComplexitySignal={result.pageComplexitySignal}
            diagnosticReasons={result.diagnosticReasons}
            warnings={result.warnings}
            images={images}
            onImagesChange={setImages}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onExport={(format) => void handleExport(format)}
            exporting={exporting}
            onNewUrl={resetSingleState}
          />

          <main className="flex-1 overflow-hidden pb-20 md:h-screen md:pb-0">
            <ReadingPreview content={transformedContent} settings={settings} />
          </main>
        </div>

        {failure ? (
          <FailureModal
            open={true}
            errorCode={failure.errorCode}
            failedUrl={failure.url}
            attemptedExtractionPath={failure.attemptedExtractionPath}
            browserAttempted={failure.browserAttempted}
            pageComplexitySignal={failure.pageComplexitySignal}
            sessionId={sessionIdRef.current}
            onClose={() => setFailure(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <main className="cp-shell cp-enter min-h-screen px-6 py-10">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Standalone tool
            </p>
            <h1 className="logo-mark mt-3 text-6xl font-semibold text-[var(--color-ink)]">Pages behind login</h1>
            <p className="mx-auto mt-4 max-w-[46ch] text-lg text-[var(--color-muted)]">
              Use this only for pages you can already open in your own browser after signing in.
            </p>
          </div>

          <section
            data-protected-pages-surface="true"
            className="mt-8 rounded-[2rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
          >
            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink)]">
                <p className="font-semibold">Before you use this</p>
                <ul className="mt-2 space-y-1 text-[var(--color-muted)]">
                  <li>1. Only use it for pages you already have access to.</li>
                  <li>2. It uses a saved session file from your own browser, not your password.</li>
                  <li>3. Do not upload a session file unless you understand that it can carry account access.</li>
                </ul>
              </div>

              <AuthenticatedSessionManager
                sessions={authSessions.sessions}
                selectedSessionId={authSessions.selectedSessionId}
                labelDraft={authSessions.labelDraft}
                loading={authSessions.loading}
                importing={authSessions.importing}
                deletingSessionId={authSessions.deletingSessionId}
                errorMessage={authSessions.errorMessage}
                onLabelDraftChange={authSessions.setLabelDraft}
                onSelectSession={authSessions.setSelectedSessionId}
                onImportFile={authSessions.importSessionFile}
                onClearSelection={authSessions.clearSelection}
                onDeleteSession={authSessions.deleteSession}
              />

              <div className="flex justify-center">
                <div
                  role="group"
                  aria-label="Pages behind login mode switch"
                  className="flex flex-wrap gap-2 rounded-full border border-[var(--color-border)] bg-white p-1"
                >
                  {([
                    ['single', 'Single page'],
                    ['batch', 'Batch URLs'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                      className={`h-11 rounded-full px-5 text-sm font-semibold transition ${
                        mode === value
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-ink)] hover:text-[var(--color-accent)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'single' ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <label htmlFor="protected-url-input" className="sr-only">
                      Page URL behind login
                    </label>
                    <input
                      id="protected-url-input"
                      type="url"
                      inputMode="url"
                      placeholder="https://example.com/account-only-page"
                      autoComplete="off"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleExtract();
                        }
                      }}
                      className="h-16 w-full rounded-xl border border-[var(--color-border)] bg-white px-5 text-lg outline-none transition focus:border-[var(--color-accent)]"
                    />

                    <button
                      type="button"
                      onClick={() => void handleExtract()}
                      disabled={extracting || !authSessions.selectedSessionId}
                      className="h-16 min-w-48 rounded-xl bg-[var(--color-accent)] px-8 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {extracting ? 'Converting...' : 'Convert page'}
                    </button>
                  </div>

                  <p className="min-h-5 text-sm text-[var(--color-muted)]">
                    {extracting ? 'Opening the page with your saved session...' : singleRunMessage}
                  </p>

                  {extracting ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white/90 p-4 text-left">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-[var(--color-ink)]">Conversion progress</span>
                        <span className="text-[var(--color-muted)]">{PROGRESS_STAGES[progressStageIndex]}</span>
                      </div>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface)]"
                        role="progressbar"
                        aria-valuetext={PROGRESS_STAGES[progressStageIndex]}
                        aria-busy="true"
                      >
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700 ease-out"
                          style={{ width: `${((progressStageIndex + 1) / PROGRESS_STAGES.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <BatchUrlPanel
                  mode="url"
                  onModeChange={() => undefined}
                  showModeSwitch={false}
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
                      setBatchRunMessage(error instanceof Error ? error.message : 'Failed to download selected file.'),
                    )
                  }
                  onDownloadAll={() => void handleDownloadAllBatch()}
                  onRetryFailed={() => void retryFailedUrlBatch()}
                  retryingFailed={batchRetryingFailed}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      {failure ? (
        <FailureModal
          open={true}
          errorCode={failure.errorCode}
          failedUrl={failure.url}
          attemptedExtractionPath={failure.attemptedExtractionPath}
          browserAttempted={failure.browserAttempted}
          pageComplexitySignal={failure.pageComplexitySignal}
          sessionId={sessionIdRef.current}
          onSubmitted={() => undefined}
          onClose={() => setFailure(null)}
        />
      ) : null}
    </>
  );
}
