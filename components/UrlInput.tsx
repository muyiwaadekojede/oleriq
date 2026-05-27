'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';

type UrlInputProps = {
  heroMode: 'url' | 'file';
  onHeroModeChange: (mode: 'url' | 'file') => void;
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
  showFileWorkspace?: boolean;
  fileWorkspace?: ReactNode;
  publicProof?: ReactNode;
  showAdvancedDisclosure?: boolean;
  onToggleAdvancedDisclosure?: () => void;
  advancedContent?: ReactNode;
};

export function UrlInput({
  heroMode,
  onHeroModeChange,
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
  showFileWorkspace = false,
  fileWorkspace,
  publicProof,
  showAdvancedDisclosure = false,
  onToggleAdvancedDisclosure,
  advancedContent,
}: UrlInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function submitCurrentUrl(): void {
    const currentValue = inputRef.current?.value ?? url;
    onSubmit(currentValue);
  }

  const stageCount = Math.max(1, progressTotalSteps);
  const activeStage = Math.max(0, Math.min(progressStep + 1, stageCount));
  const stageWidth = `${(activeStage / stageCount) * 100}%`;

  const showUrlMode = heroMode === 'url';
  const showFileMode = heroMode === 'file' && showFileWorkspace;

  return (
    <div
      data-homepage-hero="primary"
      data-homepage-active-mode={heroMode}
      className="cp-shell cp-enter flex min-h-screen items-start justify-center px-6 pb-12 pt-20 md:pt-24"
    >
      <div className="w-full max-w-4xl text-center">
        <h1 className="logo-mark text-6xl font-semibold text-[var(--color-ink)]">Oleriq</h1>
        <p
          className="mx-auto mt-4 max-w-[42ch] text-lg text-[var(--color-muted)]"
          style={{ textWrap: 'balance' }}
        >
          {subtitle}
        </p>

        <div data-homepage-mode-switch className="mt-8 flex justify-center">
          <div role="group" aria-label="Homepage mode switch" className="flex flex-wrap gap-2 rounded-full border border-[var(--color-border)] bg-white p-1">
            {(['url', 'file'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={heroMode === mode}
                onClick={() => onHeroModeChange(mode)}
                className={`h-11 rounded-full px-5 text-sm font-semibold transition ${
                  heroMode === mode
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-ink)] hover:text-[var(--color-accent)]'
                }`}
              >
                {mode === 'url' ? 'URL' : 'File'}
              </button>
            ))}
          </div>
        </div>

        <div data-homepage-active-surface={heroMode} className="mt-8">
          {showUrlMode ? (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
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
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
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
            </>
          ) : null}

          {fileWorkspace ? (
            <div
              aria-hidden={!showFileMode}
              className={showFileMode ? 'mx-auto max-w-3xl text-left' : 'hidden'}
            >
              {fileWorkspace}
            </div>
          ) : null}
        </div>

        {!loading && publicProof ? <div className="mt-3 text-center empty:hidden">{publicProof}</div> : null}

        {advancedContent ? (
          <div className="mx-auto mt-4 max-w-3xl">
            <div className="flex justify-center">
              <button
                type="button"
                aria-expanded={showAdvancedDisclosure ? 'true' : 'false'}
                onClick={() => onToggleAdvancedDisclosure?.()}
                className="text-sm font-medium text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
              >
                Advanced options
              </button>
            </div>
            {showAdvancedDisclosure ? (
              <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left">
                <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Use authenticated session</p>
                {advancedContent}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
