'use client';

import { useRef, useState } from 'react';

import { BatchModeSwitch } from '@/components/BatchModeSwitch';
import { ImageToggle } from '@/components/ImageToggle';
import type { BatchItemResult } from '@/components/BatchUrlPanel';
import { nextStepGuidanceForErrorCode } from '@/lib/trustGuidance';
import type { BatchInputMode, ExportFormat, ImageMode } from '@/lib/types';

type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export type DocumentUploadItem = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  status: UploadStatus;
  progress: number;
  uploadId?: string;
  error?: string;
};

type BatchDocumentPanelProps = {
  mode: BatchInputMode;
  onModeChange: (mode: BatchInputMode) => void;
  accept: string;
  files: DocumentUploadItem[];
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  imageMode: ImageMode;
  onImageModeChange: (value: ImageMode) => void;
  showImageModeToggle: boolean;
  showMixedImageSupportNote: boolean;
  onSelectFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onSubmit: () => void;
  processing: boolean;
  uploading: boolean;
  downloadingAll: boolean;
  jobId: string;
  processedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  etaText: string;
  runMessage: string;
  maxFiles: number;
  maxFileBytes: number;
  maxBatchBytes: number;
  results: BatchItemResult[];
  onDownloadOne: (item: BatchItemResult) => void;
  onDownloadAll: () => void;
  onRetryFailed: () => void;
  retryingFailed: boolean;
};

const EXPORT_FORMATS: ExportFormat[] = ['pdf', 'txt', 'md', 'docx'];

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

function formatMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0s';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function progressFill(processedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((processedCount / totalCount) * 100));
}

