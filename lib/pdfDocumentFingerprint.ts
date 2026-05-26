import type { DocumentFingerprint } from '@/lib/documentBatchRouter';
import { getPdfJsRuntime } from '@/lib/pdfjsRuntime';
import type { ExportFormat, ImageMode } from '@/lib/types';

type PageSampleLine = {
  text: string;
  fontSize: number;
  itemCount: number;
  gapCount: number;
};

type PageSignal = DocumentFingerprint['mixedPageSignals'][number];

function normalizeExtractedText(input: string): string {
  return input.replace(/\r/g, '').replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function pickFontSize(item: any): number {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  const fromHeight = Number(item?.height || 0);
  const fromScale = Math.max(Math.abs(Number(transform[0] || 0)), Math.abs(Number(transform[3] || 0)));
  return Math.max(8, fromHeight || fromScale || 8);
}

function buildPageLines(viewport: any, textItems: any[]): PageSampleLine[] {
  const items = (textItems || [])
    .filter((item) => typeof item?.str === 'string' && normalizeExtractedText(item.str))
    .map((item) => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const width = Math.max(1, Number(item?.width || 0));
      return {
        text: normalizeExtractedText(item.str),
        x,
        y,
        width,
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
      let gapCount = 0;
      for (let index = 1; index < sorted.length; index += 1) {
        const gap = sorted[index].x - (sorted[index - 1].x + sorted[index - 1].width);
        if (gap >= Math.max(20, sorted[index].fontSize * 1.5)) {
          gapCount += 1;
        }
      }

      return {
        text: normalizeExtractedText(sorted.map((item) => item.text).join(' ')),
        fontSize: Math.max(...sorted.map((item) => item.fontSize)),
        itemCount: sorted.length,
        gapCount,
      };
    })
    .filter((line) => line.text.length > 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] || 0;
}

function countImagePaintOps(pdfjs: any, operatorList: any): number {
  let count = 0;
  for (const fn of operatorList?.fnArray || []) {
    if (
      fn === pdfjs.OPS.paintImageXObject ||
      fn === pdfjs.OPS.paintInlineImageXObject ||
      fn === pdfjs.OPS.paintImageXObjectRepeat ||
      fn === pdfjs.OPS.paintInlineImageXObjectGroup
    ) {
      count += 1;
    }
  }
  return count;
}

function pageSignalFromLines(input: {
  pageNumber: number;
  lines: PageSampleLine[];
  imagePaintOps: number;
}): PageSignal {
  const totalWords = input.lines.reduce((sum, line) => sum + line.text.split(/\s+/).filter(Boolean).length, 0);
  const bodyFont = median(input.lines.map((line) => line.fontSize)) || 12;
  const headingLines = input.lines.filter(
    (line) => line.fontSize >= bodyFont * 1.25 && line.text.split(/\s+/).filter(Boolean).length <= 14,
  ).length;
  const tableLines = input.lines.filter((line) => line.itemCount >= 4 && line.gapCount >= 2).length;
  const textDensity = clamp01(totalWords / 450);
  const imageDominance = clamp01(input.imagePaintOps / Math.max(1, input.lines.length));
  const headingLikelihood = clamp01(headingLines / Math.max(1, input.lines.length / 8));
  const tableLikelihood = clamp01(tableLines / Math.max(1, input.lines.length / 4));

  let scannedLikelihood = 0;
  if (totalWords <= 20 && input.imagePaintOps >= 1) {
    scannedLikelihood = 0.95;
  } else if (totalWords <= 60 && imageDominance >= 0.5) {
    scannedLikelihood = 0.8;
  } else if (totalWords <= 120 && imageDominance >= 0.35) {
    scannedLikelihood = 0.55;
  } else if (textDensity <= 0.12 && imageDominance >= 0.25) {
    scannedLikelihood = 0.45;
  }

  return {
    pageNumber: input.pageNumber,
    scannedLikelihood,
    tableLikelihood,
    textDensity,
  };
}

export async function buildPdfDocumentFingerprint(input: {
  bytes: Buffer;
  outputFormat: ExportFormat;
  imagesMode: ImageMode;
  samplePages?: number;
}): Promise<DocumentFingerprint> {
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
    const sampledPages = Math.min(pdfDocument.numPages, Math.max(1, input.samplePages || 3));
    const pageSignals: PageSignal[] = [];
    const headingScores: number[] = [];
    const imageDominanceScores: number[] = [];

    for (let pageNumber = 1; pageNumber <= sampledPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: 1 });
        const [textContent, operatorList] = await Promise.all([
          page.getTextContent(),
          page.getOperatorList(),
        ]);
        const lines = buildPageLines(viewport, textContent.items || []);
        const imagePaintOps = countImagePaintOps(pdfjs, operatorList);
        const signal = pageSignalFromLines({
          pageNumber,
          lines,
          imagePaintOps,
        });
        pageSignals.push(signal);

        const totalWords = lines.reduce((sum, line) => sum + line.text.split(/\s+/).filter(Boolean).length, 0);
        const bodyFont = median(lines.map((line) => line.fontSize)) || 12;
        const headingLines = lines.filter(
          (line) => line.fontSize >= bodyFont * 1.25 && line.text.split(/\s+/).filter(Boolean).length <= 14,
        ).length;
        headingScores.push(clamp01(headingLines / Math.max(1, lines.length / 8)));
        imageDominanceScores.push(clamp01(imagePaintOps / Math.max(1, lines.length)));

        if (totalWords === 0 && imagePaintOps === 0) {
          pageSignals[pageSignals.length - 1] = {
            pageNumber,
            scannedLikelihood: 0,
            tableLikelihood: 0,
            textDensity: 0,
          };
        }
      } finally {
        page.cleanup();
      }
    }

    const scannedLikelihood = pageSignals.length > 0
      ? Math.max(...pageSignals.map((signal) => signal.scannedLikelihood))
      : 0;
    const tableLikelihood = pageSignals.length > 0
      ? Math.max(...pageSignals.map((signal) => signal.tableLikelihood))
      : 0;
    const textDensity = pageSignals.length > 0
      ? pageSignals.reduce((sum, signal) => sum + signal.textDensity, 0) / pageSignals.length
      : 0;
    const imageDominance = imageDominanceScores.length > 0
      ? imageDominanceScores.reduce((sum, score) => sum + score, 0) / imageDominanceScores.length
      : 0;
    const headingLikelihood = headingScores.length > 0
      ? headingScores.reduce((sum, score) => sum + score, 0) / headingScores.length
      : 0;

    return {
      fileFamily: 'pdf',
      outputFormat: input.outputFormat,
      imagesMode: input.imagesMode,
      pageCount: pdfDocument.numPages,
      sampledPages,
      scannedLikelihood,
      imageDominance,
      tableLikelihood,
      headingLikelihood,
      textDensity,
      mixedPageSignals: pageSignals,
    };
  } finally {
    await loadingTask.destroy();
  }
}
