import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type FileChild,
  type ParagraphChild,
} from 'docx';

import type { RecoveredBlock, RecoveredDocument, RecoveredInline } from '@/lib/recoveredStructure';

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
};

type SupportedImageType = 'jpg' | 'png' | 'gif' | 'bmp';
const MAX_DOCX_IMAGE_BYTES = 3_000_000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseDataUri(src: string): { data: Buffer; mime: string } | null {
  const match = src.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;

  try {
    return { mime: match[1].toLowerCase(), data: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
}

function imageTypeFromMime(mime: string): SupportedImageType | null {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('bmp')) return 'bmp';
  return null;
}

async function buildImageRunFromSrc(src: string): Promise<ImageRun | null> {
  let data: Buffer | null = null;
  let imageType: SupportedImageType | null = null;

  if (src.startsWith('data:')) {
    const parsed = parseDataUri(src);
    data = parsed?.data || null;
    imageType = parsed ? imageTypeFromMime(parsed.mime) : null;
  } else {
    try {
      const response = await fetchWithTimeout(src, 10_000);
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

      if (!response.ok || !contentType.startsWith('image/')) {
        return null;
      }

      data = Buffer.from(await response.arrayBuffer());
      imageType = imageTypeFromMime(contentType);
    } catch {
      return null;
    }
  }

  if (!data || !imageType) return null;
  if (data.length > MAX_DOCX_IMAGE_BYTES) return null;

  return new ImageRun({
    type: imageType,
    data,
    transformation: {
      width: 520,
      height: 300,
    },
  });
}

function headingForLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  if (level === 4) return HeadingLevel.HEADING_4;
  if (level === 5) return HeadingLevel.HEADING_5;
  if (level === 6) return HeadingLevel.HEADING_6;
  return undefined;
}

async function paragraphChildrenFromInlines(inlines: RecoveredInline[], style: InlineStyle = {}): Promise<ParagraphChild[]> {
  const children: ParagraphChild[] = [];

  for (const inline of inlines) {
    if (inline.type === 'text') {
      if (inline.text.length === 0) continue;
      children.push(
        new TextRun({
          text: inline.text,
          bold: style.bold,
          italics: style.italics,
          font: style.code ? 'Courier New' : undefined,
        }),
      );
      continue;
    }

    if (inline.type === 'lineBreak') {
      children.push(new TextRun({ text: '', break: 1 }));
      continue;
    }

    if (inline.type === 'code') {
      children.push(
        new TextRun({
          text: inline.text,
          bold: style.bold,
          italics: style.italics,
          font: 'Courier New',
        }),
      );
      continue;
    }

    if (inline.type === 'strong') {
      children.push(...(await paragraphChildrenFromInlines(inline.children, { ...style, bold: true })));
      continue;
    }

    if (inline.type === 'emphasis') {
      children.push(...(await paragraphChildrenFromInlines(inline.children, { ...style, italics: true })));
      continue;
    }

    if (inline.type === 'link') {
      const linkChildren = (await paragraphChildrenFromInlines(inline.children, style)).filter(
        (child): child is TextRun => child instanceof TextRun,
      );
      if (linkChildren.length > 0) {
        children.push(new ExternalHyperlink({ link: inline.href, children: linkChildren }));
      }
      continue;
    }

    if (inline.type === 'image') {
      const imageRun = await buildImageRunFromSrc(inline.src);
      if (imageRun) {
        children.push(imageRun);
      } else {
        children.push(new TextRun({ text: `[Image: ${inline.alt || inline.title || 'image'}]`, italics: true }));
      }
    }
  }

  return children;
}

function nonEmptyParagraph(
  children: ParagraphChild[],
  options: NonNullable<ConstructorParameters<typeof Paragraph>[0]> = {},
): Paragraph {
  return new Paragraph(
    Object.assign({}, options as object, {
      children: children.length > 0 ? children : [new TextRun({ text: '' })],
    }) as ConstructorParameters<typeof Paragraph>[0],
  );
}

