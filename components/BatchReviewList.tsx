'use client';

import { useEffect, useMemo, useState } from 'react';

import type { BatchItemResult } from '@/components/batchTypes';
import {
  diagnosticReasonLabel,
  hasPartialOutputReasons,
  nextStepGuidanceForDiagnosticReason,
  nextStepGuidanceForErrorCode,
  resultTrustLabel,
} from '@/lib/trustGuidance';

type BatchReviewListProps = {
  results: BatchItemResult[];
  usableCount: number;
  partialCount: number;
  degradedCount: number;
  failureCount: number;
  runMessage: string;
  processing: boolean;
  onDownloadOne: (item: BatchItemResult) => void;
  canDownload: (item: BatchItemResult) => boolean;
  onDownloadAll?: (() => void) | null;
  downloadAllLabel?: string;
  downloadAllDisabled?: boolean;
  onRetryFailed?: (() => void) | null;
  retryLabel?: string;
  retryDisabled?: boolean;
  rowTitle: (item: BatchItemResult) => string;
};

type RowStatus = 'failed' | 'partial' | 'degraded' | 'usable';

function rowStatus(item: BatchItemResult): RowStatus {
  if (item.status === 'failure') return 'failed';
  if (item.qualityState === 'partial') return 'partial';
  if (item.qualityState === 'degraded') {
    return hasPartialOutputReasons(item.diagnosticReasons || []) ? 'partial' : 'degraded';
  }
  return 'usable';
}

function rowKey(item: BatchItemResult): string {
  if (typeof item.id === 'number') return `row-${item.id}`;
  if (item.outputObjectKey) return `output-${item.outputObjectKey}`;
  if (item.extractionId) return `extract-${item.extractionId}`;
  return `source-${item.url}`;
}

function rowStatusTone(status: RowStatus): string {
  if (status === 'usable') return 'border-[var(--color-accent)] text-[var(--color-accent)]';
  if (status === 'failed') return 'border-red-300 text-red-700';
  return 'border-amber-300 text-amber-700';
}

