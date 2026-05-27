'use client';

import { useEffect, useRef, useState } from 'react';

import { BatchModeSwitch } from '@/components/BatchModeSwitch';
import { BatchReviewList } from '@/components/BatchReviewList';
import type { BatchItemResult, BatchSurfaceStage } from '@/components/batchTypes';
import type { BatchInputMode, ExportFormat } from '@/lib/types';

type BatchUrlPanelProps = {
  mode: BatchInputMode;
  onModeChange: (mode: BatchInputMode) => void;
  showModeSwitch?: boolean;
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
  usableCount: number;
  emptyOutputCount: number;
  partialOutputCount: number;
  etaText: string;
  runMessage: string;
  results: BatchItemResult[];
  onDownloadOne: (item: BatchItemResult) => void;
  onDownloadAll: () => void;
  onRetryFailed: () => void;
  retryingFailed: boolean;
};

const EXPORT_FORMATS: ExportFormat[] = ['pdf', 'txt', 'md', 'docx'];

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

export function BatchUrlPanel({
  mode,
  onModeChange,
  showModeSwitch = true,
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
  usableCount,
  partialOutputCount,
  etaText,
  runMessage,
  results,
  onDownloadOne,
  onDownloadAll,
  onRetryFailed,
  retryingFailed,
}: BatchUrlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const fill = progressFill(processedCount, totalCount);
  const stage = currentStage(processing, results);
  const tooManyUrls = parsedCount > maxUrls;
  const hasOutput = successCount > 0 || partialOutputCount > 0 || degradedCount > 0;
  const currentCount = totalCount > 0 ? totalCount : parsedCount;
  const currentContextLabel = `${currentCount.toLocaleString()} ${currentCount === 1 ? 'link' : 'links'} · ${format.toUpperCase()} output`;

  useEffect(() => {
    if (stage !== 'setup') {
      setShowMoreOptions(false);
    }
  }, [stage]);

  async function importUrlsFromFile(file: File): Promise<void> {
    const text = await file.text();
    const joined = urlsInput.trim().length > 0 ? `${urlsInput}\n${text}` : text;
    onUrlsInputChange(joined);
  }

  return (
    <section
      data-batch-surface="primary"
      data-batch-mode="url"
      data-batch-stage={stage}
      className="mt-7 rounded-[2rem] border border-[var(--color-border)] bg-white p-6 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)]"
    >
      <div className="space-y-6">
        {showModeSwitch ? <BatchModeSwitch mode={mode} onModeChange={onModeChange} /> : null}

        {stage === 'setup' ? (
          <>
            <div className="space-y-4">
              <label htmlFor="batch-urls" className="sr-only">
                Paste URLs
              </label>
              <textarea
                id="batch-urls"
                value={urlsInput}
                onChange={(event) => onUrlsInputChange(event.target.value)}
                placeholder="Paste URLs"
                rows={8}
                className="w-full rounded-[1.75rem] border border-[var(--color-border)] bg-white px-5 py-4 text-base leading-7 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)]"
              />

              {tooManyUrls ? (
                <p className="text-sm font-medium text-red-700">
                  URL count exceeds the batch cap. Remove some links before starting.
                </p>
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
                  disabled={processing || parsedCount === 0 || tooManyUrls}
                  className="h-12 rounded-2xl bg-[var(--color-accent)] px-6 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? 'Processing Batch...' : 'Start Batch'}
                </button>

                <button
                  type="button"
                  aria-expanded={showMoreOptions ? 'true' : 'false'}
                  aria-controls="batch-url-more-options"
                  onClick={() => setShowMoreOptions((current) => !current)}
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-5 text-base font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  More options
                </button>
              </div>

              <div
                id="batch-url-more-options"
                data-batch-more-options
                data-batch-more-options-open={showMoreOptions ? 'true' : 'false'}
                className={showMoreOptions ? 'block' : 'hidden'}
              >
                <div className="grid gap-4 rounded-[1.75rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
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

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">Import</p>
                      <p className="text-sm text-[var(--color-muted)]">
                        Bring in a TXT, CSV, Markdown, or JSON list when the links are easier to gather outside the page.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      Import
                    </button>
                  </div>

                  <p className="text-sm text-[var(--color-muted)]">Limit {maxUrls.toLocaleString()} URLs</p>
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
            canDownload={(item) => item.status === 'success' && Boolean(item.extractionId || item.sourceUrl)}
            onDownloadAll={hasOutput ? onDownloadAll : null}
            downloadAllLabel={downloadingAll ? 'Downloading...' : `Download ${successCount.toLocaleString()}`}
            downloadAllDisabled={processing || downloadingAll || successCount === 0}
            onRetryFailed={failureCount > 0 ? onRetryFailed : null}
            retryLabel={retryingFailed ? 'Retrying...' : `Retry failed URLs (${failureCount.toLocaleString()})`}
            retryDisabled={processing || retryingFailed}
            rowTitle={(item) => item.title || item.outputFilename || item.url}
          />
        ) : null}

        {stage === 'running' && runMessage ? <p className="text-sm text-[var(--color-muted)]">{runMessage}</p> : null}
      </div>
    </section>
  );
}
