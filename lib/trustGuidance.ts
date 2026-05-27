import type { BatchDiagnosticReason, ExtractErrorCode, ExtractResultState, ExtractionPath, PageComplexitySignal } from '@/lib/types';

const EXTRACT_ERROR_GUIDANCE: Record<ExtractErrorCode, string> = {
  FETCH_FAILED: 'Retry with the article URL itself, confirm the page loads publicly, and try again after a short wait if the site is blocking automated requests.',
  EXTRACTION_FAILED: 'Retry with the exact article page instead of a homepage or listing page. If it still fails, use the feedback form so we can inspect that layout.',
  AUTH_SESSION_INVALID: 'If you already have access to this page in your own browser, open Pages behind login and import a fresh session file. Otherwise use a public version of the page.',
  AUTH_SESSION_EXPIRED: 'If you already have access to this page in your own browser, open Pages behind login and import the session file again. Otherwise use a public version of the page.',
  AUTH_SESSION_DOMAIN_MISMATCH: 'If you already have access to this page in your own browser, open Pages behind login and use a session file from the same site. Otherwise use a public version of the page.',
  AUTH_SESSION_NOT_FOUND: 'If you already have access to this page in your own browser, open Pages behind login and select or import the session file again. Otherwise use a public version of the page.',
  PAYWALL_DETECTED: 'Use a public version of the page if one exists. If you already have access in your own browser, try the separate Pages behind login tool.',
  EMPTY_CONTENT: 'Retry with a more specific article URL. Pages with only embeds, navigation, or heavy scripts often return empty readable text.',
  TIMEOUT: 'Retry once, then switch to a lighter page or wait for the site to respond faster. Slow or script-heavy pages can time out before extraction finishes.',
  DIRECT_FILE_URL: 'Use direct download for this file link, or switch to the batch documents flow if you want to convert uploaded files instead.',
};

const BATCH_ERROR_GUIDANCE: Record<string, string> = {
  DOCUMENT_CONVERSION_FAILED: 'Retry the file, or switch output format if the original structure is not converting cleanly.',
};

const DIAGNOSTIC_REASON_LABELS: Record<BatchDiagnosticReason, string> = {
  extract_authenticated_session_used: 'Protected page access used',
  extract_browser_fallback_used: 'Browser rendering required',
  extract_rsc_fallback_used: 'Recovered from page data',
  extract_rsc_structure_flattened: 'Some structure may come back flatter',
  extract_syndication_fallback_used: 'Recovered from a syndicated copy',
  extract_empty_content: 'No readable text found',
  document_pdf_truncated_pages: 'Only part of the PDF was converted',
  structure_heading_loss_risk: 'Heading levels may flatten',
  structure_table_loss_risk: 'Tables may lose shape',
  structure_list_loss_risk: 'Nested lists may flatten',
  structure_code_block_loss_risk: 'Code blocks may lose spacing',
  document_txt_images_downgraded_to_captions: 'Images become captions in TXT',
};

const DIAGNOSTIC_REASON_GUIDANCE: Partial<Record<BatchDiagnosticReason, string>> = {
  extract_browser_fallback_used: 'Check tables, embeds, and layout before you export.',
  extract_authenticated_session_used: 'This output came from a protected page path instead of the normal public path.',
  extract_rsc_structure_flattened: 'Check headings, tables, and code blocks before you download.',
  extract_syndication_fallback_used: 'Compare this export with the live page if full coverage matters.',
  document_pdf_truncated_pages: 'Split the PDF if pages beyond this first section matter.',
  structure_heading_loss_risk: 'Use Markdown, PDF, or DOCX if heading structure matters.',
  structure_table_loss_risk: 'Use PDF or DOCX if table shape matters.',
  structure_list_loss_risk: 'Use Markdown, PDF, or DOCX if nested list structure matters.',
  structure_code_block_loss_risk: 'Use Markdown, PDF, or DOCX if code spacing matters.',
  document_txt_images_downgraded_to_captions: 'Use PDF or DOCX if embedded images matter.',
};

const DIAGNOSTIC_REASON_WARNINGS: Partial<Record<BatchDiagnosticReason, string>> = {
  extract_rsc_fallback_used: 'This was rebuilt from page data instead of a clean article body.',
  extract_syndication_fallback_used: 'This came from a syndicated copy instead of the live page body.',
  document_pdf_truncated_pages: 'Only part of this PDF was converted in this run.',
  document_txt_images_downgraded_to_captions: 'Images become captions instead of embedded images in TXT output.',
  structure_heading_loss_risk: 'This can look finished while deeper heading levels flatten.',
  structure_table_loss_risk: 'This can look finished while tables lose shape.',
  structure_list_loss_risk: 'This can look finished while nested lists flatten.',
  structure_code_block_loss_risk: 'This can look finished while code spacing is reduced.',
};

