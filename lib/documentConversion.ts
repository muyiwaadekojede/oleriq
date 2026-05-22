import { posix as pathPosix } from 'node:path';

import { buildMarkdownExport } from '@/lib/exportMarkdown';
import { buildPdfConversionSource } from '@/lib/pdfConversion';
import { buildTxtExport } from '@/lib/exportTxt';
import { sanitizeFilename } from '@/lib/sanitise';
import { structuralDiagnosticReasonsForDocumentExport } from '@/lib/structuralFidelity';
import { deriveResultState, warningForDiagnosticReason } from '@/lib/trustGuidance';
import type { BatchDiagnosticReason, ExportFormat, ExtractResultState, ImageMode, ReaderSettings } from '@/lib/types';

export const MAX_DOCUMENT_FILE_BYTES = 60 * 1024 * 1024;
export const MAX_DOCUMENT_BATCH_FILES = 500;
export const MAX_DOCUMENT_BATCH_BYTES = 2 * 1024 * 1024 * 1024;
export const DOCUMENT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const DOCUMENT_SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.epub',
  '.txt',
  '.md',
  '.html',
  '.htm',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.rst',
] as const;
export const DOCUMENT_ACCEPT_ATTRIBUTE = DOCUMENT_SUPPORTED_EXTENSIONS.join(',');

const MAX_PDF_CONVERSION_PAGES = 120;
const DOCX_MIME_MARKERS = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const EPUB_MIME_MARKERS = ['application/epub+zip'];
const TEXT_MIME_MARKERS = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/xhtml+xml',
];

type FileKind = 'pdf' | 'docx' | 'epub' | 'text' | 'unknown';

export type ConversionSource = {
  title: string;
  textContent: string;
  htmlContent: string;
  diagnosticReasons?: BatchDiagnosticReason[];
  warnings?: string[];
};

async function getMammoth() {
  return await import('mammoth');
}

async function getJSZipClass() {
  const mod = await import('jszip');
  return mod.default;
}

async function getJSDOMClass() {
  const mod = await import('jsdom');
  return mod.JSDOM;
}

async function getDocxExporter() {
  return await import('@/lib/exportDocx');
}

async function getPdfExporter() {
  return await import('@/lib/exportPdf');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{1,8}$/i, '');
}

export function extensionFromName(name: string): string {
  const match = name.match(/(\.[a-z0-9]{1,8})$/i);
  return match?.[1]?.toLowerCase() || '';
}

function isPdfLike(input: { contentType: string; filename: string; bytes: Buffer }): boolean {
  const contentType = input.contentType.toLowerCase();
  if (contentType.includes('application/pdf') || contentType.includes('application/x-pdf')) return true;
  if (input.filename.toLowerCase().endsWith('.pdf')) return true;
  if (input.bytes.length >= 4) {
    return (
      input.bytes[0] === 0x25 &&
      input.bytes[1] === 0x50 &&
      input.bytes[2] === 0x44 &&
      input.bytes[3] === 0x46
    );
  }

  return false;
}

function isDocxLike(input: { contentType: string; filename: string; bytes: Buffer }): boolean {
  const contentType = input.contentType.toLowerCase();
  if (DOCX_MIME_MARKERS.some((marker) => contentType.includes(marker))) return true;
  if (input.filename.toLowerCase().endsWith('.docx')) return true;
  if (input.bytes.length >= 4) {
    return input.bytes[0] === 0x50 && input.bytes[1] === 0x4b && input.filename.toLowerCase().endsWith('.docx');
  }

  return false;
}

function isEpubLike(input: { contentType: string; filename: string; bytes: Buffer }): boolean {
  const contentType = input.contentType.toLowerCase();
  if (EPUB_MIME_MARKERS.some((marker) => contentType.includes(marker))) return true;
  if (input.filename.toLowerCase().endsWith('.epub')) return true;
  if (input.bytes.length >= 4) {
    return input.bytes[0] === 0x50 && input.bytes[1] === 0x4b;
  }

  return false;
}

