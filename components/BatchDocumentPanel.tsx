'use client';

import { useEffect, useRef, useState } from 'react';

import { BatchModeSwitch } from '@/components/BatchModeSwitch';
import { BatchReviewList } from '@/components/BatchReviewList';
import { ImageToggle } from '@/components/ImageToggle';
import type { BatchItemResult, BatchSurfaceStage } from '@/components/batchTypes';
import { DOCUMENT_SUPPORTED_COPY } from '@/lib/documentSupport';
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
  showModeSwitch?: boolean;
  externalOpenSignal?: number;
  accept: string;
  files: DocumentUploadItem[];
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  imageMode: ImageMode;
  onImageModeChange: (value: ImageMode) => void;
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
  usableCount: number;
  partialOutputCount: number;
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
  dropzoneTitle?: string;
  dropzoneHelp?: string;
  selectFilesLabel?: string;
  submitIdleLabel?: string;
  submitProcessingLabel?: string;
  supportedFormatsCopy?: string;
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

function progressFill(processedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((processedCount / totalCount) * 100));
}

function settledRows(results: BatchItemResult[]): BatchItemResult[] {
  return results.filter((item) => item.status === 'success' || item.status === 'failure');
}

function currentStage(processing: boolean, results: BatchItemResult[]): BatchSurfaceStage {
  return settledRows(results).length > 0 ? 'review' : processing ? 'running' : 'setup';
}