function detailSourceHref(item: BatchItemResult): string | null {
  if (!item.sourceUrl) return null;
  if (!/^https?:\/\//i.test(item.sourceUrl)) return null;
  if (item.sourceUrl === item.url) return null;
  return item.sourceUrl;
}

export function BatchReviewList({
  results,
  usableCount,
  partialCount,
  degradedCount,
  failureCount,
  runMessage,
  processing,
  onDownloadOne,
  canDownload,
  onDownloadAll,
  downloadAllLabel,
  downloadAllDisabled = false,
  onRetryFailed,
  retryLabel,
  retryDisabled = false,
  rowTitle,
}: BatchReviewListProps) {
  const [showCleanRows, setShowCleanRows] = useState(false);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const settledRows = useMemo(
    () => results.filter((item) => item.status === 'success' || item.status === 'failure'),
    [results],
  );

  const orderedRows = useMemo(() => {
    const severityRank: Record<RowStatus, number> = {
      failed: 0,
      partial: 1,
      degraded: 2,
      usable: 3,
    };

    return settledRows
      .map((item, index) => ({
        item,
        index,
        status: rowStatus(item),
      }))
      .sort((left, right) => {
        const severityGap = severityRank[left.status] - severityRank[right.status];
        if (severityGap !== 0) return severityGap;
        return left.index - right.index;
      });
  }, [settledRows]);

  const visibleRows = useMemo(
    () => (showCleanRows ? orderedRows : orderedRows.filter((entry) => entry.status !== 'usable')),
    [orderedRows, showCleanRows],
  );

  useEffect(() => {
    if (!expandedRowKey) return;
    if (visibleRows.some((entry) => rowKey(entry.item) === expandedRowKey)) return;
    setExpandedRowKey(null);
  }, [expandedRowKey, visibleRows]);

  const showCleanRowsLabel =
    usableCount > 0 && !showCleanRows
      ? `Show clean rows (${usableCount.toLocaleString()})`
      : 'Hide clean rows';

  return (
    <section
      data-batch-review-list
      data-batch-show-clean={showCleanRows ? 'true' : 'false'}
      className="mt-6 space-y-4 border-t border-[var(--color-border)] pt-6"
    >
      <div className="space-y-3">
        <div
          data-batch-review-summary
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--color-ink)]"
        >
          <span>{usableCount.toLocaleString()} usable</span>
          <span>{partialCount.toLocaleString()} partial</span>
          <span>{degradedCount.toLocaleString()} degraded</span>
          <span>{failureCount.toLocaleString()} failed</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {usableCount > 0 ? (
            <button
              type="button"
              data-batch-clean-toggle
              onClick={() => setShowCleanRows((current) => !current)}
              className="rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {showCleanRowsLabel}
            </button>
          ) : null}
          {onRetryFailed && failureCount > 0 ? (
            <button
              type="button"
              onClick={onRetryFailed}
              disabled={retryDisabled}
              className="rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryLabel || `Retry failed (${failureCount.toLocaleString()})`}
            </button>
          ) : null}
          {onDownloadAll && usableCount + partialCount + degradedCount > 0 ? (
            <button
              type="button"
              onClick={onDownloadAll}
              disabled={downloadAllDisabled}
              className="rounded-full border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadAllLabel || 'Download all'}
            </button>
          ) : null}
        </div>

        {runMessage ? (
          <p className="text-sm text-[var(--color-muted)]">
            {processing ? runMessage : runMessage.replace(/^Completed in /i, 'Finished in ')}
          </p>
        ) : null}
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-muted)]">
          This run came back clean. Open the clean rows only if you want to inspect individual outputs.
        </div>
      ) : null}

      <div className="space-y-3">
        {visibleRows.map(({ item, status }) => {
          const key = rowKey(item);
          const expanded = expandedRowKey === key;
          const uniqueGuidance = Array.from(
            new Set(
              (item.diagnosticReasons || [])
                .map((reason) => nextStepGuidanceForDiagnosticReason(reason))
                .filter((value): value is string => Boolean(value)),
            ),
          );
          const sourceHref = detailSourceHref(item);

          return (
            <article
              key={key}
              data-batch-row
              data-batch-row-status={status}
              data-batch-row-expanded={expanded ? 'true' : 'false'}
              className="rounded-3xl border border-[var(--color-border)] bg-white px-5 py-4"
            >
              <button
                type="button"
                onClick={() => setExpandedRowKey((current) => (current === key ? null : key))}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <span data-batch-row-title className="min-w-0 flex-1 text-xl font-semibold text-[var(--color-ink)]">
                  {rowTitle(item)}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${rowStatusTone(status)}`}
                  >
                    {status}
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">{expanded ? 'Collapse' : 'Expand'}</span>
                </span>
              </button>

              {expanded ? (
                <div className="mt-4 space-y-4 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-ink)]">
                  {item.diagnosticReasons?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {item.diagnosticReasons.map((reason) => (
                        <span
                          key={`${key}-${reason}`}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]"
                        >
                          {diagnosticReasonLabel(reason)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {item.status === 'success' && item.warnings?.length ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {resultTrustLabel(item.qualityState || 'usable', item.diagnosticReasons || [])}
                      </p>
                      {item.warnings.map((warning) => (
                        <p key={`${key}-${warning}`} className="text-[var(--color-muted)]">
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {item.status === 'failure' ? (
                    <div className="space-y-2 text-red-700">
                      <p className="break-words">
                        {item.errorCode || 'EXTRACTION_FAILED'}: {item.errorMessage || 'No usable converted file came back from this row.'}
                      </p>
                    </div>
                  ) : null}

                  {uniqueGuidance.length > 0 ? (
                    <div className="space-y-2 border-l-2 border-[var(--color-accent)] pl-4 text-[var(--color-ink)]">
                      {uniqueGuidance.map((guidance) => (
                        <p key={`${key}-${guidance}`}>Next step: {guidance}</p>
                      ))}
                    </div>
                  ) : null}

                  {item.status === 'failure' && nextStepGuidanceForErrorCode(item.errorCode) ? (
                    <div className="space-y-2 border-l-2 border-[var(--color-accent)] pl-4 text-[var(--color-ink)]">
                      <p>Next step: {nextStepGuidanceForErrorCode(item.errorCode)}</p>
                    </div>
                  ) : null}

                  {item.processingLane || item.pageCount || item.attemptCount ? (
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                      {item.processingLane ? (
                        <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                          lane: {item.processingLane.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                      {typeof item.pageCount === 'number' ? (
                        <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                          {item.pageCount.toLocaleString()} pages
                        </span>
                      ) : null}
                      {typeof item.attemptCount === 'number' && item.attemptCount > 0 ? (
                        <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                          attempts: {item.attemptCount.toLocaleString()}
                        </span>
                      ) : null}
                      {item.escalated ? (
                        <span className="rounded-full border border-[var(--color-border)] px-3 py-1">
                          escalated
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {canDownload(item) ? (
                      <button
                        type="button"
                        onClick={() => onDownloadOne(item)}
                        className="rounded-full border border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        Download
                      </button>
                    ) : null}
                    {sourceHref ? (
                      <a
                        href={sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                      >
                        View source
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
