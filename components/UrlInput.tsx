'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';

type UrlInputProps = {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: (urlValue?: string) => void;
  loading: boolean;
  subtitle: string;
  statusMessage?: string;
  progressLabel?: string;
  progressStep?: number;
  progressTotalSteps?: number;
  directFileUrl?: string;
  directFileFormat?: 'pdf' | 'txt' | 'md' | 'docx';
  directFileDownloading?: boolean;
  onDirectFileFormatChange?: (format: 'pdf' | 'txt' | 'md' | 'docx') => void;
  onDirectFileDownload?: () => void;
  proofContent?: ReactNode;
  secondaryContent?: ReactNode;
};

export function UrlInput({
  url,
  onUrlChange,
  onSubmit,
  loading,
  subtitle,
  statusMessage,
  progressLabel,
  progressStep = 0,
  progressTotalSteps = 3,
  directFileUrl,
  directFileFormat,
  directFileDownloading,
  onDirectFileFormatChange,
  onDirectFileDownload,
  proofContent,
  secondaryContent,
}: UrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function submitCurrentUrl(): void {
    const currentValue = inputRef.current?.value ?? url;
    onSubmit(currentValue);
  }

  const stageCount = Math.max(1, progressTotalSteps);
  const activeStage = Math.max(0, Math.min(progressStep + 1, stageCount));
  const stageWidth = `${(activeStage / stageCount) * 100}%`;

  return (
    <div data-homepage-hero="primary" className="cp-shell cp-enter flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl text-center">
        <h1 className="logo-mark text-6xl font-semibold text-[var(--color-ink)]">Oleriq</h1>
        <p className="mx-auto mt-2 max-w-2xl text-lg text-[var(--color-muted)]">{subtitle}</p>

        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center">
          <label htmlFor="url-input" className="sr-only">
            Article URL
          </label>
          <input
            id="url-input"
            ref={inputRef}
            type="url"
            inputMode="url"
            placeholder="https://example.com/article"
            autoComplete="off"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitCurrentUrl();
            }}
            className="h-16 w-full rounded-xl border border-[var(--color-border)] bg-white px-5 text-lg outline-none transition focus:border-[var(--color-accent)]"
          />

          <button
            type="button"
            onClick={submitCurrentUrl}
            disabled={loading}
            className="h-16 min-w-48 rounded-xl bg-[var(--color-accent)] px-8 text-base font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Converting...' : 'Convert URL'}
          </button>
        </div>

        {!loading && proofContent ? (
          <div className="mt-3 min-h-5 text-center">{proofContent}</div>
        ) : null}
        {!loading && secondaryContent ? (
          <div className="mt-3 text-left">{secondaryContent}</div>
        ) : null}

        <p className="mt-2 min-h-5 text-sm text-[var(--color-muted)]">
          {loading ? 'Converting page into a clean document...' : statusMessage || ''}
        </p>
        {loading ? (
          <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white/90 p-4 text-left">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-[var(--color-ink)]">Conversion progress</span>
              <span className="text-[var(--color-muted)]">{progressLabel || 'Connecting'}</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface)]"
              role="progressbar"
              aria-valuetext={progressLabel || 'Connecting'}
              aria-busy="true"
            >
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700 ease-out"
                style={{ width: stageWidth }}
              />
            </div>
          </div>
        ) : null}
        {directFileUrl ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-[var(--color-muted)]">Direct file detected</span>
            <select
              value={directFileFormat || 'md'}
              onChange={(event) =>
                onDirectFileFormatChange?.(event.target.value as 'pdf' | 'txt' | 'md' | 'docx')
              }
              className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-accent)]"
            >
              <option value="md">MD</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              type="button"
              onClick={() => onDirectFileDownload?.()}
              disabled={!!directFileDownloading}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {directFileDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
}
