import { renderRecoveredDocumentToMarkdown, type RecoveredDocument } from '@/lib/recoveredStructure';

function escapeYamlString(value: string): string {
  return (value || '').replace(/"/g, '\\"');
}

export function buildMarkdownExport(input: {
  title: string;
  byline: string;
  sourceUrl: string;
  siteName: string;
  publishedTime: string;
  document: RecoveredDocument;
}): string {
  const markdownBody = renderRecoveredDocumentToMarkdown(input.document).trim();
  const extractedAt = new Date().toISOString();

  const frontmatter = [
    '---',
    `title: "${escapeYamlString(input.title || 'Untitled Article')}"`,
    `author: "${escapeYamlString(input.byline || 'unknown')}"`,
    `source: "${escapeYamlString(input.sourceUrl)}"`,
    `site: "${escapeYamlString(input.siteName || 'Unknown')}"`,
    `published: "${escapeYamlString(input.publishedTime || 'Unknown')}"`,
    `extracted: "${extractedAt}"`,
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${markdownBody}\n`;
}
