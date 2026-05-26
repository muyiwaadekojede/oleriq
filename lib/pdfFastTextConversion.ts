import type { ConversionSource } from '@/lib/documentConversion';
import { recoverDocumentFromHtml } from '@/lib/recoveredStructure';
import { getPdfJsRuntime } from '@/lib/pdfjsRuntime';

function normalizeExtractedText(input: string): string {
  return input.replace(/\r/g, '').replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type TextItemLine = {
  text: string;
  top: number;
  left: number;
  fontSize: number;
};

function pickFontSize(item: any): number {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  const fromHeight = Number(item?.height || 0);
  const fromScale = Math.max(Math.abs(Number(transform[0] || 0)), Math.abs(Number(transform[3] || 0)));
  return Math.max(8, fromHeight || fromScale || 8);
}

function buildPageLines(viewport: any, textItems: any[]): TextItemLine[] {
  const items = (textItems || [])
    .filter((item) => typeof item?.str === 'string' && normalizeExtractedText(item.str))
    .map((item) => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      return {
        text: normalizeExtractedText(item.str),
        x,
        y,
        fontSize: pickFontSize(item),
      };
    })
    .sort((left, right) => (left.y - right.y) || (left.x - right.x));

  const lines: Array<{ y: number; items: typeof items }> = [];
  for (const item of items) {
    const current = lines.at(-1);
    if (!current || Math.abs(current.y - item.y) > Math.max(4, item.fontSize * 0.6)) {
      lines.push({ y: item.y, items: [item] });
      continue;
    }
    current.items.push(item);
    current.y = Math.min(current.y, item.y);
  }

  return lines
    .map((line) => {
      const sorted = [...line.items].sort((left, right) => left.x - right.x);
      return {
        text: normalizeExtractedText(sorted.map((item) => item.text).join(' ')),
        top: line.y,
        left: sorted[0]?.x || 0,
        fontSize: Math.max(...sorted.map((item) => item.fontSize)),
      };
    })
    .filter((line) => line.text.length > 0);
}

function estimateBodyFont(lines: TextItemLine[]): number {
  const sizes = lines.map((line) => line.fontSize).sort((a, b) => a - b);
  if (sizes.length === 0) return 12;
  return sizes[Math.floor(sizes.length / 2)] || 12;
}

function lineToHtml(line: TextItemLine, bodyFont: number): string {
  const text = escapeHtml(line.text);
  if (line.fontSize >= bodyFont * 1.8 && line.text.length <= 120) return `<h1>${text}</h1>`;
  if (line.fontSize >= bodyFont * 1.45 && line.text.length <= 160) return `<h2>${text}</h2>`;
  if (line.fontSize >= bodyFont * 1.2 && line.text.length <= 180) return `<h3>${text}</h3>`;
  if (/^(?:[-*•]|\d+\.)\s+/.test(line.text)) return `<li>${text.replace(/^(?:[-*•]|\d+\.)\s+/, '')}</li>`;
  return `<p>${text}</p>`;
}

function wrapListBlocks(htmlBlocks: string[]): string[] {
  const output: string[] = [];
  let pendingList: string[] = [];

  const flushList = () => {
    if (pendingList.length === 0) return;
    output.push(`<ul>${pendingList.join('')}</ul>`);
    pendingList = [];
  };

  for (const block of htmlBlocks) {
    if (block.startsWith('<li>')) {
      pendingList.push(block);
      continue;
    }
    flushList();
    output.push(block);
  }

  flushList();
  return output;
}

export async function buildPdfFastTextConversionSource(input: {
  bytes: Buffer;
  title: string;
  maxPages: number;
}): Promise<ConversionSource | null> {
  const { pdfjs, standardFontDataUrl, cMapUrl, wasmUrl } = await getPdfJsRuntime();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(input.bytes),
    standardFontDataUrl,
    cMapUrl,
    cMapPacked: true,
    wasmUrl,
    disableFontFace: false,
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  const pdfDocument = await loadingTask.promise;

  try {
    const totalPages = Math.min(pdfDocument.numPages, input.maxPages);
    const htmlBlocks: string[] = [];
    const textBlocks: string[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const lines = buildPageLines(viewport, textContent.items || []);
        const bodyFont = estimateBodyFont(lines);
        const pageHtml = wrapListBlocks(lines.map((line) => lineToHtml(line, bodyFont)));
        const pageText = normalizeExtractedText(lines.map((line) => line.text).join('\n\n'));
        htmlBlocks.push(...pageHtml);
        if (pageText) textBlocks.push(pageText);
      } finally {
        page.cleanup();
      }
    }

    const truncated = pdfDocument.numPages > input.maxPages;
    let htmlContent = htmlBlocks.join('\n');
    let textContent = normalizeExtractedText(textBlocks.join('\n\n'));

    if (truncated) {
      const note = `[Truncated] Converted first ${input.maxPages} pages only.`;
      htmlContent = `${htmlContent}\n<p>${escapeHtml(note)}</p>`;
      textContent = textContent ? `${textContent}\n\n${note}` : note;
    }

    if (!htmlContent.trim() && !textContent.trim()) {
      return null;
    }

    return {
      title: input.title,
      textContent,
      htmlContent,
      recoveredDocument: recoverDocumentFromHtml(htmlContent),
      diagnosticReasons: truncated ? ['document_pdf_truncated_pages'] : [],
      warnings: truncated ? ['Only part of this PDF was converted in this run.'] : [],
    };
  } finally {
    await loadingTask.destroy();
  }
}