export function BatchDocumentPanel({
  mode,
  onModeChange,
  showModeSwitch = true,
  externalOpenSignal = 0,
  accept,
  files,
  format,
  onFormatChange,
  imageMode,
  onImageModeChange,
  showMixedImageSupportNote,
  onSelectFiles,
  onRemoveFile,
  onSubmit,
  processing,
  uploading,
  downloadingAll,
  processedCount,
  totalCount,
  successCount,
  failureCount,
  degradedCount,
  usableCount,
  partialOutputCount,
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
  dropzoneTitle = 'Drop documents here or choose files.',
  dropzoneHelp = 'Press Enter or Space to open the file picker, or drop files directly into this area.',
  selectFilesLabel = 'Select Files',
  submitIdleLabel = 'Start Batch',
  submitProcessingLabel = 'Processing Batch...',
  supportedFormatsCopy = DOCUMENT_SUPPORTED_COPY,
}: BatchDocumentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const totalSelectedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const uploadedCount = files.filter((file) => file.status === 'uploaded').length;
  const fill = progressFill(processedCount, totalCount);
  const stage = currentStage(processing, results);
  const currentCount = totalCount > 0 ? totalCount : uploadedCount || files.length;
  const currentContextLabel = `${currentCount.toLocaleString()} ${currentCount === 1 ? 'file' : 'files'} · ${format.toUpperCase()} output`;

  useEffect(() => {
    if (stage !== 'setup') {
      setShowMoreOptions(false);
    }
  }, [stage]);

  useEffect(() => {
    if (externalOpenSignal <= 0 || stage !== 'setup') return;
    openFilePicker();
  }, [externalOpenSignal, stage]);

  function handleDrop(filesToAdd: FileList | null): void {
    if (!filesToAdd || filesToAdd.length === 0) return;
    onSelectFiles(Array.from(filesToAdd));
  }

  function openFilePicker(): void {
    fileInputRef.current?.click();
  }

  return (
    <section
      data-batch-surface="primary"
      data-batch-mode="document"
      data-batch-stage={stage}
      className="mt-7 rounded-[2rem] border border-[var(--color-border)] bg-white p-6 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)]"
    >
      <div className="space-y-6">
        {showModeSwitch ? <BatchModeSwitch mode={mode} onModeChange={onModeChange} /> : null}

        {stage === 'setup' ? (
          <>
            <div className="space-y-4">
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
                className={`rounded-[1.75rem] border px-5 py-8 text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
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

                <p id="document-dropzone-title" className="text-xl font-semibold text-[var(--color-ink)]">
                  {dropzoneTitle}
                </p>
                <p id="document-dropzone-help" className="mt-2 text-sm text-[var(--color-muted)]">
                  {dropzoneHelp}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{supportedFormatsCopy}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                  className="mt-4 rounded-full border border-[var(--color-border)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {selectFilesLabel}
                </button>
              </div>

              {files.length > 0 ? (
                <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
                    <span>{files.length.toLocaleString()} selected</span>
                    <span>{uploadedCount.toLocaleString()} uploaded</span>
                    <span>{formatBytes(totalSelectedBytes)}</span>
                  </div>

                  <div className="space-y-2">
                    {files.map((file) => (
                      <article
                        key={file.id}
                        className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[var(--color-ink)]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="mt-1 text-[var(--color-muted)]">{formatBytes(file.size)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
                              {file.status === 'queued' ? 'ready' : file.status}
                            </span>
                            {file.status !== 'uploading' ? (
                              <button
                                type="button"
                                onClick={() => onRemoveFile(file.id)}
                                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                              >
                                Remove
                              </button>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)]">
                                {file.progress > 0 ? `${Math.round(file.progress)}%` : 'Uploading'}
                              </span>
                            )}
                          </div>
                        </div>

                        {file.error ? <p className="mt-2 text-xs text-red-700">{file.error}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {runMessage ? <p className="text-sm text-[var(--color-muted)]">{runMessage}</p> : null}

              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Output format"
                  value={format}
                  onChange={(event) => onFormatChange(event.target.value as ExportFormat)}
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-base text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
                >
                  {EXPORT_FORMATS.map((item) => (
                    <option key={item} value={item}>
                      {item.toUpperCase()} output
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={processing || uploading || uploadedCount === 0}
                  className="h-12 rounded-2xl bg-[var(--color-accent)] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? submitProcessingLabel : submitIdleLabel}
                </button>

                <button
                  type="button"
                  aria-expanded={showMoreOptions ? 'true' : 'false'}
                  aria-controls="batch-document-more-options"
                  onClick={() => setShowMoreOptions((current) => !current)}
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-5 text-base font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  More options
                </button>
              </div>

              <div
                id="batch-document-more-options"
                data-batch-more-options
                data-batch-more-options-open={showMoreOptions ? 'true' : 'false'}
                className={showMoreOptions ? 'block' : 'hidden'}
              >
                <div className="grid gap-4 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">Document images</span>
                      <div className="theme-light">
                        <ImageToggle value={imageMode} onChange={onImageModeChange} />
                      </div>
                    </div>
                    <p className="text-sm text-[var(--color-muted)]">
                      Applies when this batch includes PDF, EPUB, HTML/HTM, or DOCX files.
                    </p>
                    {showMixedImageSupportNote ? (
                      <p className="text-sm text-[var(--color-muted)]">
                        Mixed batches still keep this setting, but image handling only affects the supported file types.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                    <span>{maxFiles.toLocaleString()} files max</span>
                    <span>{formatBytes(maxFileBytes)} per file</span>
                    <span>{formatBytes(maxBatchBytes)} total</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <h2 className="logo-mark max-w-[12ch] text-5xl font-semibold leading-[0.95] text-[var(--color-ink)]">
                {stage === 'running' ? 'Run in progress.' : 'Review what actually came back.'}
              </h2>
              <p className="max-w-xl text-lg leading-8 text-[var(--color-muted)]">
                {stage === 'running'
                  ? 'The current run becomes the only thing asking for attention.'
                  : 'The finished run reveals row-level truth only after the batch has completed enough work to review.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xl font-semibold text-[var(--color-ink)]">{currentContextLabel}</p>
                  <p className="text-lg text-[var(--color-muted)]">
                    {processedCount.toLocaleString()} of {Math.max(totalCount, processedCount).toLocaleString()} checked
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-[var(--color-ink)]">{fill}%</p>
                  {processing ? <p className="text-sm text-[var(--color-muted)]">ETA {etaText}</p> : null}
                </div>
              </div>

              <div
                className="h-3 overflow-hidden rounded-full bg-[var(--color-surface)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={fill}
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out"
                  style={{ width: `${fill}%` }}
                />
              </div>
            </div>
          </>
        )}

        {stage === 'review' ? (
          <BatchReviewList
            results={results}
            usableCount={usableCount}
            partialCount={partialOutputCount}
            degradedCount={degradedCount}
            failureCount={failureCount}
            runMessage={runMessage}
            processing={processing}
            onDownloadOne={onDownloadOne}
            canDownload={(item) => item.status === 'success' && Boolean(item.outputObjectKey)}
            onDownloadAll={successCount > 0 ? onDownloadAll : null}
            downloadAllLabel={downloadingAll ? 'Downloading...' : `Download ${successCount.toLocaleString()}`}
            downloadAllDisabled={processing || downloadingAll || successCount === 0}
            onRetryFailed={failureCount > 0 ? onRetryFailed : null}
            retryLabel={retryingFailed ? 'Retrying...' : `Retry failed files (${failureCount.toLocaleString()})`}
            retryDisabled={processing || retryingFailed}
            rowTitle={(item) => item.originalFilename || item.outputFilename || item.title || item.url}
          />
        ) : null}

        {stage === 'running' && runMessage ? <p className="text-sm text-[var(--color-muted)]">{runMessage}</p> : null}
      </div>
    </section>
  );
}