const INFORMATIONAL_REASONS = new Set<BatchDiagnosticReason>(['extract_authenticated_session_used']);

export function nextStepGuidanceForErrorCode(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode in EXTRACT_ERROR_GUIDANCE) {
    return EXTRACT_ERROR_GUIDANCE[errorCode as ExtractErrorCode];
  }

  return BATCH_ERROR_GUIDANCE[errorCode] || null;
}

export function diagnosticReasonLabel(reason: BatchDiagnosticReason): string {
  return DIAGNOSTIC_REASON_LABELS[reason];
}

export function nextStepGuidanceForDiagnosticReason(reason: BatchDiagnosticReason): string | null {
  return DIAGNOSTIC_REASON_GUIDANCE[reason] || null;
}

export function warningForDiagnosticReason(reason: BatchDiagnosticReason): string | null {
  return DIAGNOSTIC_REASON_WARNINGS[reason] || null;
}

const PARTIAL_OUTPUT_REASONS = new Set<BatchDiagnosticReason>([
  'extract_rsc_fallback_used',
  'extract_syndication_fallback_used',
  'document_pdf_truncated_pages',
]);

export function isPartialOutputReason(reason: BatchDiagnosticReason): boolean {
  return PARTIAL_OUTPUT_REASONS.has(reason);
}

export function hasPartialOutputReasons(reasons: BatchDiagnosticReason[]): boolean {
  return reasons.some((reason) => PARTIAL_OUTPUT_REASONS.has(reason));
}

export function deriveResultState(input: {
  baseState?: ExtractResultState;
  diagnosticReasons: BatchDiagnosticReason[];
  warnings?: string[];
}): ExtractResultState {
  const actionableDiagnosticReasons = input.diagnosticReasons.filter((reason) => !INFORMATIONAL_REASONS.has(reason));

  if (input.baseState === 'partial' || hasPartialOutputReasons(input.diagnosticReasons)) {
    return 'partial';
  }

  if (
    input.baseState === 'degraded' ||
    actionableDiagnosticReasons.length > 0 ||
    (input.warnings || []).length > 0
  ) {
    return 'degraded';
  }

  return 'usable';
}

export function normalizeStoredResultState(
  resultState: ExtractResultState | null | undefined,
  diagnosticReasons: BatchDiagnosticReason[],
): ExtractResultState | null {
  if (!resultState) return null;
  if (resultState === 'degraded' && hasPartialOutputReasons(diagnosticReasons)) return 'partial';
  return resultState;
}

export function resultTrustLabel(resultState: ExtractResultState, diagnosticReasons: BatchDiagnosticReason[]): string {
  if (resultState === 'usable') return 'Usable result';
  if (resultState === 'partial' || hasPartialOutputReasons(diagnosticReasons)) return 'Partial result';
  return 'Degraded result';
}

export function resultStateForExtractionPath(path: ExtractionPath): ExtractResultState {
  if (path === 'browser_fallback') return 'degraded';
  if (path === 'rsc_fallback' || path === 'syndication_fallback') return 'partial';
  return 'usable';
}

export function diagnosticReasonsForExtractionPath(path: ExtractionPath): BatchDiagnosticReason[] {
  switch (path) {
    case 'authenticated_session':
      return ['extract_authenticated_session_used'];
    case 'browser_fallback':
      return ['extract_browser_fallback_used'];
    case 'rsc_fallback':
      return ['extract_rsc_fallback_used', 'extract_rsc_structure_flattened'];
    case 'syndication_fallback':
      return ['extract_syndication_fallback_used'];
    default:
      return [];
  }
}

export function diagnosticReasonsForExtractErrorCode(errorCode: string | null | undefined): BatchDiagnosticReason[] {
  if (errorCode === 'EMPTY_CONTENT') {
    return ['extract_empty_content'];
  }

  return [];
}

export function extractionPathLabel(path: string): string {
  if (path === 'authenticated_session') return 'Protected page access';
  if (path === 'browser_fallback') return 'Browser fallback';
  if (path === 'rsc_fallback') return 'RSC fallback';
  if (path === 'syndication_fallback') return 'Syndication fallback';
  return 'Readability';
}

export function pageComplexitySignalLabel(signal: PageComplexitySignal | null | undefined): string {
  if (signal === 'dynamic_page_likely') return 'Dynamic page likely';
  if (signal === 'standard') return 'Standard page signal';
  return 'Unknown page signal';
}