function isTextLike(input: { contentType: string; filename: string }): boolean {
  const contentType = input.contentType.toLowerCase();
  if (contentType.startsWith('text/')) return true;
  if (TEXT_MIME_MARKERS.some((marker) => contentType.includes(marker))) return true;
  return DOCUMENT_SUPPORTED_EXTENSIONS.some((ext) => input.filename.toLowerCase().endsWith(ext));
}

export function inferFileKind(input: { contentType: string; filename: string; bytes: Buffer }): FileKind {
  if (isPdfLike(input)) return 'pdf';
  if (isDocxLike(input)) return 'docx';
  if (isEpubLike(input)) return 'epub';
  if (isTextLike(input)) return 'text';
  return 'unknown';
}

export function isSupportedDocumentFilename(filename: string): boolean {
  const lowered = filename.toLowerCase();
  return DOCUMENT_SUPPORTED_EXTENSIONS.some((extension) => lowered.endsWith(extension));
}

function normalizeExtractedText(input: string): string {
  return input.replace(/\r/g, '').replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function textToSimpleHtml(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return '<p></p>';
  }

  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function isHtmlLike(input: { contentType: string; filename: string; text: string }): boolean {
  const contentType = input.contentType.toLowerCase();
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) return true;
  if (input.filename.toLowerCase().endsWith('.html') || input.filename.toLowerCase().endsWith('.htm')) return true;
  const sample = input.text.slice(0, 400).toLowerCase();
  return sample.includes('<html') || sample.includes('<body') || sample.includes('<p');
}

async function htmlToText(html: string): Promise<string> {
  const JSDOM = await getJSDOMClass();
  const dom = new JSDOM(html);
  try {
    return normalizeExtractedText(dom.window.document.body?.textContent || dom.window.document.documentElement.textContent || '');
  } finally {
    dom.window.close();
  }
}

function filenameExtension(input: string): string {
  const match = input.toLowerCase().match(/(\.[a-z0-9]{1,8})(?:[?#].*)?$/i);
  return match?.[1] || '';
}

function imageMimeFromPath(input: string): string | null {
  const extension = filenameExtension(input);
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.bmp') return 'image/bmp';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.svg') return 'image/svg+xml';
  return null;
}

function posixDirname(input: string): string {
  const normalized = input.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index < 0) return '';
  return normalized.slice(0, index);
}

function resolveZipRelativePath(basePath: string, targetPath: string): string {
  const normalizedTarget = targetPath.replace(/\\/g, '/');
  const withoutHash = normalizedTarget.split('#')[0]?.split('?')[0] || '';
  if (!withoutHash) return '';
  if (/^[a-z]+:/i.test(withoutHash) || withoutHash.startsWith('//') || withoutHash.startsWith('data:')) {
    return withoutHash;
  }

  if (withoutHash.startsWith('/')) {
    return withoutHash.slice(1);
  }

  const baseDir = posixDirname(basePath);
  return pathPosix.normalize(pathPosix.join(baseDir, withoutHash));
}

function elementsByLocalName(root: ParentNode, localName: string): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((element) => element.localName.toLowerCase() === localName.toLowerCase());
}

function firstElementByLocalName(root: ParentNode, localName: string): Element | null {
  return elementsByLocalName(root, localName)[0] || null;
}

function chapterHeadingText(document: Document): string {
  const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
  const headingText = normalizeExtractedText(heading?.textContent || '');
  if (headingText) return headingText;
  const titleText = normalizeExtractedText(document.title || '');
  return titleText;
}

function imageCaptionLabel(element: Element): string {
  const figure = element.closest('figure');
  const figureCaption = figure ? normalizeExtractedText(figure.querySelector('figcaption')?.textContent || '') : '';
  if (figureCaption) return figureCaption;

  const alt = normalizeExtractedText(element.getAttribute('alt') || '');
  if (alt) return alt;

  const title = normalizeExtractedText(element.getAttribute('title') || '');
  if (title) return title;

  return 'image';
}

