import type { ConversionSource } from '@/lib/documentConversion';
import { recoverDocumentFromHtml } from '@/lib/recoveredStructure';

type Matrix = [number, number, number, number, number, number];

type PdfTextBlock = {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerY: number;
  wordCount: number;
};

type PdfImageBlock = {
  pageNumber: number;
  order: number;
  dataUri: string;
  label: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerY: number;
  highConfidence: boolean;
  placementIndex: number;
  labelBlockIndex: number | null;
};

type PdfPageModel = {
  pageNumber: number;
  textBlocks: PdfTextBlock[];
  imageBlocks: PdfImageBlock[];
};

type PdfPlacementResult = {
  html: string;
  text: string;
};

const RENDER_SCALE = 1.5;
const MIN_IMAGE_DIMENSION = 12;
const MIN_IMAGE_AREA = 200;
const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

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

function wordCount(input: string): number {
  return input.split(/\s+/).filter(Boolean).length;
}

function matrixMultiply(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function applyMatrix(matrix: Matrix, x: number, y: number): { x: number; y: number } {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

function boundsFromPoints(points: Array<{ x: number; y: number }>) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function htmlParagraph(text: string): string {
  return `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;
}

async function getPdfRuntime() {
  const canvas = await import('@napi-rs/canvas');
  const globals = globalThis as {
    DOMMatrix?: unknown;
    DOMPoint?: unknown;
    DOMRect?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };

  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.DOMPoint ??= canvas.DOMPoint;
  globals.DOMRect ??= canvas.DOMRect;
  globals.ImageData ??= canvas.ImageData;
  globals.Path2D ??= canvas.Path2D;

  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return { canvas, pdfjs };
}

function buildTextBlocks(viewport: any, textItems: any[]): PdfTextBlock[] {
  const items = textItems
    .filter((item) => typeof item?.str === 'string' && normalizeExtractedText(item.str))
    .map((item) => {
      const base = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const widthPoint = viewport.convertToViewportPoint(
        item.transform[4] + (Number(item.width) || 0),
        item.transform[5],
      );
      const height = Math.max(
        10,
        Math.abs(Number(item.height) || Number(item.transform?.[3]) || Number(item.transform?.[0]) || 10),
      );
      const width = Math.max(1, Math.abs(widthPoint[0] - base[0]));
      const top = base[1] - height;
      const bottom = base[1];
      return {
        text: normalizeExtractedText(item.str),
        x: base[0],
        width,
        top,
        bottom,
        height,
      };
    })
    .sort((left, right) => (left.top - right.top) || (left.x - right.x));

  const lines: Array<{ top: number; bottom: number; items: typeof items }> = [];

  for (const item of items) {
    const currentLine = lines.at(-1);
    if (!currentLine || Math.abs(currentLine.top - item.top) > Math.max(6, Math.min(currentLine.bottom - currentLine.top, item.height) * 0.75)) {
      lines.push({ top: item.top, bottom: item.bottom, items: [item] });
      continue;
    }

    currentLine.items.push(item);
    currentLine.top = Math.min(currentLine.top, item.top);
    currentLine.bottom = Math.max(currentLine.bottom, item.bottom);
  }

  const blocks: PdfTextBlock[] = [];

  for (const line of lines) {
    const sortedItems = [...line.items].sort((left, right) => left.x - right.x);
    let currentItems: typeof sortedItems = [];

    const flushBlock = () => {
      if (currentItems.length === 0) return;
      const text = normalizeExtractedText(currentItems.map((entry) => entry.text).join(' '));
      if (!text) {
        currentItems = [];
        return;
      }

      const left = Math.min(...currentItems.map((entry) => entry.x));
      const right = Math.max(...currentItems.map((entry) => entry.x + entry.width));
      const top = Math.min(...currentItems.map((entry) => entry.top));
      const bottom = Math.max(...currentItems.map((entry) => entry.bottom));
      const height = Math.max(1, bottom - top);

      blocks.push({
        text,
        left,
        right,
        top,
        bottom,
        width: Math.max(1, right - left),
        height,
        centerY: top + height / 2,
        wordCount: wordCount(text),
      });

      currentItems = [];
    };

    for (const item of sortedItems) {
      const previous = currentItems.at(-1);
      if (!previous) {
        currentItems.push(item);
        continue;
      }

      const gap = item.x - (previous.x + previous.width);
      if (gap > Math.max(24, Math.min(previous.height, item.height) * 1.4)) {
        flushBlock();
      }

      currentItems.push(item);
    }

    flushBlock();
  }

  return blocks;
}

function dominantColumn(blocks: PdfTextBlock[]) {
  if (blocks.length === 0) {
    return null;
  }

  const buckets = new Map<number, { blocks: PdfTextBlock[]; score: number }>();

  for (const block of blocks) {
    const bucket = Math.round(block.left / 48);
    const current = buckets.get(bucket) || { blocks: [], score: 0 };
    current.blocks.push(block);
    current.score += Math.max(block.wordCount, 1) + block.width / 120;
    buckets.set(bucket, current);
  }

  const winner = [...buckets.values()].sort((left, right) => right.score - left.score)[0];
  if (!winner) return null;

  return {
    left: Math.min(...winner.blocks.map((block) => block.left)),
    right: Math.max(...winner.blocks.map((block) => block.right)),
    top: Math.min(...winner.blocks.map((block) => block.top)),
    bottom: Math.max(...winner.blocks.map((block) => block.bottom)),
  };
}

function extractImageBounds(viewport: any, matrix: Matrix) {
  const pdfPoints = [
    applyMatrix(matrix, 0, 0),
    applyMatrix(matrix, 1, 0),
    applyMatrix(matrix, 1, 1),
    applyMatrix(matrix, 0, 1),
  ];
  const viewportPoints = pdfPoints.map((point) => {
    const converted = viewport.convertToViewportPoint(point.x, point.y);
    return { x: converted[0], y: converted[1] };
  });

  return boundsFromPoints(viewportPoints);
}

function cropBounds(bounds: { left: number; right: number; top: number; bottom: number }, width: number, height: number) {
  const left = clamp(Math.floor(bounds.left), 0, width);
  const top = clamp(Math.floor(bounds.top), 0, height);
  const right = clamp(Math.ceil(bounds.right), 0, width);
  const bottom = clamp(Math.ceil(bounds.bottom), 0, height);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function chooseImageLabel(imageBounds: { top: number; bottom: number; height: number }, blocks: PdfTextBlock[], pageNumber: number, imageNumber: number) {
  const candidate = blocks.find((block) => {
    const verticalGap = block.top - imageBounds.bottom;
    return verticalGap >= 0 && verticalGap <= Math.max(block.height * 1.25, 14) && block.wordCount <= 12;
  });

  if (candidate) {
    return {
      label: candidate.text,
      labelBlockIndex: blocks.indexOf(candidate),
    };
  }

  return {
    label: `page ${pageNumber} image ${imageNumber}`,
    labelBlockIndex: null,
  };
}

function buildPagePlacement(pageNumber: number, textBlocks: PdfTextBlock[], imageBlocks: PdfImageBlock[]): PdfPlacementResult {
  const blocksByInsertion = new Map<number, PdfImageBlock[]>();
  const consumedLabelBlocks = new Set<number>();

  for (const image of imageBlocks) {
    const current = blocksByInsertion.get(image.placementIndex) || [];
    current.push(image);
    blocksByInsertion.set(image.placementIndex, current);
    if (image.labelBlockIndex !== null) {
      consumedLabelBlocks.add(image.labelBlockIndex);
    }
  }

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  const renderImages = (index: number) => {
    for (const image of blocksByInsertion.get(index) || []) {
      htmlParts.push(
        `<figure data-page="${pageNumber}"><img src="${image.dataUri}" alt="${escapeHtml(image.label)}" /><figcaption>${escapeHtml(image.label)}</figcaption></figure>`,
      );
    }
  };

  renderImages(-1);

  textBlocks.forEach((block, index) => {
    if (!consumedLabelBlocks.has(index)) {
      htmlParts.push(htmlParagraph(block.text));
      textParts.push(block.text);
    }
    renderImages(index);
  });

  return {
    html: htmlParts.join('\n'),
    text: normalizeExtractedText(textParts.join('\n\n')),
  };
}

async function buildPageModel(input: {
  canvas: any;
  pdfjs: any;
  page: any;
  pageNumber: number;
}): Promise<PdfPageModel> {
  const viewport = input.page.getViewport({ scale: RENDER_SCALE });
  const pageCanvas = input.canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const pageContext = pageCanvas.getContext('2d');

  await input.page.render({
    canvasContext: pageContext,
    viewport,
  }).promise;

  const [textContent, operatorList] = await Promise.all([
    input.page.getTextContent(),
    input.page.getOperatorList(),
  ]);

  const textBlocks = buildTextBlocks(viewport, textContent.items || []);
  const column = dominantColumn(textBlocks);
  const imageBlocks: PdfImageBlock[] = [];
  const stack: Matrix[] = [IDENTITY_MATRIX];
  let imageNumber = 0;

  const registerImage = (matrix: Matrix) => {
    const bounds = extractImageBounds(viewport, matrix);
    const cropped = cropBounds(bounds, pageCanvas.width, pageCanvas.height);
    if (
      cropped.width < MIN_IMAGE_DIMENSION ||
      cropped.height < MIN_IMAGE_DIMENSION ||
      cropped.width * cropped.height < MIN_IMAGE_AREA
    ) {
      return;
    }

    const cropCanvas = input.canvas.createCanvas(cropped.width, cropped.height);
    const cropContext = cropCanvas.getContext('2d');
    cropContext.drawImage(
      pageCanvas,
      cropped.left,
      cropped.top,
      cropped.width,
      cropped.height,
      0,
      0,
      cropped.width,
      cropped.height,
    );

    imageNumber += 1;
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const overlap = column ? Math.max(0, Math.min(bounds.right, column.right) - Math.max(bounds.left, column.left)) : 0;
    const overlapRatio = column ? overlap / Math.max(1, Math.min(width, column.right - column.left)) : 0;
    const centerY = bounds.top + height / 2;
    const withinTextBand = column ? centerY >= column.top && centerY <= column.bottom : false;
    const highConfidence = Boolean(column) && overlapRatio >= 0.2 && withinTextBand;
    const label = chooseImageLabel(
      { top: bounds.top, bottom: bounds.bottom, height },
      textBlocks,
      input.pageNumber,
      imageNumber,
    );

    let placementIndex = textBlocks.length - 1;
    if (highConfidence) {
      placementIndex = -1;
      for (let blockIndex = 0; blockIndex < textBlocks.length; blockIndex += 1) {
        if (textBlocks[blockIndex].bottom <= centerY + Math.max(12, height * 0.1)) {
          placementIndex = blockIndex;
        }
      }
    }

    imageBlocks.push({
      pageNumber: input.pageNumber,
      order: imageNumber,
      dataUri: cropCanvas.toDataURL('image/png'),
      label: label.label,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      width,
      height,
      centerY,
      highConfidence,
      placementIndex,
      labelBlockIndex: highConfidence ? label.labelBlockIndex : null,
    });
  };

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index];
    const args = operatorList.argsArray[index] || [];
    const current = stack.at(-1) || IDENTITY_MATRIX;

    if (fn === input.pdfjs.OPS.save) {
      stack.push([...current] as Matrix);
      continue;
    }

    if (fn === input.pdfjs.OPS.restore) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    if (fn === input.pdfjs.OPS.transform) {
      const transformMatrix: Matrix = [
        Number(args[0] || 0),
        Number(args[1] || 0),
        Number(args[2] || 0),
        Number(args[3] || 0),
        Number(args[4] || 0),
        Number(args[5] || 0),
      ];
      stack[stack.length - 1] = matrixMultiply(current, transformMatrix);
      continue;
    }

    if (fn === input.pdfjs.OPS.paintImageXObject || fn === input.pdfjs.OPS.paintInlineImageXObject) {
      registerImage(current);
      continue;
    }

    if (fn === input.pdfjs.OPS.paintImageXObjectRepeat) {
      const scaleX = Number(args[1] || 0);
      const scaleY = Number(args[2] || 0);
      const positions: ArrayLike<number> = args[3] || [];
      for (let positionIndex = 0; positionIndex < positions.length; positionIndex += 2) {
        registerImage(
          matrixMultiply(current, [
            scaleX,
            0,
            0,
            scaleY,
            Number(positions[positionIndex] || 0),
            Number(positions[positionIndex + 1] || 0),
          ]),
        );
      }
      continue;
    }

    if (fn === input.pdfjs.OPS.paintInlineImageXObjectGroup) {
      const mapEntries: Array<{ transform?: number[] }> = args[1] || [];
      for (const entry of mapEntries) {
        if (!Array.isArray(entry?.transform) || entry.transform.length < 6) {
          continue;
        }

        registerImage(
          matrixMultiply(current, [
            Number(entry.transform[0] || 0),
            Number(entry.transform[1] || 0),
            Number(entry.transform[2] || 0),
            Number(entry.transform[3] || 0),
            Number(entry.transform[4] || 0),
            Number(entry.transform[5] || 0),
          ]),
        );
      }
    }
  }

  return {
    pageNumber: input.pageNumber,
    textBlocks,
    imageBlocks,
  };
}

export async function buildPdfConversionSource(input: {
  bytes: Buffer;
  title: string;
  maxPages: number;
}): Promise<ConversionSource | null> {
  const { canvas, pdfjs } = await getPdfRuntime();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(input.bytes),
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  const pdfDocument = await loadingTask.promise;

  try {
    const totalPages = Math.min(pdfDocument.numPages, input.maxPages);
    const pageModels: PdfPageModel[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        pageModels.push(
          await buildPageModel({
            canvas,
            pdfjs,
            page,
            pageNumber,
          }),
        );
      } finally {
        page.cleanup();
      }
    }

    const htmlSections: string[] = [];
    const textSections: string[] = [];

    for (const pageModel of pageModels) {
      const placement = buildPagePlacement(pageModel.pageNumber, pageModel.textBlocks, pageModel.imageBlocks);
      if (placement.html) htmlSections.push(placement.html);
      if (placement.text) textSections.push(placement.text);
    }

    const truncated = pdfDocument.numPages > input.maxPages;
    let htmlContent = htmlSections.join('\n');
    let textContent = normalizeExtractedText(textSections.join('\n\n'));

    if (truncated) {
      const note = `[Truncated] Converted first ${input.maxPages} pages only.`;
      textContent = textContent ? `${textContent}\n\n${note}` : note;
      htmlContent = `${htmlContent}\n${htmlParagraph(note)}`.trim();
    }

    if (!textContent && !htmlContent) {
      return null;
    }

    if (!htmlContent) {
      htmlContent = textContent
        .split(/\n{2,}/)
        .map((block) => htmlParagraph(block.trim()))
        .join('\n');
    }

    if (!textContent) {
      textContent = normalizeExtractedText(
        pageModels.flatMap((pageModel) => pageModel.textBlocks.map((block) => block.text)).join('\n\n'),
      );
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
