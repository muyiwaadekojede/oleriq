import type { ExtractErrorCode } from '@/lib/types';

const EXTRACT_ERROR_GUIDANCE: Record<ExtractErrorCode, string> = {
  FETCH_FAILED: 'Retry with the article URL itself, confirm the page loads publicly, and try again after a short wait if the site is blocking automated requests.',
  EXTRACTION_FAILED: 'Retry with the exact article page instead of a homepage or listing page. If it still fails, use the feedback form so we can inspect that layout.',
  PAYWALL_DETECTED: 'Open a publicly accessible version of the article, then retry. Clearpage cannot extract content that requires a login or subscription.',
  EMPTY_CONTENT: 'Retry with a more specific article URL. Pages with only embeds, navigation, or heavy scripts often return empty readable text.',
  TIMEOUT: 'Retry once, then switch to a lighter page or wait for the site to respond faster. Slow or script-heavy pages can time out before extraction finishes.',
  DIRECT_FILE_URL: 'Use direct download for this file link, or switch to the batch documents flow if you want to convert uploaded files instead.',
};

const BATCH_ERROR_GUIDANCE: Record<string, string> = {
  DOCUMENT_CONVERSION_FAILED: 'Retry the file, or switch output format if the original structure is not converting cleanly.',
};

export function nextStepGuidanceForErrorCode(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode in EXTRACT_ERROR_GUIDANCE) {
    return EXTRACT_ERROR_GUIDANCE[errorCode as ExtractErrorCode];
  }

  return BATCH_ERROR_GUIDANCE[errorCode] || null;
}

export function extractionPathLabel(path: string): string {
  if (path === 'browser_fallback') return 'Browser fallback';
  if (path === 'rsc_fallback') return 'RSC fallback';
  if (path === 'syndication_fallback') return 'Syndication fallback';
  return 'Readability';
}