async function applyImageModeToHtml(input: {
  html: string;
  mode: ImageMode;
}): Promise<string> {
  if (input.mode === 'on') return input.html;

  const JSDOM = await getJSDOMClass();
  const dom = new JSDOM(`<body>${input.html}</body>`);

  try {
    const document = dom.window.document;
    const images = Array.from(document.querySelectorAll('img'));

    for (const image of images) {
      if (input.mode === 'off') {
        const removable = image.closest('picture') || image;
        removable.remove();
        continue;
      }

      const label = imageCaptionLabel(image);
      const paragraph = document.createElement('p');
      const emphasis = document.createElement('em');
      emphasis.textContent = `[Image: ${label}]`;
      paragraph.append(emphasis);

      const figure = image.closest('figure');
      if (figure) {
        figure.replaceWith(paragraph);
        continue;
      }

      const picture = image.closest('picture');
      if (picture) {
        picture.replaceWith(paragraph);
        continue;
      }

      image.replaceWith(paragraph);
    }

    return document.body.innerHTML;
  } finally {
    dom.window.close();
  }
}

async function buildDocxConversionSource(input: {
  bytes: Buffer;
  title: string;
}): Promise<ConversionSource | null> {
  const mammoth = await getMammoth();
  const converted = await mammoth.convertToHtml({ buffer: input.bytes });
  const htmlContent = converted.value.trim();
  if (!htmlContent) return null;

  return {
    title: input.title,
    textContent: await htmlToText(htmlContent),
    htmlContent,
  };
}

async function inlineEpubImages(input: {
  zip: {
    file: (name: string) => {
      async: (type: 'uint8array' | 'string') => Promise<Uint8Array | string>;
    } | null;
  };
  chapterPath: string;
  html: string;
}): Promise<string> {
  const JSDOM = await getJSDOMClass();
  const dom = new JSDOM(input.html, { contentType: 'application/xhtml+xml' });

  try {
    const document = dom.window.document;
    const images = Array.from(document.querySelectorAll('img'));

    for (const image of images) {
      const src = image.getAttribute('src')?.trim() || '';
      if (!src || src.startsWith('data:') || /^[a-z]+:/i.test(src) || src.startsWith('//')) continue;

      const resolvedPath = resolveZipRelativePath(input.chapterPath, src);
      if (!resolvedPath) continue;

      const asset = input.zip.file(resolvedPath);
      if (!asset) continue;

      const bytes = await asset.async('uint8array');
      const mediaType = imageMimeFromPath(resolvedPath);
      if (!mediaType) continue;

      image.setAttribute('src', `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`);
    }

    return document.body?.innerHTML || '';
  } finally {
    dom.window.close();
  }
}

async function buildEpubConversionSource(input: {
  bytes: Buffer;
  titleFallback: string;
}): Promise<ConversionSource | null> {
  const JSZip = await getJSZipClass();
  const zip = await JSZip.loadAsync(input.bytes);

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) return null;

  const JSDOM = await getJSDOMClass();
  const containerXml = await containerFile.async('string');
  const containerDom = new JSDOM(containerXml, { contentType: 'text/xml' });

  let packagePath = '';
  try {
    packagePath = elementsByLocalName(containerDom.window.document, 'rootfile')[0]?.getAttribute('full-path') || '';
  } finally {
    containerDom.window.close();
  }

  if (!packagePath) return null;

  const packageFile = zip.file(packagePath);
  if (!packageFile) return null;

  const packageXml = await packageFile.async('string');
  const packageDom = new JSDOM(packageXml, { contentType: 'text/xml' });

  try {
    const manifestById = new Map<string, { href: string; mediaType: string; fullPath: string }>();

    for (const item of elementsByLocalName(packageDom.window.document, 'item')) {
      const id = item.getAttribute('id')?.trim() || '';
      const href = item.getAttribute('href')?.trim() || '';
      const mediaType = item.getAttribute('media-type')?.trim() || '';
      if (!id || !href) continue;

      manifestById.set(id, {
        href,
        mediaType,
        fullPath: resolveZipRelativePath(packagePath, href),
      });
    }

    const spine = elementsByLocalName(packageDom.window.document, 'itemref')
      .map((item) => item.getAttribute('idref')?.trim() || '')
      .filter(Boolean);

    const metadataTitle = normalizeExtractedText(firstElementByLocalName(packageDom.window.document, 'title')?.textContent || '');
    const sections: string[] = [];

    for (const idref of spine) {
      const item = manifestById.get(idref);
      if (!item || !item.fullPath) continue;
      if (!item.mediaType.includes('html') && !item.mediaType.includes('xhtml')) continue;

      const chapterFile = zip.file(item.fullPath);
      if (!chapterFile) continue;

      const chapterHtml = await chapterFile.async('string');
      const inlinedBody = await inlineEpubImages({
        zip,
        chapterPath: item.fullPath,
        html: chapterHtml,
      });

      const chapterDom = new JSDOM(chapterHtml, { contentType: 'application/xhtml+xml' });
      let sectionHeading = '';
      try {
        sectionHeading = chapterHeadingText(chapterDom.window.document);
      } finally {
        chapterDom.window.close();
      }

      const sectionBody = inlinedBody.trim();
      if (!sectionBody) continue;

      const headingHtml = sectionHeading ? `<h2>${escapeHtml(sectionHeading)}</h2>\n` : '';
      sections.push(`${headingHtml}${sectionBody}`);
    }

    if (sections.length === 0) return null;

    const htmlContent = sections.join('\n');
    return {
      title: metadataTitle || input.titleFallback,
      textContent: await htmlToText(htmlContent),
      htmlContent,
    };
  } finally {
    packageDom.window.close();
  }
}

