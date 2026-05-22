'use client';

import type { CSSProperties } from 'react';

import { ExportButton } from '@/components/ExportButton';
import { ImageToggle } from '@/components/ImageToggle';
import {
  diagnosticReasonLabel,
  extractionPathLabel,
  nextStepGuidanceForDiagnosticReason,
  pageComplexitySignalLabel,
  resultTrustLabel,
  warningForDiagnosticReason,
} from '@/lib/trustGuidance';
import type {
  BatchDiagnosticReason,
  ExportFormat,
  ExtractResultState,
  ExtractionPath,
  ImageMode,
  PageComplexitySignal,
  ReaderSettings,
} from '@/lib/types';

type SettingsSidebarProps = {
  title: string;
  byline: string;
  siteName: string;
  publishedTime: string;
  wordCount: number;
  imageCount: number;
  exportDiagnosticReasonsByFormat: Partial<Record<ExportFormat, BatchDiagnosticReason[]>>;
  resultState: ExtractResultState;
  extractionPath: ExtractionPath;
  browserAttempted: boolean;
  pageComplexitySignal: PageComplexitySignal;
  diagnosticReasons: BatchDiagnosticReason[];
  warnings: string[];
  images: ImageMode;
  onImagesChange: (value: ImageMode) => void;
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  onExport: (format: ExportFormat) => void;
  exporting: Partial<Record<ExportFormat, boolean>>;
  onNewUrl: () => void;
};

export function SettingsSidebar({
  title,
  byline,
  siteName,
  publishedTime,
  wordCount,
  imageCount,
  exportDiagnosticReasonsByFormat,
  resultState,
  extractionPath,
  browserAttempted,
  pageComplexitySignal,
  diagnosticReasons,
  warnings,
  images,
  onImagesChange,
  settings,
  onSettingsChange,
  onExport,
  exporting,
  onNewUrl,
}: SettingsSidebarProps) {
  function updateSetting<Key extends keyof ReaderSettings>(key: Key, value: ReaderSettings[Key]): void {
    onSettingsChange({ ...settings, [key]: value });
  }

  return (
    <aside
      className={`theme-${settings.colorTheme} bg-[var(--preview-bg)] md:sticky md:top-0 md:h-screen md:w-[320px] md:flex-shrink-0`}
    >
      <div className="hidden h-screen overflow-y-auto border-r border-[var(--preview-border)] p-4 md:block">
        <SidebarBody
          title={title}
          byline={byline}
          siteName={siteName}
          publishedTime={publishedTime}
          wordCount={wordCount}
          imageCount={imageCount}
          exportDiagnosticReasonsByFormat={exportDiagnosticReasonsByFormat}
          resultState={resultState}
          extractionPath={extractionPath}
          browserAttempted={browserAttempted}
          pageComplexitySignal={pageComplexitySignal}
          diagnosticReasons={diagnosticReasons}
          warnings={warnings}
          images={images}
          onImagesChange={onImagesChange}
          settings={settings}
          updateSetting={updateSetting}
          onExport={onExport}
          exporting={exporting}
          onNewUrl={onNewUrl}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 block border-t border-[var(--preview-border)] bg-[var(--preview-panel)] p-3 md:hidden">
        <details>
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--preview-text)]">
            Settings & Export
          </summary>
          <div className="mt-3 max-h-[70vh] overflow-y-auto pr-1">
            <SidebarBody
              title={title}
              byline={byline}
              siteName={siteName}
              publishedTime={publishedTime}
              wordCount={wordCount}
              imageCount={imageCount}
              exportDiagnosticReasonsByFormat={exportDiagnosticReasonsByFormat}
              resultState={resultState}
              extractionPath={extractionPath}
              browserAttempted={browserAttempted}
              pageComplexitySignal={pageComplexitySignal}
              diagnosticReasons={diagnosticReasons}
              warnings={warnings}
              images={images}
              onImagesChange={onImagesChange}
              settings={settings}
              updateSetting={updateSetting}
              onExport={onExport}
              exporting={exporting}
              onNewUrl={onNewUrl}
            />
          </div>
        </details>
      </div>
    </aside>
  );
}

