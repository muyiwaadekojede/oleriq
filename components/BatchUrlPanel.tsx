'use client';

import { useRef } from 'react';

import { BatchModeSwitch } from '@/components/BatchModeSwitch';
import { nextStepGuidanceForErrorCode } from '@/lib/trustGuidance';
import type { BatchInputMode, ExportFormat, ExtractResultState } from '@/lib/types';

export type BatchItemResult = {
  id?: number;
  url: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  qualityState?: ExtractResultState;
  warnings?: string[];
  durationMs: number;
  extractionId?: string;
  sourceUrl?: string;
  title?: string;
  originalFilename?: string;
  contentType?: string;
  byteSize?: number;
  sourceObjectKey?: string;
  outputObjectKey?: string;
  outputFilename?: string;
  outputFormat?: string;
  errorCode?: string;
  errorMessage?: string;
};

type BatchUrlPanelProps = {
  mode: BatchInputMode;
  onModeChange: (mode: BatchInputMode) => void;
  urlsInput: string;
  onUrlsInputChange: (value: string) => void;
  onSubmit: () => void;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  processing: boolean;
  downloadingAll: boolean;
  jobId: string;
  parsedCount: number;
  maxUrls: number;
  processedCount: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
  degradedCount: number;
  etaText: string;
  downloadEstimateText: string;
  runMessage: string;
  results: BatchItemResult[];
  onDownloadOne: (item: BatchItemResult) => void;
  onDownloadAll: () => void;
  onRetryFailed: () => void;
  retryingFailed: boolean;
};

const EXPORT_FORMATS: ExportFormat[] = ['pdf', 'txt', 'md', 'docx'];

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

export function BatchUrlPanel({
  mode,
  onModeChange,
  urlsInput,
  onUrlsInputChange,
  onSubmit,
  format,
  onFormatChange,
  processing,
  downloadingAll,
  jobId,
  parsedCount,
  maxUrls,
  processedCount,
  totalCount,
  successCount,
  failureCount,
  degradedCount,
  etaText,
  downloadEstimateText,
  runMessage,
  results,
  onDownloadOne,
  onDownloadAll,
  onRetryFailed,
  retryingFailed,
}: BatchUrlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fill = progressFill(processedCount, totalCount);
  const tooManyUrls = parsedCount > maxUrls;
  const visibleResults = results.slice(0, 400);
  const visibleSuccessCount = visibleResults.filter((row) => row.status === 'success').length;
  const visibleDegradedCount = visibleResults.filter(
    (row) => row.status === 'success' && row.qualityState === 'degraded',
  ).length;
  const showProgress = totalCount > 0 || processedCount > 0 || results.length > 0;
  const showActivity =
    processing || Boolean(runMessage) || totalCount > 0 || successCount > 0 || failureCount > 0 || results.length > 0;

  async function importUrlsFromFile(file: File): Promise<void> {
    const text = await file.text();
    const joined = urlsInput.trim().length > 0 ? `${urlsInput}\n${text}` : text;
    onUrlsInputChange(joined);
  }

  return (
    <section className="mt-7 rounded-2xl border border-[var(--color-border)] bg-white p-5 text-left">
      <div className="space-y-4">
        <BatchModeSwitch mode={mode} onModeChange={onModeChange} />

        <div className="grid gap-3">
          <label htmlFor="batch-urls" className="sr-only">
            URLs
          </label>
          <textarea
            id="batch-urls"
            value={urlsInput}
            onChange={(event) => onUrlsInputChange(event.target.value)}
            placeholder="https://example.com/article-1&#10;https://example.com/article-2"
            rows={6}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
          />

          {tooManyUrls ? (
            <p className="text-xs font-medium text-red-700">
              URL count exceeds the batch cap. Remove some links before starting.
            </p>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="batch-format" className="text-sm font-medium text-[var(--color-ink)]">
                Format
              </label>
              <select
                id="batch-format"
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
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.md,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void importUrlsFromFile(file);
                event.currentTarget.value = '';
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                Import
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={processing || parsedCount === 0 || tooManyUrls}
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
                Limit {maxUrls.toLocaleString()} URLs
              </span>
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                Parsed {parsedCount.toLocaleString()}
              </span>
              {jobId ? (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                  Job {jobId.slice(0, 8)}
                </span>
              ) : null}
              {processing ? (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1">ETA {etaText}</span>
              ) : null}
              {!processing && successCount > 0 ? (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                  Download est. {downloadEstimateText}
                </span>
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
        </div>

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
                  {retryingFailed ? 'Retrying...' : `Retry failed URLs (${failureCount.toLocaleString()})`}
                </button>
              ) : null}
            </div>

            {results.length > 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                  <span>Successful: {successCount.toLocaleString()}</span>
                  <span>Degraded: {degradedCount.toLocaleString()}</span>
                  <span>Failed: {failureCount.toLocaleString()}</span>
                  <span>Visible: {visibleResults.length.toLocaleString()}</span>
                </div>

                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {visibleResults.map((row) => (
                    <article
                      key={row.url}
                      className="rounded-lg border border-[var(--color-border)] bg-white p-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate font-semibold text-[var(--color-ink)]" title={row.url}>
                          {row.url}
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
                        {row.status === 'success' && (row.extractionId || row.sourceUrl) ? (
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
                            {row.errorCode || 'EXTRACTION_FAILED'}: {row.errorMessage || 'Failed to process URL.'}
                          </p>
                          {nextStepGuidanceForErrorCode(row.errorCode) ? (
                            <p className="break-words">Next step: {nextStepGuidanceForErrorCode(row.errorCode)}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                {results.length > 400 ? (
                  <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                    Showing first 400 rows for readability.
                  </p>
                ) : null}
                {successCount > visibleSuccessCount ? (
                  <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                    More successful rows exist outside the visible page.
                  </p>
                ) : null}
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
