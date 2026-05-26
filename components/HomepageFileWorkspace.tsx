'use client';

import { upload } from '@vercel/blob/client';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BatchDocumentPanel, type DocumentUploadItem } from '@/components/BatchDocumentPanel';
import type { BatchItemResult } from '@/components/batchTypes';
import { getClientSessionId, trackClientEvent } from '@/lib/clientAnalytics';
import { DOCUMENT_SUPPORTED_COPY } from '@/lib/documentSupport';
import {
  DEFAULT_DOCUMENT_UPLOAD_CONFIG,
  createDocumentUploadConfigGate,
  type DocumentUploadConfig,
} from '@/lib/documentUploadConfig';
import { SESSION_HEADER } from '@/lib/internalIdentifiers';
import type { BatchDiagnosticReason, ExportFormat, ImageMode } from '@/lib/types';

type BatchJobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type BatchJobApi = {
  id: string;
  status: Exclude<BatchJobStatus, 'idle'>;
  phase: 'queued' | 'classifying' | 'converting' | 'assembling' | 'review' | 'failed';
  inputMode: 'document';
  totalUrls: number;
  processedUrls: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  usableCount: number;
  emptyOutputCount: number;
  partialOutputCount: number;
  averageDurationMs: number | null;
  itemsInProgress: number;
  throughputPerMinute: number;
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

type HomepageFileWorkspaceProps = {
  sessionId: string;
  openSignal: number;
};

const DOCUMENT_IMAGE_CAPABLE_EXTENSIONS = new Set(['.pdf', '.epub', '.html', '.htm', '.docx']);

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
  const match = contentDisposition.match(/filename=\"?([^\"]+)\"?/i);
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

export function HomepageFileWorkspace({ sessionId, openSignal }: HomepageFileWorkspaceProps) {
  const [uploadConfig, setUploadConfig] = useState<DocumentUploadConfig>(DEFAULT_DOCUMENT_UPLOAD_CONFIG);
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
  const [documentPartialOutputCount, setDocumentPartialOutputCount] = useState(0);
  const [documentEtaMs, setDocumentEtaMs] = useState(0);
  const [documentRunMessage, setDocumentRunMessage] = useState('');
  const [documentImageMode, setDocumentImageMode] = useState<ImageMode>('off');
  const [documentRetryingFailed, setDocumentRetryingFailed] = useState(false);
  const uploadConfigGateRef = useRef(
    createDocumentUploadConfigGate(async () => {
      const response = await fetch('/api/batch-upload-config');
      if (!response.ok) {
        throw new Error('Could not prepare uploads right now. Retry.');
      }
      const json = (await response.json()) as DocumentUploadConfig;
      if (!json.success) {
        throw new Error('Could not prepare uploads right now. Retry.');
      }
      return json;
    }),
  );

  useEffect(() => {
    void ensureUploadConfigReady(true).catch(() => undefined);
  }, []);

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
  const documentProcessing = documentJobStatus === 'queued' || documentJobStatus === 'running';

  function buildHeaders(): HeadersInit {
    const effectiveSessionId = sessionId || getClientSessionId();
    return effectiveSessionId ? { [SESSION_HEADER]: effectiveSessionId } : {};
  }

  async function ensureUploadConfigReady(silent = false): Promise<DocumentUploadConfig> {
    try {
      const config = await uploadConfigGateRef.current.ensureReady();
      setUploadConfig(config);
      return config;
    } catch (error) {
      if (!silent) {
        setDocumentRunMessage(error instanceof Error ? error.message : 'Could not prepare uploads right now. Retry.');
      }
      throw error;
    }
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

  async function loadBatchJob(jobId: string): Promise<BatchJobApi> {
    const response = await fetch(`/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=400&offset=0`, {
      headers: buildHeaders(),
    });

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

    setDocumentJobStatus(json.job.status);
    setDocumentProcessedCount(Number(json.job.processedUrls || 0));
    setDocumentTotalCount(Number(json.job.totalUrls || 0));
    setDocumentSuccessCount(Number(json.job.successCount || 0));
    setDocumentFailureCount(Number(json.job.failureCount || 0));
    setDocumentDegradedCount(Number(json.job.degradedCount || 0));
    setDocumentUsableCount(Number(json.job.usableCount || 0));
    setDocumentPartialOutputCount(Number(json.job.partialOutputCount || 0));
    setDocumentEtaMs(Math.max(0, Number(json.estimatedRemainingMs || 0)));
    setDocumentResults((json.items || []).map(mapBatchItem));

    const startedAtMs = parseIsoMs(json.job.startedAt);
    const completedAtMs = parseIsoMs(json.job.completedAt);

    if (json.job.status === 'completed') {
      const durationMs =
        startedAtMs > 0 && completedAtMs > startedAtMs
          ? completedAtMs - startedAtMs
          : Number(json.job.averageDurationMs || 0) * Number(json.job.processedUrls || 0);

      setDocumentRunMessage(
        `Completed in ${formatDuration(durationMs)}. ${Number(json.job.usableCount || 0).toLocaleString()} usable, ${Number(json.job.partialOutputCount || 0).toLocaleString()} partial, ${Number(json.job.degradedCount || 0).toLocaleString()} degraded, ${Number(json.job.failureCount || 0).toLocaleString()} failed.`,
      );

      void trackClientEvent({
        eventName: 'homepage_file_result',
        eventGroup: 'extract',
        status: Number(json.job.failureCount || 0) > 0 ? 'failure' : 'success',
        pagePath: '/',
        metadata: {
          jobId: json.job.id,
          count: Number(json.job.totalUrls || 0),
          successCount: Number(json.job.successCount || 0),
          partialOutputCount: Number(json.job.partialOutputCount || 0),
          degradedCount: Number(json.job.degradedCount || 0),
          failureCount: Number(json.job.failureCount || 0),
          format: documentFormat,
          inputMode: json.job.inputMode,
        },
      });
    } else if (json.job.status === 'running' || json.job.status === 'queued') {
      setDocumentRunMessage(
        `Processed ${Number(json.job.processedUrls || 0).toLocaleString()} of ${Number(json.job.totalUrls || 0).toLocaleString()} (${json.job.phase}). ${Number(json.job.itemsInProgress || 0).toLocaleString()} in progress at ${Number(json.job.throughputPerMinute || 0).toLocaleString()} items/min.`,
      );
    } else if (json.job.status === 'failed') {
      setDocumentRunMessage('File conversion failed before completion.');
    }

    return json.job;
  }

  useEffect(() => {
    if (!documentJobId) return;

    let active = true;

    async function poll(): Promise<void> {
      try {
        await loadBatchJob(documentJobId);
      } catch (error) {
        if (!active) return;
        setDocumentRunMessage(error instanceof Error ? error.message : 'Failed to refresh file conversion status.');
      }
    }

    void poll();
    const interval = setInterval(() => {
      if (!active) return;
      if (documentJobStatus === 'completed' || documentJobStatus === 'failed' || documentJobStatus === 'cancelled') {
        return;
      }
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

  async function downloadDocumentBatchItem(row: BatchItemResult): Promise<void> {
    if (row.status !== 'success' || !row.outputObjectKey || !row.id || !documentJobId) return;

    const response = await fetch(
      `/api/batch-jobs/download?jobId=${encodeURIComponent(documentJobId)}&itemId=${row.id}`,
      {
        headers: buildHeaders(),
      },
    );
    await downloadBlobResponse(response, row.outputFilename || `homepage-file.${row.outputFormat || 'pdf'}`);
  }

  async function getAllBatchRows(jobId: string): Promise<BatchItemResult[]> {
    const output: BatchItemResult[] = [];
    const limit = 1000;
    let offset = 0;
    let guard = 0;

    while (guard < 500) {
      const response = await fetch(`/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=${limit}&offset=${offset}`, {
        headers: buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to load file rows (${response.status}).`);
      }

      const json = (await response.json()) as {
        success: boolean;
        job: BatchJobApi;
        items: BatchItemApi[];
      };

      if (!json.success) {
        throw new Error('Failed to load file rows.');
      }

      const rows = (json.items || []).map(mapBatchItem);
      output.push(...rows);

      offset += rows.length;
      guard += 1;

      if (rows.length === 0 || offset >= Number(json.job.totalUrls || 0)) break;
    }

    return output;
  }

  async function handleDownloadAllDocuments(): Promise<void> {
    if (!documentJobId || documentDownloadingAll) return;

    setDocumentDownloadingAll(true);
    try {
      const rows = await getAllBatchRows(documentJobId);
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

  async function retryFailedFiles(): Promise<void> {
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
          settings: {
            fontFace: 'serif',
            fontSize: 16,
            lineSpacing: 1.6,
            colorTheme: 'light',
          },
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
        throw new Error(json.error || 'Retry file conversion failed.');
      }

      setDocumentResults([]);
      setDocumentJobId(json.job.jobId);
      setDocumentJobStatus(json.job.status || 'queued');
      setDocumentProcessedCount(0);
      setDocumentTotalCount(Number(json.job.totalUrls || failedFiles.length));
      setDocumentSuccessCount(0);
      setDocumentFailureCount(0);
      setDocumentDegradedCount(0);
      setDocumentUsableCount(0);
      setDocumentPartialOutputCount(0);
      setDocumentEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setDocumentRunMessage(`Retry job queued (${json.job.jobId.slice(0, 8)}) from ${failedFiles.length.toLocaleString()} failed files.`);
    } catch (error) {
      setDocumentRunMessage(error instanceof Error ? error.message : 'Retry file conversion failed.');
    } finally {
      setDocumentRetryingFailed(false);
    }
  }

  async function uploadSingleDocument(entry: DocumentUploadEntry, activeUploadConfig: DocumentUploadConfig): Promise<void> {
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

      if (activeUploadConfig.mode === 'blob') {
        const pathname = `${sanitizePathSegment(sessionId || 'anonymous')}/${Date.now()}-${sanitizePathSegment(entry.name)}`;
        const blob = await upload(pathname, entry.file, {
          access: 'private',
          handleUploadUrl: '/api/batch-upload-token',
          multipart: entry.file.size > 5 * 1024 * 1024,
          contentType: entry.contentType || 'application/octet-stream',
          clientPayload: JSON.stringify({
            sessionId: sessionId || null,
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
          `/api/batch-upload-local?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent(entry.name)}&contentType=${encodeURIComponent(entry.contentType || 'application/octet-stream')}`,
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

    const waitingForUploadConfig = !uploadConfigGateRef.current.isReady();
    if (waitingForUploadConfig) {
      setDocumentRunMessage('Preparing upload settings...');
    }

    let activeUploadConfig: DocumentUploadConfig;
    try {
      activeUploadConfig = await ensureUploadConfigReady();
    } catch {
      return;
    }

    const currentCount = documentUploads.length;
    const currentBytes = documentUploads.reduce((sum, item) => sum + item.size, 0);
    if (currentCount + files.length > activeUploadConfig.limits.maxFiles) {
      setDocumentRunMessage(
        `Document limit exceeded. Max allowed is ${activeUploadConfig.limits.maxFiles.toLocaleString()} files.`,
      );
      return;
    }

    const nextBytes = currentBytes + files.reduce((sum, file) => sum + file.size, 0);
    if (nextBytes > activeUploadConfig.limits.maxBatchBytes) {
      setDocumentRunMessage(
        `Document selection exceeds the total technical limit of ${(activeUploadConfig.limits.maxBatchBytes / (1024 * 1024 * 1024)).toFixed(1)} GB.`,
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

    if (waitingForUploadConfig) {
      setDocumentRunMessage('');
    }
    setDocumentUploads((current) => [...current, ...entries]);
    setDocumentUploading(true);

    try {
      for (const entry of entries) {
        if (entry.size > activeUploadConfig.limits.maxFileBytes) {
          setDocumentUploads((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    status: 'failed',
                    error: `File exceeds the per-file limit of ${Math.round(activeUploadConfig.limits.maxFileBytes / (1024 * 1024))} MB.`,
                  }
                : item,
            ),
          );
          continue;
        }

        await uploadSingleDocument(entry, activeUploadConfig);
      }
    } finally {
      setDocumentUploading(false);
    }
  }

  function removeDocumentUpload(id: string): void {
    setDocumentUploads((current) => current.filter((item) => item.id !== id));
  }

  async function handleDocumentSubmit(): Promise<void> {
    const uploadedFiles = documentUploads
      .filter((item) => item.status === 'uploaded' && item.uploadRef)
      .map((item) => ({ uploadId: item.uploadRef!.uploadId }));

    if (uploadedFiles.length === 0) {
      setDocumentRunMessage('Upload at least one supported file before starting file conversion.');
      return;
    }

    setDocumentResults([]);
    setDocumentProcessedCount(0);
    setDocumentTotalCount(uploadedFiles.length);
    setDocumentSuccessCount(0);
    setDocumentFailureCount(0);
    setDocumentDegradedCount(0);
    setDocumentUsableCount(0);
    setDocumentPartialOutputCount(0);
    setDocumentEtaMs(uploadedFiles.length * 9_000);
    setDocumentJobStatus('queued');
    setDocumentRunMessage('Submitting files for conversion...');

    void trackClientEvent({
      eventName: 'homepage_file_submit',
      eventGroup: 'extract',
      status: 'attempt',
      pagePath: '/',
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
          settings: {
            fontFace: 'serif',
            fontSize: 16,
            lineSpacing: 1.6,
            colorTheme: 'light',
          },
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
        throw new Error(json.error || 'File conversion could not be started.');
      }

      setDocumentJobId(json.job.jobId);
      setDocumentJobStatus(json.job.status || 'queued');
      setDocumentTotalCount(Number(json.job.totalUrls || uploadedFiles.length));
      setDocumentEtaMs(Number(json.job.estimatedProcessingMs || 0));
      setDocumentRunMessage(`Job queued (${json.job.jobId.slice(0, 8)}). Conversion has started.`);
    } catch (error) {
      setDocumentRunMessage(error instanceof Error ? error.message : 'File conversion could not be started.');
      setDocumentJobStatus('failed');
    }
  }

  return (
    <div data-homepage-file-workspace className="mx-auto mt-4 max-w-5xl">
      <BatchDocumentPanel
        mode="document"
        onModeChange={() => undefined}
        showModeSwitch={false}
        externalOpenSignal={openSignal}
        accept={uploadConfig.accept}
        files={documentUploads}
        format={documentFormat}
        onFormatChange={setDocumentFormat}
        imageMode={documentImageMode}
        onImageModeChange={setDocumentImageMode}
        showMixedImageSupportNote={selectedDocumentHasMixedImageSupport}
        onSelectFiles={(files) => void handleSelectDocumentFiles(files)}
        onRemoveFile={removeDocumentUpload}
        onSubmit={() => void handleDocumentSubmit()}
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
        onDownloadOne={(row) => void downloadDocumentBatchItem(row)}
        onDownloadAll={() => void handleDownloadAllDocuments()}
        onRetryFailed={() => void retryFailedFiles()}
        retryingFailed={documentRetryingFailed}
        dropzoneTitle="Drop files here or choose files."
        dropzoneHelp="Attach one file or many files without leaving the homepage."
        selectFilesLabel="Add files"
        submitIdleLabel="Convert files"
        submitProcessingLabel="Converting files..."
        supportedFormatsCopy={DOCUMENT_SUPPORTED_COPY}
      />
    </div>
  );
}