export async function buildConversionSource(input: {
  fileKind: FileKind;
  bytes: Buffer;
  contentType: string;
  rawFilename: string;
}): Promise<ConversionSource | null> {
  const title = stripExtension(input.rawFilename) || 'Untitled Document';

  if (input.fileKind === 'pdf') {
    return await buildPdfConversionSource({
      bytes: input.bytes,
      title,
      maxPages: MAX_PDF_CONVERSION_PAGES,
    });
  }

  if (input.fileKind === 'docx') {
    return await buildDocxConversionSource({
      bytes: input.bytes,
      title,
    });
  }

  if (input.fileKind === 'epub') {
    return await buildEpubConversionSource({
      bytes: input.bytes,
      titleFallback: title,
    });
  }

  if (input.fileKind === 'text') {
    const decodedText = normalizeExtractedText(new TextDecoder('utf-8').decode(input.bytes));
    if (!decodedText) return null;

    if (isHtmlLike({ contentType: input.contentType, filename: input.rawFilename, text: decodedText })) {
      return {
        title,
        textContent: await htmlToText(decodedText),
        htmlContent: decodedText,
      };
    }

    return {
      title,
      textContent: decodedText,
      htmlContent: textToSimpleHtml(decodedText),
    };
  }

  return null;
}

function normalizeSourceLabel(sourceLabel: string): string {
  const trimmed = sourceLabel.trim();
  return trimmed.length > 0 ? trimmed : 'upload://document';
}