type SidebarBodyProps = {
  title: string;
  byline: string;
  siteName: string;
  publishedTime: string;
  wordCount: number;
  imageCount: number;
  exportDiagnosticReasonsByFormat: Partial<Record<ExportFormat, BatchDiagnosticReason[]>>;
  resultState: ExtractResultState;
  extractionPath: ExtractionPath;
  browserAttempted: boolean;
  pageComplexitySignal: PageComplexitySignal;
  diagnosticReasons: BatchDiagnosticReason[];
  warnings: string[];
  images: ImageMode;
  onImagesChange: (value: ImageMode) => void;
  settings: ReaderSettings;
  updateSetting: <Key extends keyof ReaderSettings>(key: Key, value: ReaderSettings[Key]) => void;
  onExport: (format: ExportFormat) => void;
  exporting: Partial<Record<ExportFormat, boolean>>;
  onNewUrl: () => void;
};

function SidebarBody({
  title,
  byline,
  siteName,
  publishedTime,
  wordCount,
  imageCount,
  exportDiagnosticReasonsByFormat,
  resultState,
  extractionPath,
  browserAttempted,
  pageComplexitySignal,
  diagnosticReasons,
  warnings,
  images,
  onImagesChange,
  settings,
  updateSetting,
  onExport,
  exporting,
  onNewUrl,
}: SidebarBodyProps) {
  const txtReasons = [...(exportDiagnosticReasonsByFormat.txt || [])];
  if (images === 'on' && imageCount > 0 && !txtReasons.includes('document_txt_images_downgraded_to_captions')) {
    txtReasons.push('document_txt_images_downgraded_to_captions');
  }

  const exportNotes = [
    { format: 'TXT', reasons: txtReasons },
    { format: 'Markdown', reasons: [...(exportDiagnosticReasonsByFormat.md || [])] },
  ]
    .map((entry) => ({
      ...entry,
      notes: Array.from(
        new Set(
          entry.reasons.map((reason) => warningForDiagnosticReason(reason) || diagnosticReasonLabel(reason)),
        ),
      ),
    }))
    .filter((entry) => entry.notes.length > 0);

  const nextSteps = Array.from(
    new Set(
      diagnosticReasons
        .map((reason) => nextStepGuidanceForDiagnosticReason(reason))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return (
    <div className="space-y-5 pb-4 text-[var(--preview-text)]">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Article</h2>
        <dl className="space-y-1 text-sm text-[var(--preview-muted)]">
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Title</dt>
            <dd className="break-words">{title}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Author</dt>
            <dd>{byline || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Site</dt>
            <dd>{siteName || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Published</dt>
            <dd>{publishedTime || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Words</dt>
            <dd>{wordCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--preview-text)]">Images</dt>
            <dd>
              {imageCount}
              {imageCount === 0 ? ' (No images found in this article)' : ''}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Result trust</h3>
        <div className="rounded-xl border border-[var(--preview-border)] bg-[var(--preview-panel)] p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-[var(--preview-text)]">
              {resultTrustLabel(resultState, diagnosticReasons)}
            </span>
            <span className="text-[var(--preview-muted)]">{extractionPathLabel(extractionPath)}</span>
          </div>
          {pageComplexitySignal === 'dynamic_page_likely' || browserAttempted ? (
            <div className="mt-2 space-y-1 text-[var(--preview-muted)]">
              {pageComplexitySignal === 'dynamic_page_likely' ? (
                <p>Page signal: {pageComplexitySignalLabel(pageComplexitySignal)}</p>
              ) : null}
              {browserAttempted ? <p>Browser attempted</p> : null}
            </div>
          ) : null}
          {diagnosticReasons.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[var(--preview-text)]">
              {diagnosticReasons.map((reason) => (
                <li key={reason}>{diagnosticReasonLabel(reason)}</li>
              ))}
            </ul>
          ) : null}
          {warnings.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[var(--preview-muted)]">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[var(--preview-muted)]">Clean output with no current warning signs.</p>
          )}
          {nextSteps.length > 0 ? (
            <div className="mt-3 border-t border-[var(--preview-border)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--preview-muted)]">Next step</p>
              <ul className="mt-1 space-y-1 text-[var(--preview-muted)]">
                {nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Images</h3>
        <ImageToggle value={images} onChange={onImagesChange} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Font Face</h3>
        <select
          value={settings.fontFace}
          onChange={(event) => updateSetting('fontFace', event.target.value as ReaderSettings['fontFace'])}
          className="w-full rounded-lg border border-[var(--preview-border)] bg-[var(--preview-panel)] px-3 py-2 text-sm"
        >
          <option value="serif">Serif</option>
          <option value="sans-serif">Sans-serif</option>
          <option value="monospace">Monospace</option>
          <option value="dyslexic">Dyslexic</option>
        </select>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Font Size ({settings.fontSize}px)</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={12}
            max={28}
            step={1}
            value={settings.fontSize}
            onChange={(event) => updateSetting('fontSize', Number(event.target.value))}
            className="w-full"
          />
          <button
            type="button"
            onClick={() => updateSetting('fontSize', 16)}
            className="rounded-md border border-[var(--preview-border)] px-2 py-1 text-xs"
          >
            Reset
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Line Spacing ({settings.lineSpacing.toFixed(1)})</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1.2}
            max={2.4}
            step={0.1}
            value={settings.lineSpacing}
            onChange={(event) => updateSetting('lineSpacing', Number(event.target.value))}
            className="w-full"
          />
          <button
            type="button"
            onClick={() => updateSetting('lineSpacing', 1.6)}
            className="rounded-md border border-[var(--preview-border)] px-2 py-1 text-xs"
          >
            Reset
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Color Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          <ThemeSwatch
            label="Light"
            active={settings.colorTheme === 'light'}
            style={{ background: '#faf9f6' }}
            onClick={() => updateSetting('colorTheme', 'light')}
          />
          <ThemeSwatch
            label="Dark"
            active={settings.colorTheme === 'dark'}
            style={{ background: '#141b23' }}
            onClick={() => updateSetting('colorTheme', 'dark')}
          />
          <ThemeSwatch
            label="Sepia"
            active={settings.colorTheme === 'sepia'}
            style={{ background: '#f8eedb' }}
            onClick={() => updateSetting('colorTheme', 'sepia')}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Export</h3>
        <div className="space-y-2">
          <ExportButton label="Download PDF" onClick={() => onExport('pdf')} loading={!!exporting.pdf} />
          <ExportButton label="Download TXT" onClick={() => onExport('txt')} loading={!!exporting.txt} />
          <ExportButton label="Download Markdown" onClick={() => onExport('md')} loading={!!exporting.md} />
          <ExportButton label="Download DOCX" onClick={() => onExport('docx')} loading={!!exporting.docx} />
        </div>
        {exportNotes.length > 0 ? (
          <div className="mt-3 rounded-lg border border-[var(--preview-border)] bg-[var(--preview-panel)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--preview-muted)]">Format notes</p>
            <ul className="mt-2 space-y-2 text-xs text-[var(--preview-muted)]">
              {exportNotes.map((entry) => (
                <li key={entry.format}>
                  <span className="font-semibold text-[var(--preview-text)]">{entry.format}</span>
                  {': '}
                  {entry.notes.join(' ')}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <button
        type="button"
        onClick={onNewUrl}
        className="w-full rounded-lg border border-[var(--preview-border)] px-3 py-2 text-sm font-semibold text-[var(--preview-text)]"
      >
        New URL
      </button>
    </div>
  );
}

function ThemeSwatch({
  label,
  active,
  style,
  onClick,
}: {
  label: string;
  active: boolean;
  style: CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-2 text-xs font-medium ${
        active ? 'border-[var(--color-accent)]' : 'border-[var(--preview-border)]'
      }`}
      style={style}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
