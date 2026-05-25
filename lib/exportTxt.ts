import { renderRecoveredDocumentToText, type RecoveredDocument } from '@/lib/recoveredStructure';

export function buildTxtExport(input: {
  title: string;
  byline: string;
  sourceUrl: string;
  siteName: string;
  publishedTime: string;
  document: RecoveredDocument;
  textContent: string;
}): string {
  const extractedAt = new Date().toISOString();
  const body = renderRecoveredDocumentToText(input.document).trim() || input.textContent.trim();

  return [
    `Title: ${input.title || 'Untitled Article'}`,
    `Author: ${input.byline || 'Unknown'}`,
    `Source: ${input.sourceUrl}`,
    `Site: ${input.siteName || 'Unknown'}`,
    `Published: ${input.publishedTime || 'Unknown'}`,
    `Extracted: ${extractedAt}`,
    '---',
    '',
    body,
  ].join('\n');
}
