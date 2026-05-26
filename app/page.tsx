'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { AuthenticatedSessionManager } from '@/components/AuthenticatedSessionManager';
import { FailureModal } from '@/components/FailureModal';
import { HomepageFileWorkspace } from '@/components/HomepageFileWorkspace';
import { HomepagePublicProof } from '@/components/HomepagePublicProof';
import { ReadingPreview } from '@/components/ReadingPreview';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { UrlInput } from '@/components/UrlInput';
import { getClientSessionId, trackClientEvent } from '@/lib/clientAnalytics';
import { AUTH_SESSION_HEADER, FALLBACK_FORMAT_HEADER, SESSION_HEADER } from '@/lib/internalIdentifiers';
import { useAuthenticatedSessions } from '@/lib/useAuthenticatedSessions';
import type {
  ExportFormat,
  ExtractErrorCode,
  ExtractionPath,
  ExtractSuccessResponse,
  ImageMode,
  PageComplexitySignal,
  ReaderSettings,
} from '@/lib/types';

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
const HOME_PROGRESS_STAGES = ['Connecting', 'Reading page', 'Building document'] as const;

export default function Page() {
  const [heroMode, setHeroMode] = useState<'url' | 'file'>('url');
  const [clientSessionId, setClientSessionId] = useState('');
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [images, setImages] = useState<ImageMode>('on');
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<ExtractSuccessResponse | null>(null);
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [exporting, setExporting] = useState<Partial<Record<ExportFormat, boolean>>>({});
  const [inputStatusMessage, setInputStatusMessage] = useState('');
  const [directFileUrl, setDirectFileUrl] = useState('');
  const [directFileFormat, setDirectFileFormat] = useState<ExportFormat>('md');
  const [directFileDownloading, setDirectFileDownloading] = useState(false);
  const [progressStageIndex, setProgressStageIndex] = useState(0);
  const [showAuthDisclosure, setShowAuthDisclosure] = useState(false);

  const sessionIdRef = useRef<string>('');
  const authSessions = useAuthenticatedSessions(clientSessionId);

  useEffect(() => {
    setSettings((current) => ({ ...current, colorTheme: initialThemeFromSystem() }));

    sessionIdRef.current = getClientSessionId();
    setClientSessionId(sessionIdRef.current);
    void trackClientEvent({
      eventName: 'page_view',
      eventGroup: 'navigation',
      status: 'success',
      pagePath: '/',
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
      setProgressStageIndex((current) => (current + 1) % HOME_PROGRESS_STAGES.length);
    }, 1100);

    return () => window.clearInterval(intervalId);
  }, [extracting]);

  const transformedContent = useMemo(() => {
    if (!result) return '';
    return result.contentVariants[images] || result.content;
  }, [images, result]);

  function buildHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(sessionIdRef.current ? { [SESSION_HEADER]: sessionIdRef.current } : {}),
      ...(authSessions.selectedSessionId ? { [AUTH_SESSION_HEADER]: authSessions.selectedSessionId } : {}),
    };
  }

  function submitDirectFileDownloadViaFrame(sourceUrl: string, format: ExportFormat): void {
    const frameName = 'oleriq-direct-download-frame';
    let frame = document.querySelector(`iframe[name="${frameName}"]`) as HTMLIFrameElement | null;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.name = frameName;
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }
    const params = new URLSearchParams({
      url: sourceUrl,
      format,
    });
    if (sessionIdRef.current) {
      params.set('sessionId', sessionIdRef.current);
    }
    params.set('_', String(Date.now()));
    frame.src = `/api/direct-file?${params.toString()}`;
  }

  async function readErrorMessage(response: Response): Promise<string> {
    const raw = await response.text();
    if (!raw) return 'Direct file download failed.';
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('text/html') || /^\s*<!doctype html/i.test(raw) || /^\s*<html/i.test(raw)) {
      if (response.status >= 500) {
        return 'Server error while preparing this download. Retry, or switch to PDF.';
      }
      return `Download failed (${response.status}). Retry, or switch format.`;
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

  async function downloadDirectFile(
    sourceUrl: string,
    format: ExportFormat,
    allowFallback = true,
  ): Promise<void> {
    if (format === 'pdf') {
      setDirectFileDownloading(true);
      try {
        submitDirectFileDownloadViaFrame(sourceUrl, format);

        void trackClientEvent({
          eventName: 'direct_file_download_triggered',
          eventGroup: 'export',
          status: 'attempt',
          pagePath: '/',
          sourceUrl,
          exportFormat: format,
        });
      } finally {
        setTimeout(() => setDirectFileDownloading(false), 1200);
      }
      return;
    }

    setDirectFileDownloading(true);

    try {
      const response = await fetch('/api/direct-file', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          url: sourceUrl,
          format,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);

        if (allowFallback) {
          setInputStatusMessage('Selected format unavailable right now. Downloading original file instead...');
          await downloadDirectFile(sourceUrl, 'pdf', false);
          return;
        }

        throw new Error(message || 'Direct file download failed.');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const filename = match?.[1] || `direct-file.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      void trackClientEvent({
        eventName: 'direct_file_download_triggered',
        eventGroup: 'export',
        status: 'success',
        pagePath: '/',
        sourceUrl,
        exportFormat: format,
      });

      if (response.headers.get(FALLBACK_FORMAT_HEADER) === 'original') {
        setInputStatusMessage('Converted file unavailable. Downloaded original file instead.');
      }
    } finally {
      setDirectFileDownloading(false);
    }
  }

  async function handleExtract(urlValue?: string): Promise<void> {
    const targetUrl = (urlValue ?? url).trim();

    if (!targetUrl) {
      void trackClientEvent({
        eventName: 'extract_submit',
        eventGroup: 'extract',
        status: 'failure',
        pagePath: '/',
        errorCode: 'EMPTY_URL',
        errorMessage: 'User attempted extract without a URL.',
      });
      return;
    }

    void trackClientEvent({
      eventName: 'extract_submit',
      eventGroup: 'extract',
      status: 'attempt',
      pagePath: '/',
      attemptedUrl: targetUrl,
      metadata: {
        images,
      },
    });

    setExtracting(true);
    setFailure(null);
    setInputStatusMessage('');
    setDirectFileUrl('');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ url: targetUrl, images }),
      });

      const json = (await response.json()) as ExtractSuccessResponse | ExtractFailurePayload;

      if (!response.ok || !json.success) {
        const errorCode = ((json as ExtractFailurePayload).errorCode || 'EXTRACTION_FAILED') as ExtractErrorCode;
        if (errorCode === 'DIRECT_FILE_URL') {
          setDirectFileUrl(targetUrl);
          setDirectFileFormat('md');

          setFailure(null);
          setResult(null);
          setInputStatusMessage('Direct file detected. Downloading as MD...');
          try {
            await downloadDirectFile(targetUrl, 'md');
            setInputStatusMessage('Direct file downloaded. Choose another format if needed.');
          } catch (downloadError) {
            console.error(downloadError);
            setInputStatusMessage('Direct file download failed. Choose a format and retry.');
          }
          return;
        }

        void trackClientEvent({
          eventName: 'extract_result',
          eventGroup: 'extract',
          status: 'failure',
          pagePath: '/',
          attemptedUrl: targetUrl,
          errorCode,
          errorMessage: (json as ExtractFailurePayload).errorMessage,
        });

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

      void trackClientEvent({
        eventName: 'extract_result',
        eventGroup: 'extract',
        status: 'success',
        pagePath: '/',
        attemptedUrl: targetUrl,
        sourceUrl: json.sourceUrl,
        metadata: {
          title: json.title,
          siteName: json.siteName,
          wordCount: json.wordCount,
          imageCount: json.imageCount,
          resultState: json.resultState,
          extractionPath: json.extractionPath,
          warningCount: json.warnings.length,
        },
      });

      setResult(json);
      setInputStatusMessage('');
      setDirectFileUrl('');
    } catch (error) {
      void trackClientEvent({
        eventName: 'extract_result',
        eventGroup: 'extract',
        status: 'failure',
        pagePath: '/',
        attemptedUrl: targetUrl,
        errorCode: 'CLIENT_REQUEST_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Client extraction request failed.',
      });
      console.error(error);
      setFailure({ errorCode: 'EXTRACTION_FAILED', url: targetUrl });
      setResult(null);
      setDirectFileUrl('');
    } finally {
      setExtracting(false);
    }
  }

  async function handleDirectFileDownload(): Promise<void> {
    if (!directFileUrl) return;

    try {
      if (directFileFormat === 'pdf') {
        setInputStatusMessage('Starting PDF download...');
      } else {
        setInputStatusMessage('');
      }
      await downloadDirectFile(directFileUrl, directFileFormat);
      if (directFileFormat === 'pdf') {
        setInputStatusMessage('PDF download requested. Check your browser downloads tray.');
      }
    } catch (error) {
      console.error(error);
      setInputStatusMessage(
        error instanceof Error ? error.message : 'Direct file download failed. Try another format.',
      );
    }
  }

  async function handleExport(format: ExportFormat): Promise<void> {
    if (!result) return;

    void trackClientEvent({
      eventName: 'export_submit',
      eventGroup: 'export',
      status: 'attempt',
      pagePath: '/',
      sourceUrl: result.sourceUrl,
      exportFormat: format,
      metadata: {
        title: result.title,
      },
    });

    setExporting((current) => ({ ...current, [format]: true }));

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: buildHeaders(),
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
      const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const filename = match?.[1] || `Oleriq-export.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      void trackClientEvent({
        eventName: 'export_result',
        eventGroup: 'export',
        status: 'success',
        pagePath: '/',
        sourceUrl: result.sourceUrl,
        exportFormat: format,
        metadata: {
          filename,
        },
      });
    } catch (error) {
      void trackClientEvent({
        eventName: 'export_result',
        eventGroup: 'export',
        status: 'failure',
        pagePath: '/',
        sourceUrl: result.sourceUrl,
        exportFormat: format,
        errorCode: 'CLIENT_EXPORT_ERROR',
        errorMessage: error instanceof Error ? error.message : `Export failed (${format}).`,
      });
      console.error(error);
    } finally {
      setExporting((current) => ({ ...current, [format]: false }));
    }
  }

  function handleImagesChange(value: ImageMode): void {
    setImages(value);
    void trackClientEvent({
      eventName: 'image_mode_changed',
      eventGroup: 'settings',
      status: 'success',
      pagePath: '/',
      metadata: {
        value,
      },
    });
  }

  function handleSettingsChange(next: ReaderSettings): void {
    const changed: Partial<Record<keyof ReaderSettings, { from: string | number; to: string | number }>> = {};

    for (const key of Object.keys(next) as Array<keyof ReaderSettings>) {
      if (settings[key] !== next[key]) {
        changed[key] = {
          from: settings[key],
          to: next[key],
        };
      }
    }

    setSettings(next);

    if (Object.keys(changed).length > 0) {
      void trackClientEvent({
        eventName: 'reader_settings_changed',
        eventGroup: 'settings',
        status: 'success',
        pagePath: '/',
        metadata: changed,
      });
    }
  }

  function resetState(): void {
    setResult(null);
    setFailure(null);
    setInputStatusMessage('');
    setDirectFileUrl('');
    setDirectFileFormat('md');
    setUrl('');
    setImages('on');
    setSettings((current) => ({ ...DEFAULT_SETTINGS, colorTheme: current.colorTheme }));

    void trackClientEvent({
      eventName: 'new_url_clicked',
      eventGroup: 'navigation',
      status: 'success',
      pagePath: '/',
    });
  }

  return (
    <>
      {!result ? (
        <div className="relative">
          <UrlInput
            heroMode={heroMode}
            onHeroModeChange={(mode) => {
              if (mode === 'file') {
                setHeroMode('file');
              } else {
                setHeroMode('url');
              }
            }}
            url={url}
            onUrlChange={(nextUrl) => {
              setUrl(nextUrl);
              if (directFileUrl) {
                setDirectFileUrl('');
                setDirectFileFormat('md');
                setInputStatusMessage('');
              }
            }}
            onSubmit={(submittedUrl) => void handleExtract(submittedUrl)}
            loading={extracting}
            subtitle="Turn any URL or file into a clean, readable document in Markdown, TXT, DOCX, or PDF."
            statusMessage={inputStatusMessage}
            progressLabel={HOME_PROGRESS_STAGES[progressStageIndex]}
            progressStep={progressStageIndex}
            progressTotalSteps={HOME_PROGRESS_STAGES.length}
            directFileUrl={directFileUrl}
            directFileFormat={directFileFormat}
            directFileDownloading={directFileDownloading}
            onDirectFileFormatChange={(format) => setDirectFileFormat(format)}
            onDirectFileDownload={() => void handleDirectFileDownload()}
            showFileWorkspace={heroMode === 'file'}
            fileWorkspace={<HomepageFileWorkspace sessionId={clientSessionId} compactLayout={true} />}
            publicProof={<HomepagePublicProof />}
            showAdvancedDisclosure={showAuthDisclosure}
            onToggleAdvancedDisclosure={() => setShowAuthDisclosure((current) => !current)}
            advancedContent={
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
                compact={true}
              />
            }
          />
        </div>
      ) : (
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
            onImagesChange={handleImagesChange}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onExport={(format) => void handleExport(format)}
            exporting={exporting}
            onNewUrl={resetState}
          />

          <main className="flex-1 overflow-hidden pb-20 md:h-screen md:pb-0">
            <ReadingPreview content={transformedContent} settings={settings} />
          </main>
        </div>
      )}

      {failure ? (
        <FailureModal
          open={true}
          errorCode={failure.errorCode}
          failedUrl={failure.url}
          attemptedExtractionPath={failure.attemptedExtractionPath}
          browserAttempted={failure.browserAttempted}
          pageComplexitySignal={failure.pageComplexitySignal}
          sessionId={sessionIdRef.current}
          onSubmitted={() => {
            void trackClientEvent({
              eventName: 'feedback_form_submitted',
              eventGroup: 'feedback',
              status: 'success',
              pagePath: '/',
              attemptedUrl: failure.url,
              errorCode: failure.errorCode,
            });
          }}
          onClose={() => setFailure(null)}
        />
      ) : null}
    </>
  );
}