async function tableFromBlock(block: Extract<RecoveredBlock, { type: 'table' }>): Promise<Table> {
  const rows: TableRow[] = [];

  if (block.table.headers.length > 0) {
    rows.push(
      new TableRow({
        tableHeader: true,
        children: await Promise.all(
          block.table.headers.map(async (cell) => {
            const children = await paragraphChildrenFromInlines(cell);
            return new TableCell({
              children: [nonEmptyParagraph(children)],
            });
          }),
        ),
      }),
    );
  }

  for (const row of block.table.rows) {
    rows.push(
      new TableRow({
        children: await Promise.all(
          row.map(async (cell) => {
            const children = await paragraphChildrenFromInlines(cell);
            return new TableCell({
              children: [nonEmptyParagraph(children)],
            });
          }),
        ),
      }),
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

async function childrenFromRecoveredBlocks(blocks: RecoveredBlock[], listLevel = 0): Promise<FileChild[]> {
  const children: FileChild[] = [];

  for (const block of blocks) {
    if (block.type === 'heading') {
      children.push(
        nonEmptyParagraph(await paragraphChildrenFromInlines(block.inlines), {
          heading: headingForLevel(block.level),
        }),
      );
      continue;
    }

    if (block.type === 'paragraph') {
      children.push(nonEmptyParagraph(await paragraphChildrenFromInlines(block.inlines)));
      continue;
    }

    if (block.type === 'code') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: block.code,
              font: 'Courier New',
            }),
          ],
        }),
      );
      continue;
    }

    if (block.type === 'blockquote') {
      for (const quoteBlock of block.blocks) {
        if (quoteBlock.type === 'paragraph') {
          children.push(
            nonEmptyParagraph(await paragraphChildrenFromInlines(quoteBlock.inlines), {
              indent: { left: 420 },
            }),
          );
          continue;
        }
        if (quoteBlock.type === 'heading') {
          children.push(
            nonEmptyParagraph(await paragraphChildrenFromInlines(quoteBlock.inlines), {
              heading: headingForLevel(quoteBlock.level),
              indent: { left: 420 },
            }),
          );
          continue;
        }
        if (quoteBlock.type === 'code') {
          children.push(
            new Paragraph({
              indent: { left: 420 },
              children: [
                new TextRun({
                  text: quoteBlock.code,
                  font: 'Courier New',
                }),
              ],
            }),
          );
          continue;
        }

        children.push(...(await childrenFromRecoveredBlocks([quoteBlock], listLevel)));
      }
      continue;
    }

    if (block.type === 'figure') {
      if (block.figure.src) {
        const imageRun = await buildImageRunFromSrc(block.figure.src);
        if (imageRun) {
          children.push(new Paragraph({ children: [imageRun] }));
        }
      }

      const caption = block.figure.caption || block.figure.alt || block.figure.title;
      if (caption) {
        children.push(new Paragraph({ children: [new TextRun({ text: caption, italics: true })] }));
      }
      continue;
    }

    if (block.type === 'table') {
      children.push(await tableFromBlock(block));
      continue;
    }

    if (block.type === 'list') {
      const start = block.list.start || 1;

      for (const [index, item] of block.list.items.entries()) {
        const [firstBlock, ...restBlocks] = item.blocks;
        const markerChildren =
          firstBlock?.type === 'paragraph'
            ? await paragraphChildrenFromInlines(firstBlock.inlines)
            : firstBlock?.type === 'heading'
              ? await paragraphChildrenFromInlines(firstBlock.inlines)
              : [];

        if (block.list.ordered) {
          children.push(
            nonEmptyParagraph(
              [new TextRun({ text: `${start + index}. ` }), ...markerChildren],
              {
                indent: { left: 360 * listLevel },
              },
            ),
          );
        } else {
          children.push(
            nonEmptyParagraph(markerChildren, {
              bullet: { level: Math.min(listLevel, 8) },
            }),
          );
        }

        const nestedBlocks =
          firstBlock && firstBlock.type !== 'paragraph' && firstBlock.type !== 'heading'
            ? [firstBlock, ...restBlocks]
            : restBlocks;
        if (nestedBlocks.length > 0) {
          children.push(...(await childrenFromRecoveredBlocks(nestedBlocks, listLevel + 1)));
        }
      }
    }
  }

  return children;
}

export async function exportDocxBuffer(input: {
  title: string;
  byline: string;
  sourceUrl: string;
  document: RecoveredDocument;
}): Promise<Buffer> {
  const children = await childrenFromRecoveredBlocks(input.document.blocks);

  const document = new Document({
    creator: input.byline || 'Unknown',
    title: input.title,
    description: input.sourceUrl,
    subject: input.sourceUrl,
    sections: [
      {
        children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun('')] })],
      },
    ],
  });

  return await Packer.toBuffer(document);
}