export function BatchDocumentPanel({
  mode,
  onModeChange,
  accept,
  files,
  format,
  onFormatChange,
  imageMode,
  onImageModeChange,
  showImageModeToggle,
  showMixedImageSupportNote,
  onSelectFiles,
  onRemoveFile,
  onSubmit,
  processing,
  uploading,
  downloadingAll,
  jobId,
  processedCount,
  totalCount,
  successCount,
  failureCount,
  degradedCount,
  etaText,
  runMessage,
  maxFiles,
  maxFileBytes,
  maxBatchBytes,
  results,
  onDownloadOne,
  onDownloadAll,
  onRetryFailed,
  retryingFailed,
}: BatchDocumentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const totalSelectedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const uploadedCount = files.filter((file) => file.status === 'uploaded').length;
  const fill = progressFill(processedCount, totalCount);
  const visibleDegradedCount = results.filter(
    (row) => row.status === 'success' && row.qualityState === 'degraded',
  ).length;
  const imageToggleLabelId = 'document-image-mode-label';
  const showProgress = totalCount > 0 || successCount > 0 || failureCount > 0;
  const showActivity =
    processing || Boolean(runMessage) || totalCount > 0 || successCount > 0 || failureCount > 0 || results.length > 0;

  function handleDrop(filesToAdd: FileList | null): void {
    if (!filesToAdd || filesToAdd.length === 0) return;
    onSelectFiles(Array.from(filesToAdd));
  }

  function openFilePicker(): void {
    fileInputRef.current?.click();
  }

  return (
    <section className="mt-7 rounded-2xl border border-[var(--color-border)] bg-white p-5 text-left">
      <div className="space-y-4">
        <BatchModeSwitch mode={mode} onModeChange={onModeChange} />

        <div
          role="group"
          aria-labelledby="document-dropzone-title"
          aria-describedby="document-dropzone-help"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleDrop(event.dataTransfer.files);
          }}
          className={`rounded-xl border px-4 py-6 text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
            dragActive
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-[var(--color-border)] text-[var(--color-muted)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(event) => {
              handleDrop(event.target.files);
              event.currentTarget.value = '';
            }}
          />

          <p id="document-dropzone-title" className="text-sm font-medium text-[var(--color-ink)]">
            Drop documents here or choose files.
          </p>
          <p id="document-dropzone-help" className="mt-2 text-xs text-[var(--color-muted)]">
            Press Enter or Space to open the file picker, or drop files directly into this area.
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            className="mt-3 h-10 rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Select Files
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="document-batch-format" className="text-sm font-medium text-[var(--color-ink)]">
              Format
            </label>
            <select
              id="document-batch-format"
              value={format}
              onChange={(event) => onFormatChange(event.target.value as ExportFormat)}
              className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              {EXPORT_FORMATS.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
            {showImageModeToggle ? (
              <>
                <span id={imageToggleLabelId} className="text-sm font-medium text-[var(--color-ink)]">
                  Document images
                </span>
                <div className="theme-light">
                  <ImageToggle value={imageMode} onChange={onImageModeChange} ariaLabelledBy={imageToggleLabelId} />
                </div>
              </>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              disabled={processing || uploading || uploadedCount === 0}
              className="h-10 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? 'Processing Batch...' : 'Start Batch'}
            </button>

            <button
              type="button"
              onClick={onDownloadAll}
              disabled={processing || downloadingAll || successCount === 0}
              className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadingAll ? 'Downloading...' : `Download ${successCount.toLocaleString()}`}
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs text-[var(--color-muted)]">
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
              {maxFiles.toLocaleString()} files max
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
              {formatBytes(maxFileBytes)} per file
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
              {formatBytes(maxBatchBytes)} total
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
              {files.length.toLocaleString()} selected
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
              {uploadedCount.toLocaleString()} uploaded
            </span>
            {jobId ? (
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1">Job {jobId.slice(0, 8)}</span>
            ) : null}
            {processing ? (
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1">ETA {etaText}</span>
            ) : null}
            {showProgress ? (
              <div className="grid min-w-20 place-items-center rounded-xl border border-[var(--color-border)] px-4 py-3 text-center">
                <span className="text-lg font-semibold text-[var(--color-ink)]">{fill}%</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">progress</span>
              </div>
            ) : null}
          </div>
        </div>

        {showProgress ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-[var(--color-ink)]">Batch progress</span>
              <span>
                {processedCount.toLocaleString()} / {Math.max(totalCount, processedCount).toLocaleString()}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        ) : null}

        {showImageModeToggle && showMixedImageSupportNote ? (
          <p className="text-xs text-[var(--color-muted)]">
            Applies only to PDF, EPUB, HTML/HTM, and DOCX files in this batch.
          </p>
        ) : null}

        {files.length > 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
              <span>Selected files</span>
              <span>{formatBytes(totalSelectedBytes)}</span>
            </div>

            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {files.map((file) => (
                <article key={file.id} className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-[var(--color-ink)]" title={file.name}>
                      {file.name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        file.status === 'uploaded'
                          ? 'border border-[var(--color-accent)] bg-white text-[var(--color-accent)]'
                          : file.status === 'failed'
                            ? 'border border-red-700 bg-white text-red-700'
                            : 'border border-[var(--color-border)] bg-white text-[var(--color-ink)]'
                      }`}
                    >
                      {file.status === 'queued' ? 'ready' : file.status}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[var(--color-muted)]">
                    <span>{formatBytes(file.size)}</span>
                    {file.status !== 'uploading' ? (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        className="rounded-md border border-[var(--color-border)] px-2 py-1 font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        Remove
                      </button>
                    ) : (
                      <span>{file.progress > 0 ? `${Math.round(file.progress)}%` : 'Uploading'}</span>
                    )}
                  </div>

                  {file.error ? <p className="mt-1 break-words text-[11px] text-red-700">{file.error}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {showActivity ? (
          <div className="border-t border-[var(--color-border)] pt-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Activity
                </p>
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">Batch activity</h3>
              </div>
              {failureCount > 0 ? (
                <button
                  type="button"
                  onClick={onRetryFailed}
                  disabled={processing || retryingFailed}
                  className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {retryingFailed ? 'Retrying...' : `Retry failed files (${failureCount.toLocaleString()})`}
                </button>
              ) : null}
            </div>

            {results.length > 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                  <span>Successful: {successCount.toLocaleString()}</span>
                  <span>Degraded: {degradedCount.toLocaleString()}</span>
                  <span>Failed: {failureCount.toLocaleString()}</span>
                  <span>Visible: {results.length.toLocaleString()}</span>
                </div>

                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {results.map((row) => (
                    <article key={`${row.originalFilename || row.url}-${row.durationMs}`} className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className="min-w-0 flex-1 truncate font-semibold text-[var(--color-ink)]"
                          title={row.originalFilename || row.title || row.url}
                        >
                          {row.originalFilename || row.outputFilename || row.title || row.url}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            row.status === 'success' && row.qualityState === 'degraded'
                              ? 'border border-amber-600 bg-white text-amber-700'
                              : row.status === 'success'
                              ? 'border border-[var(--color-accent)] bg-white text-[var(--color-accent)]'
                              : row.status === 'failure'
                                ? 'border border-red-700 bg-white text-red-700'
                                : row.status === 'running'
                                  ? 'border border-[var(--color-border)] bg-white text-[var(--color-ink)]'
                                  : 'border border-[var(--color-border)] bg-white text-[var(--color-muted)]'
                          }`}
                        >
                          {row.status === 'success' && row.qualityState === 'degraded' ? 'degraded' : row.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[var(--color-muted)]">
                        <span>{formatMs(row.durationMs)}</span>
                        {row.status === 'success' && row.outputObjectKey ? (
                          <button
                            type="button"
                            onClick={() => onDownloadOne(row)}
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          >
                            Download
                          </button>
                        ) : null}
                      </div>

                      {row.status === 'success' && row.qualityState === 'degraded' && row.warnings?.length ? (
                        <div className="mt-1 space-y-1 text-[11px] text-amber-700">
                          {row.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                        </div>
                      ) : null}
                      {row.status === 'failure' ? (
                        <div className="mt-1 space-y-1 text-[11px] text-red-700">
                          <p className="break-words">
                            {row.errorCode || 'DOCUMENT_CONVERSION_FAILED'}: {row.errorMessage || 'Failed to convert file.'}
                          </p>
                          {nextStepGuidanceForErrorCode(row.errorCode) ? (
                            <p className="break-words">Next step: {nextStepGuidanceForErrorCode(row.errorCode)}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                {degradedCount > visibleDegradedCount ? (
                  <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                    More degraded rows exist outside the visible page.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">
                {runMessage || 'Batch status will appear here after you start a run.'}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