export async function convertDocumentBuffer(input: {
  bytes: Buffer;
  rawFilename: string;
  contentType: string;
  format: ExportFormat;
  imagesMode?: ImageMode;
  sourceLabel: string;
  settings: ReaderSettings;
}): Promise<{
  success: true;
  buffer: Buffer;
  contentType: string;
  filename: string;
  title: string;
  resultState: ExtractResultState;
  warnings: string[];
  diagnosticReasons: BatchDiagnosticReason[];
} | {
  success: false;
}> {
  const safeFilename = input.rawFilename.trim() || 'document';
  const safeContentType = input.contentType.trim() || 'application/octet-stream';
  const fileKind = inferFileKind({
    contentType: safeContentType,
    filename: safeFilename,
    bytes: input.bytes,
  });

  const titleBase = stripExtension(safeFilename) || 'document';
  const filenameBase = sanitizeFilename(titleBase, 'document');

  const source = await buildConversionSource({
    fileKind,
    bytes: input.bytes,
    contentType: safeContentType,
    rawFilename: safeFilename,
  });

  if (!source) {
    return { success: false };
  }

  const sourceLabel = normalizeSourceLabel(input.sourceLabel);
  const requestedImageMode = input.imagesMode || 'off';
  const effectiveImageMode = input.format === 'txt' && requestedImageMode === 'on' ? 'captions' : requestedImageMode;
  const baseWarnings = [
    ...(source.warnings || []),
    ...(input.format === 'txt' && requestedImageMode === 'on'
      ? ['Images become captions instead of embedded images in TXT output.']
      : []),
  ];
  const baseDiagnosticReasons: BatchDiagnosticReason[] = [
    ...(source.diagnosticReasons || []),
    ...(input.format === 'txt' && requestedImageMode === 'on'
      ? (['document_txt_images_downgraded_to_captions'] as BatchDiagnosticReason[])
      : []),
  ];
  const preparedHtmlContent = await applyImageModeToHtml({
    html: source.htmlContent,
    mode: effectiveImageMode,
  });
  const preparedTextContent =
    effectiveImageMode === 'on' ? source.textContent : await htmlToText(preparedHtmlContent);

  if (input.format === 'md') {
    const markdown = buildMarkdownExport({
      title: source.title,
      byline: 'Unknown',
      sourceUrl: sourceLabel,
      siteName: 'Uploaded Document',
      publishedTime: 'Unknown',
      content: preparedHtmlContent,
    });
    const structuralReasons = structuralDiagnosticReasonsForDocumentExport({
      sourceHtml: preparedHtmlContent,
      format: input.format,
      outputContent: markdown,
    });
    const diagnosticReasons = [...new Set([...baseDiagnosticReasons, ...structuralReasons])];
    const warnings = [
      ...baseWarnings,
      ...structuralReasons
        .map((reason) => warningForDiagnosticReason(reason))
        .filter((warning): warning is string => Boolean(warning)),
    ];
    const resultState: ExtractResultState = deriveResultState({
      diagnosticReasons,
      warnings,
    });

    return {
      success: true,
      buffer: Buffer.from(markdown, 'utf8'),
      contentType: 'text/markdown; charset=utf-8',
      filename: `${filenameBase}.md`,
      title: source.title,
      resultState,
      warnings,
      diagnosticReasons,
    };
  }

  if (input.format === 'txt') {
    const txt = buildTxtExport({
      title: source.title,
      byline: 'Unknown',
      sourceUrl: sourceLabel,
      siteName: 'Uploaded Document',
      publishedTime: 'Unknown',
      content: preparedHtmlContent,
      textContent: preparedTextContent,
    });
    const structuralReasons = structuralDiagnosticReasonsForDocumentExport({
      sourceHtml: preparedHtmlContent,
      format: input.format,
      outputContent: txt,
    });
    const diagnosticReasons = [...new Set([...baseDiagnosticReasons, ...structuralReasons])];
    const warnings = [
      ...baseWarnings,
      ...structuralReasons
        .map((reason) => warningForDiagnosticReason(reason))
        .filter((warning): warning is string => Boolean(warning)),
    ];
    const resultState: ExtractResultState = deriveResultState({
      diagnosticReasons,
      warnings,
    });

    return {
      success: true,
      buffer: Buffer.from(txt, 'utf8'),
      contentType: 'text/plain; charset=utf-8',
      filename: `${filenameBase}.txt`,
      title: source.title,
      resultState,
      warnings,
      diagnosticReasons,
    };
  }

  if (input.format === 'docx') {
    const { exportDocxBuffer } = await getDocxExporter();
    const docx = await exportDocxBuffer({
      title: source.title,
      byline: 'Unknown',
      sourceUrl: sourceLabel,
      content: preparedHtmlContent,
    });
    const warnings = [...baseWarnings];
    const diagnosticReasons = [...baseDiagnosticReasons];
    const resultState: ExtractResultState = deriveResultState({
      diagnosticReasons,
      warnings,
    });

    return {
      success: true,
      buffer: docx,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: `${filenameBase}.docx`,
      title: source.title,
      resultState,
      warnings,
      diagnosticReasons,
    };
  }

  const { exportPdfBuffer } = await getPdfExporter();
  const pdf = await exportPdfBuffer({
    content: preparedHtmlContent,
    title: source.title,
    byline: 'Unknown',
    settings: input.settings,
  });
  const warnings = [...baseWarnings];
  const diagnosticReasons = [...baseDiagnosticReasons];
  const resultState: ExtractResultState = deriveResultState({
    diagnosticReasons,
    warnings,
  });

  return {
    success: true,
    buffer: pdf,
    contentType: 'application/pdf',
    filename: `${filenameBase}.pdf`,
    title: source.title,
    resultState,
    warnings,
    diagnosticReasons,
  };
}
