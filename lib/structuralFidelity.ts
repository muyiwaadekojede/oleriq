import { JSDOM } from 'jsdom';

import type { BatchDiagnosticReason, ExportFormat } from '@/lib/types';

function countHtmlHeadings(html: string): { total: number; deeperThanH3: number } {
  const dom = new JSDOM(`<body>${html}</body>`);

  try {
    const headings = Array.from(dom.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter((heading) => {
      const text = heading.textContent || '';
      return text.trim().length > 0;
    });

    return {
      total: headings.length,
      deeperThanH3: headings.filter((heading) => Number.parseInt(heading.tagName.slice(1), 10) > 3).length,
    };
  } finally {
    dom.window.close();
  }
}

function countHtmlTables(html: string): number {
  const dom = new JSDOM(`<body>${html}</body>`);

  try {
    return dom.window.document.querySelectorAll('table').length;
  } finally {
    dom.window.close();
  }
}

function htmlHasNestedLists(html: string): boolean {
  const dom = new JSDOM(`<body>${html}</body>`);

  try {
    return Array.from(dom.window.document.querySelectorAll('li')).some((item) =>
      Array.from(item.children).some((child) => {
        const tag = child.tagName.toLowerCase();
        return tag === 'ul' || tag === 'ol';
      }),
    );
  } finally {
    dom.window.close();
  }
}

function htmlHasCodeBlock(html: string): boolean {
  const dom = new JSDOM(`<body>${html}</body>`);

  try {
    return Array.from(dom.window.document.querySelectorAll('pre')).some((block) => {
      const text = block.textContent || '';
      return text.trim().length > 0;
    });
  } finally {
    dom.window.close();
  }
}

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes('-') && /^[:|\-\s]+$/.test(trimmed);
}

function countMarkdownTables(markdown: string): number {
  const lines = markdown.replace(/\r/g, '').split('\n');
  let tableCount = 0;

  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index]?.trim() || '';
    const next = lines[index + 1]?.trim() || '';

    if (!current.includes('|')) continue;
    if (!isMarkdownTableSeparator(next)) continue;
    tableCount += 1;
  }

  return tableCount;
}

function countTxtHeadingMarkers(outputContent: string): number {
  return outputContent
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(===|---|~~~)\s+\S/.test(line)).length;
}

export function structuralDiagnosticReasonsForHtmlExport(input: {
  sourceHtml: string;
  format: ExportFormat;
  outputContent: string;
}): BatchDiagnosticReason[] {
  const reasons: BatchDiagnosticReason[] = [];
  const sourceHeadingStats = countHtmlHeadings(input.sourceHtml);
  const sourceTableCount = countHtmlTables(input.sourceHtml);

  if (input.format === 'txt') {
    if (
      sourceHeadingStats.deeperThanH3 > 0 &&
      countTxtHeadingMarkers(input.outputContent) < sourceHeadingStats.total
    ) {
      reasons.push('structure_heading_loss_risk');
    }

    if (sourceTableCount > 0) {
      reasons.push('structure_table_loss_risk');
    }

    if (htmlHasNestedLists(input.sourceHtml)) {
      reasons.push('structure_list_loss_risk');
    }

    if (htmlHasCodeBlock(input.sourceHtml)) {
      reasons.push('structure_code_block_loss_risk');
    }

    return reasons;
  }

  if (sourceTableCount === 0 || input.format !== 'md') {
    return [];
  }

  const outputTableCount = countMarkdownTables(input.outputContent);
  if (outputTableCount >= sourceTableCount) {
    return [];
  }

  return ['structure_table_loss_risk'];
}

export function structuralDiagnosticReasonsForDocumentExport(input: {
  sourceHtml: string;
  format: ExportFormat;
  outputContent: string;
}): BatchDiagnosticReason[] {
  return structuralDiagnosticReasonsForHtmlExport(input);
}
