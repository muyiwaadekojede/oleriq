import { JSDOM } from 'jsdom';

export type RecoveredInline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: RecoveredInline[] }
  | { type: 'emphasis'; children: RecoveredInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: RecoveredInline[] }
  | { type: 'lineBreak' }
  | { type: 'image'; src: string; alt?: string; title?: string };

export type RecoveredFigure = {
  src?: string;
  alt?: string;
  title?: string;
  caption?: string;
};

export type RecoveredTable = {
  caption?: string;
  headers: RecoveredInline[][];
  rows: RecoveredInline[][][];
};

export type RecoveredListItem = {
  blocks: RecoveredBlock[];
};

export type RecoveredList = {
  ordered: boolean;
  start?: number;
  items: RecoveredListItem[];
};

export type RecoveredBlock =
  | { type: 'heading'; level: number; inlines: RecoveredInline[] }
  | { type: 'paragraph'; inlines: RecoveredInline[] }
  | { type: 'list'; list: RecoveredList }
  | { type: 'table'; table: RecoveredTable }
  | { type: 'code'; code: string }
  | { type: 'blockquote'; blocks: RecoveredBlock[] }
  | { type: 'figure'; figure: RecoveredFigure };

export type RecoveredDocument = {
  blocks: RecoveredBlock[];
};

type StructuredTextKind =
  | 'markdown'
  | 'rst'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'xml'
  | 'yaml'
  | 'yml'
  | 'log'
  | 'plain';

function normalizeText(input: string): string {
  return input.replace(/\r/g, '').replace(/\u0000/g, '');
}

function cleanWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeMarkdownText(input: string): string {
  return input.replace(/([\\`*_{}\[\]()#+\-!|>])/g, '\\$1');
}

function inlineText(inlines: RecoveredInline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === 'text') return inline.text;
      if (inline.type === 'code') return inline.text;
      if (inline.type === 'lineBreak') return '\n';
      if (inline.type === 'link' || inline.type === 'strong' || inline.type === 'emphasis') {
        return inlineText(inline.children);
      }
      if (inline.type === 'image') return inline.alt || inline.title || 'image';
      return '';
    })
    .join('');
}

function hasMeaningfulInline(inlines: RecoveredInline[]): boolean {
  return cleanWhitespace(inlineText(inlines)).length > 0 || inlines.some((inline) => inline.type === 'image');
}

function flattenAdjacentText(inlines: RecoveredInline[]): RecoveredInline[] {
  const flattened: RecoveredInline[] = [];

  for (const inline of inlines) {
    if (inline.type === 'strong' || inline.type === 'emphasis' || inline.type === 'link') {
      const children = flattenAdjacentText(inline.children);
      if (children.length === 0) continue;
      flattened.push({ ...inline, children });
      continue;
    }

    if (inline.type === 'text') {
      if (flattened[flattened.length - 1]?.type === 'text') {
        const previous = flattened[flattened.length - 1] as Extract<RecoveredInline, { type: 'text' }>;
        previous.text += inline.text;
      } else {
        flattened.push({ ...inline });
      }
      continue;
    }

    flattened.push(inline);
  }

  return flattened;
}

function inlineChildrenFromNode(node: Node): RecoveredInline[] {
  if (node.nodeType === node.TEXT_NODE) {
    const text = (node.textContent || '').replace(/\s+/g, ' ');
    if (!text.trim()) return [];
    return [{ type: 'text', text }];
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br') {
    return [{ type: 'lineBreak' }];
  }

  if (tag === 'strong' || tag === 'b') {
    return [{ type: 'strong', children: flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes))) }];
  }

  if (tag === 'em' || tag === 'i') {
    return [{ type: 'emphasis', children: flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes))) }];
  }

  if (tag === 'code' && element.parentElement?.tagName.toLowerCase() !== 'pre') {
    const text = normalizeText(element.textContent || '');
    return text.trim() ? [{ type: 'code', text }] : [];
  }

  if (tag === 'a') {
    const href = element.getAttribute('href')?.trim() || '';
    const children = flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes)));
    if (!href) return children;
    return [{ type: 'link', href, children }];
  }

  if (tag === 'img') {
    const src = element.getAttribute('src')?.trim() || '';
    if (!src) return [];
    return [
      {
        type: 'image',
        src,
        alt: element.getAttribute('alt')?.trim() || undefined,
        title: element.getAttribute('title')?.trim() || undefined,
      },
    ];
  }

  return inlineChildrenFromNodes(Array.from(element.childNodes));
}

function inlineChildrenFromNodes(nodes: Node[]): RecoveredInline[] {
  return flattenAdjacentText(nodes.flatMap((node) => inlineChildrenFromNode(node)));
}

function flushInlineParagraph(target: RecoveredBlock[], pending: RecoveredInline[]): void {
  if (!hasMeaningfulInline(pending)) return;
  target.push({ type: 'paragraph', inlines: flattenAdjacentText(pending.splice(0, pending.length)) });
}

function isBlockLikeElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return [
    'article',
    'aside',
    'blockquote',
    'div',
    'figure',
    'figcaption',
    'footer',
    'header',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'li',
    'main',
    'nav',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul',
  ].includes(tag);
}

function parseTableCellRow(row: HTMLTableRowElement): RecoveredInline[][] {
  return Array.from(row.cells).map((cell) => flattenAdjacentText(inlineChildrenFromNodes(Array.from(cell.childNodes))));
}

function recoverTable(element: HTMLTableElement): RecoveredTable | null {
  const headerRows = Array.from(element.tHead?.rows || []);
  const bodyRows = Array.from(element.tBodies).flatMap((body) => Array.from(body.rows));
  const looseRows = Array.from(element.rows).filter((row) => !headerRows.includes(row) && !bodyRows.includes(row));

  const headers = (headerRows[0] ? parseTableCellRow(headerRows[0]) : looseRows[0] ? parseTableCellRow(looseRows[0]) : [])
    .filter((cell) => hasMeaningfulInline(cell));
  const rawRows =
    bodyRows.length > 0
      ? bodyRows.map((row) => parseTableCellRow(row))
      : looseRows.slice(headers.length > 0 ? 1 : 0).map((row) => parseTableCellRow(row));
  const rows = rawRows.filter((row) => row.some((cell) => hasMeaningfulInline(cell)));
  const caption = cleanWhitespace(element.querySelector('caption')?.textContent || '') || undefined;

  if (headers.length === 0 && rows.length === 0) {
    return null;
  }

  return { headers, rows, caption };
}

function recoverFigure(element: HTMLElement): RecoveredFigure | null {
  const image = element.querySelector('img');
  const caption = cleanWhitespace(element.querySelector('figcaption')?.textContent || '') || undefined;
  if (!image && !caption) return null;

  return {
    src: image?.getAttribute('src')?.trim() || undefined,
    alt: image?.getAttribute('alt')?.trim() || undefined,
    title: image?.getAttribute('title')?.trim() || undefined,
    caption,
  };
}

function recoverListItem(element: HTMLLIElement): RecoveredListItem {
  const blocks: RecoveredBlock[] = [];
  const pendingInline: RecoveredInline[] = [];

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === child.TEXT_NODE) {
      pendingInline.push(...inlineChildrenFromNode(child));
      continue;
    }

    if (child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const childElement = child as HTMLElement;
    const tag = childElement.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      flushInlineParagraph(blocks, pendingInline);
      const list = recoverList(childElement as HTMLOListElement | HTMLUListElement);
      if (list.items.length > 0) {
        blocks.push({ type: 'list', list });
      }
      continue;
    }

    if (isBlockLikeElement(childElement) && tag !== 'span' && tag !== 'a' && tag !== 'strong' && tag !== 'em' && tag !== 'b' && tag !== 'i' && tag !== 'code') {
      flushInlineParagraph(blocks, pendingInline);
      blocks.push(...recoverBlocksFromNode(child));
      continue;
    }

    pendingInline.push(...inlineChildrenFromNode(child));
  }

  flushInlineParagraph(blocks, pendingInline);

  return {
    blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', inlines: [{ type: 'text', text: cleanWhitespace(element.textContent || '') }] }],
  };
}

function recoverList(element: HTMLOListElement | HTMLUListElement): RecoveredList {
  const ordered = element.tagName.toLowerCase() === 'ol';
  const start = ordered ? Number.parseInt(element.getAttribute('start') || '1', 10) || 1 : undefined;
  const items = Array.from(element.children)
    .filter((child): child is HTMLLIElement => child.tagName.toLowerCase() === 'li')
    .map((item) => recoverListItem(item));

  return { ordered, start, items };
}

function recoverBlocksFromContainer(element: ParentNode): RecoveredBlock[] {
  const blocks: RecoveredBlock[] = [];
  const pendingInline: RecoveredInline[] = [];

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === child.TEXT_NODE) {
      pendingInline.push(...inlineChildrenFromNode(child));
      continue;
    }

    if (child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    flushInlineParagraph(blocks, pendingInline);
    blocks.push(...recoverBlocksFromNode(child));
  }

  flushInlineParagraph(blocks, pendingInline);
  return blocks;
}

function recoverBlocksFromNode(node: Node): RecoveredBlock[] {
  if (node.nodeType === node.TEXT_NODE) {
    const text = cleanWhitespace(node.textContent || '');
    return text ? [{ type: 'paragraph', inlines: [{ type: 'text', text }] }] : [];
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'main' || tag === 'article' || tag === 'section' || tag === 'div' || tag === 'body') {
    return recoverBlocksFromContainer(element);
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number.parseInt(tag.slice(1), 10);
    const inlines = flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes)));
    return hasMeaningfulInline(inlines) ? [{ type: 'heading', level, inlines }] : [];
  }

  if (tag === 'p' || tag === 'figcaption') {
    const inlines = flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes)));
    return hasMeaningfulInline(inlines) ? [{ type: 'paragraph', inlines }] : [];
  }

  if (tag === 'blockquote') {
    const blocks = recoverBlocksFromContainer(element);
    return blocks.length > 0 ? [{ type: 'blockquote', blocks }] : [];
  }

  if (tag === 'pre') {
    const code = normalizeText(element.textContent || '').trim();
    return code ? [{ type: 'code', code }] : [];
  }

  if (tag === 'ul' || tag === 'ol') {
    const list = recoverList(element as HTMLOListElement | HTMLUListElement);
    return list.items.length > 0 ? [{ type: 'list', list }] : [];
  }

  if (tag === 'table') {
    const table = recoverTable(element as HTMLTableElement);
    return table ? [{ type: 'table', table }] : [];
  }

  if (tag === 'figure') {
    const figure = recoverFigure(element);
    if (!figure) return recoverBlocksFromContainer(element);
    return [{ type: 'figure', figure }];
  }

  if (tag === 'img') {
    const src = element.getAttribute('src')?.trim() || '';
    if (!src) return [];
    return [
      {
        type: 'figure',
        figure: {
          src,
          alt: element.getAttribute('alt')?.trim() || undefined,
          title: element.getAttribute('title')?.trim() || undefined,
        },
      },
    ];
  }

  const inlines = flattenAdjacentText(inlineChildrenFromNodes(Array.from(element.childNodes)));
  if (hasMeaningfulInline(inlines)) {
    return [{ type: 'paragraph', inlines }];
  }

  return recoverBlocksFromContainer(element);
}

export function recoverDocumentFromHtml(html: string): RecoveredDocument {
  const dom = new JSDOM(`<body>${html}</body>`);

  try {
    return {
      blocks: recoverBlocksFromContainer(dom.window.document.body),
    };
  } finally {
    dom.window.close();
  }
}

function renderInlineToHtml(inline: RecoveredInline): string {
  if (inline.type === 'text') return escapeHtml(inline.text);
  if (inline.type === 'lineBreak') return '<br/>';
  if (inline.type === 'code') return `<code>${escapeHtml(inline.text)}</code>`;
  if (inline.type === 'strong') return `<strong>${inline.children.map(renderInlineToHtml).join('')}</strong>`;
  if (inline.type === 'emphasis') return `<em>${inline.children.map(renderInlineToHtml).join('')}</em>`;
  if (inline.type === 'link') {
    return `<a href="${escapeHtml(inline.href)}">${inline.children.map(renderInlineToHtml).join('')}</a>`;
  }
  if (inline.type === 'image') {
    const alt = inline.alt ? ` alt="${escapeHtml(inline.alt)}"` : '';
    const title = inline.title ? ` title="${escapeHtml(inline.title)}"` : '';
    return `<img src="${escapeHtml(inline.src)}"${alt}${title}/>`;
  }
  return '';
}

function renderInlinesToHtml(inlines: RecoveredInline[]): string {
  return inlines.map(renderInlineToHtml).join('');
}

function renderBlockToHtml(block: RecoveredBlock): string {
  if (block.type === 'heading') return `<h${block.level}>${renderInlinesToHtml(block.inlines)}</h${block.level}>`;
  if (block.type === 'paragraph') return `<p>${renderInlinesToHtml(block.inlines)}</p>`;
  if (block.type === 'code') return `<pre><code>${escapeHtml(block.code)}</code></pre>`;
  if (block.type === 'blockquote') {
    return `<blockquote>${block.blocks.map(renderBlockToHtml).join('\n')}</blockquote>`;
  }
  if (block.type === 'figure') {
    const imageHtml = block.figure.src
      ? `<img src="${escapeHtml(block.figure.src)}"${
          block.figure.alt ? ` alt="${escapeHtml(block.figure.alt)}"` : ''
        }${block.figure.title ? ` title="${escapeHtml(block.figure.title)}"` : ''}/>`
      : '';
    const captionHtml = block.figure.caption ? `<figcaption>${escapeHtml(block.figure.caption)}</figcaption>` : '';
    return `<figure>${imageHtml}${captionHtml}</figure>`;
  }
  if (block.type === 'table') {
    const caption = block.table.caption ? `<caption>${escapeHtml(block.table.caption)}</caption>` : '';
    const thead =
      block.table.headers.length > 0
        ? `<thead><tr>${block.table.headers.map((cell) => `<th>${renderInlinesToHtml(cell)}</th>`).join('')}</tr></thead>`
        : '';
    const tbody = `<tbody>${block.table.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${renderInlinesToHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody>`;
    return `<table>${caption}${thead}${tbody}</table>`;
  }
  if (block.type === 'list') {
    const tag = block.list.ordered ? 'ol' : 'ul';
    const start = block.list.ordered && block.list.start && block.list.start !== 1 ? ` start="${block.list.start}"` : '';
    const items = block.list.items
      .map((item) => `<li>${item.blocks.map(renderBlockToHtml).join('')}</li>`)
      .join('');
    return `<${tag}${start}>${items}</${tag}>`;
  }
  return '';
}

export function serializeRecoveredDocumentToHtml(document: RecoveredDocument): string {
  return document.blocks.map(renderBlockToHtml).join('\n');
}

function renderInlineToMarkdown(inline: RecoveredInline): string {
  if (inline.type === 'text') return escapeMarkdownText(inline.text);
  if (inline.type === 'lineBreak') return '  \n';
  if (inline.type === 'code') return `\`${inline.text.replace(/`/g, '\\`')}\``;
  if (inline.type === 'strong') return `**${inline.children.map(renderInlineToMarkdown).join('')}**`;
  if (inline.type === 'emphasis') return `*${inline.children.map(renderInlineToMarkdown).join('')}*`;
  if (inline.type === 'link') return `[${inline.children.map(renderInlineToMarkdown).join('')}](${inline.href})`;
  if (inline.type === 'image') {
    const alt = escapeMarkdownText(inline.alt || inline.title || 'image');
    return `![${alt}](${inline.src})`;
  }
  return '';
}

function renderInlineGroupToMarkdown(inlines: RecoveredInline[]): string {
  return inlines.map(renderInlineToMarkdown).join('').replace(/[ \t]+\n/g, '\n').trim();
}

function renderInlineGroupToText(inlines: RecoveredInline[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === 'text') return inline.text;
      if (inline.type === 'lineBreak') return '\n';
      if (inline.type === 'code') return inline.text;
      if (inline.type === 'strong' || inline.type === 'emphasis' || inline.type === 'link') {
        return renderInlineGroupToText(inline.children);
      }
      if (inline.type === 'image') return `[Image: ${inline.alt || inline.title || 'image'}]`;
      return '';
    })
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function indentLines(lines: string[], prefix: string): string[] {
  return lines.map((line) => (line.length > 0 ? `${prefix}${line}` : line));
}

function renderBlocksToMarkdown(blocks: RecoveredBlock[], depth = 0): string[] {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.type === 'heading') {
      lines.push(`${'#'.repeat(Math.min(Math.max(block.level, 1), 6))} ${renderInlineGroupToMarkdown(block.inlines)}`.trim());
      lines.push('');
      continue;
    }

    if (block.type === 'paragraph') {
      lines.push(renderInlineGroupToMarkdown(block.inlines));
      lines.push('');
      continue;
    }

    if (block.type === 'code') {
      lines.push('```');
      lines.push(...normalizeText(block.code).split('\n'));
      lines.push('```');
      lines.push('');
      continue;
    }

    if (block.type === 'blockquote') {
      const inner = renderBlocksToMarkdown(block.blocks, depth);
      lines.push(...indentLines(inner.filter((line, index, all) => !(index === all.length - 1 && line === '')), '> '));
      lines.push('');
      continue;
    }

    if (block.type === 'figure') {
      if (block.figure.src) {
        lines.push(`![${escapeMarkdownText(block.figure.alt || block.figure.caption || 'image')}](${block.figure.src})`);
      }
      if (block.figure.caption) {
        lines.push(`*${escapeMarkdownText(block.figure.caption)}*`);
      }
      lines.push('');
      continue;
    }

    if (block.type === 'table') {
      const headerCells =
        block.table.headers.length > 0
          ? block.table.headers
          : block.table.rows[0] || [];
      const bodyRows =
        block.table.headers.length > 0
          ? block.table.rows
          : block.table.rows.slice(headerCells.length > 0 ? 1 : 0);

      if (block.table.caption) {
        lines.push(`*${escapeMarkdownText(block.table.caption)}*`);
      }
      if (headerCells.length > 0) {
        lines.push(`| ${headerCells.map((cell) => renderInlineGroupToMarkdown(cell) || ' ').join(' | ')} |`);
        lines.push(`| ${headerCells.map(() => '---').join(' | ')} |`);
        for (const row of bodyRows) {
          lines.push(`| ${row.map((cell) => renderInlineGroupToMarkdown(cell) || ' ').join(' | ')} |`);
        }
      }
      lines.push('');
      continue;
    }

    if (block.type === 'list') {
      const baseIndent = '  '.repeat(depth);
      const start = block.list.start || 1;

      block.list.items.forEach((item, index) => {
        const marker = block.list.ordered ? `${start + index}.` : '-';
        const itemBlocks = item.blocks.length > 0 ? item.blocks : [{ type: 'paragraph', inlines: [{ type: 'text', text: '' }] } as RecoveredBlock];
        const [firstBlock, ...restBlocks] = itemBlocks;

        if (firstBlock.type === 'paragraph') {
          lines.push(`${baseIndent}${marker} ${renderInlineGroupToMarkdown(firstBlock.inlines)}`.trimEnd());
        } else if (firstBlock.type === 'heading') {
          lines.push(`${baseIndent}${marker} ${renderInlineGroupToMarkdown(firstBlock.inlines)}`.trimEnd());
        } else {
          lines.push(`${baseIndent}${marker}`);
          lines.push(...indentLines(renderBlocksToMarkdown([firstBlock], depth + 1).filter((line) => line !== ''), `${baseIndent}  `));
        }

        for (const nestedBlock of restBlocks) {
          if (nestedBlock.type === 'list') {
            lines.push(...renderBlocksToMarkdown([nestedBlock], depth + 1).filter((line) => line !== ''));
            continue;
          }

          const nestedLines = renderBlocksToMarkdown([nestedBlock], depth + 1).filter((line) => line !== '');
          lines.push(...indentLines(nestedLines, `${baseIndent}  `));
        }
      });

      lines.push('');
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}

function renderBlocksToText(blocks: RecoveredBlock[], depth = 0): string[] {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.type === 'heading') {
      lines.push(`[H${block.level}] ${renderInlineGroupToText(block.inlines)}`.trim());
      lines.push('');
      continue;
    }

    if (block.type === 'paragraph') {
      lines.push(renderInlineGroupToText(block.inlines));
      lines.push('');
      continue;
    }

    if (block.type === 'code') {
      lines.push('```');
      lines.push(...normalizeText(block.code).split('\n'));
      lines.push('```');
      lines.push('');
      continue;
    }

    if (block.type === 'blockquote') {
      const inner = renderBlocksToText(block.blocks, depth);
      lines.push(...indentLines(inner.filter((line, index, all) => !(index === all.length - 1 && line === '')), '> '));
      lines.push('');
      continue;
    }

    if (block.type === 'figure') {
      const label = block.figure.caption || block.figure.alt || block.figure.title || 'image';
      lines.push(`[Image] ${label}`);
      lines.push('');
      continue;
    }

    if (block.type === 'table') {
      lines.push('[Table]');
      if (block.table.caption) {
        lines.push(block.table.caption);
      }
      if (block.table.headers.length > 0) {
        lines.push(block.table.headers.map((cell) => renderInlineGroupToText(cell)).join(' | '));
      }
      for (const row of block.table.rows) {
        lines.push(row.map((cell) => renderInlineGroupToText(cell)).join(' | '));
      }
      lines.push('');
      continue;
    }

    if (block.type === 'list') {
      const baseIndent = '  '.repeat(depth);
      const start = block.list.start || 1;

      block.list.items.forEach((item, index) => {
        const marker = block.list.ordered ? `${start + index}.` : '-';
        const itemBlocks = item.blocks.length > 0 ? item.blocks : [{ type: 'paragraph', inlines: [{ type: 'text', text: '' }] } as RecoveredBlock];
        const [firstBlock, ...restBlocks] = itemBlocks;

        if (firstBlock.type === 'paragraph') {
          lines.push(`${baseIndent}${marker} ${renderInlineGroupToText(firstBlock.inlines)}`.trimEnd());
        } else if (firstBlock.type === 'heading') {
          lines.push(`${baseIndent}${marker} ${renderInlineGroupToText(firstBlock.inlines)}`.trimEnd());
        } else {
          lines.push(`${baseIndent}${marker}`);
          lines.push(...indentLines(renderBlocksToText([firstBlock], depth + 1).filter((line) => line !== ''), `${baseIndent}  `));
        }

        for (const nestedBlock of restBlocks) {
          if (nestedBlock.type === 'list') {
            lines.push(...renderBlocksToText([nestedBlock], depth + 1).filter((line) => line !== ''));
            continue;
          }

          const nestedLines = renderBlocksToText([nestedBlock], depth + 1).filter((line) => line !== '');
          lines.push(...indentLines(nestedLines, `${baseIndent}  `));
        }
      });

      lines.push('');
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}

export function renderRecoveredDocumentToMarkdown(document: RecoveredDocument): string {
  return renderBlocksToMarkdown(document.blocks).join('\n').trim();
}

export function renderRecoveredDocumentToText(document: RecoveredDocument): string {
  return renderBlocksToText(document.blocks).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function countLeadingSpaces(line: string): number {
  const match = line.match(/^\s*/);
  return match?.[0]?.length || 0;
}

function parseDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function recoverTableFromDelimitedText(text: string, delimiter: ',' | '\t'): RecoveredDocument {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { blocks: [] };

  const headers = parseDelimitedLine(lines[0], delimiter).map((cell) => [{ type: 'text', text: cell }] as RecoveredInline[]);
  const rows = lines.slice(1).map((line) =>
    parseDelimitedLine(line, delimiter).map((cell) => [{ type: 'text', text: cell }] as RecoveredInline[]),
  );

  return {
    blocks: [{ type: 'table', table: { headers, rows } }],
  };
}

function recoverDocumentFromPlainText(text: string): RecoveredDocument {
  const blocks = normalizeText(text)
    .split(/\n{2,}/)
    .map((part) => cleanWhitespace(part))
    .filter(Boolean)
    .map((part) => ({ type: 'paragraph', inlines: [{ type: 'text', text: part }] } as RecoveredBlock));

  return { blocks };
}

function recoverDocumentFromPreformattedText(text: string): RecoveredDocument {
  const normalized = normalizeText(text).trim();
  if (!normalized) return { blocks: [] };
  return { blocks: [{ type: 'code', code: normalized }] };
}

function buildParagraphBlockFromText(text: string): RecoveredBlock {
  return {
    type: 'paragraph',
    inlines: [{ type: 'text', text: text.trim() }],
  };
}

function ensureListAtDepth(stack: Array<{ indent: number; list: RecoveredList }>, indent: number, ordered: boolean): RecoveredList {
  const current = stack[stack.length - 1];
  if (current && current.indent === indent && current.list.ordered === ordered) {
    return current.list;
  }

  while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
    stack.pop();
  }

  const list: RecoveredList = { ordered, items: [] };
  if (stack.length === 0) {
    stack.push({ indent, list });
    return list;
  }

  const parent = stack[stack.length - 1].list;
  const parentItem = parent.items[parent.items.length - 1];
  if (!parentItem) {
    parent.items.push({ blocks: [] });
  }
  const owningItem = parent.items[parent.items.length - 1];
  owningItem.blocks.push({ type: 'list', list });
  stack.push({ indent, list });
  return list;
}

function recoverDocumentFromMarkdownLike(text: string): RecoveredDocument {
  const normalized = normalizeText(text).replace(/\t/g, '  ');
  const lines = normalized.split('\n');
  const blocks: RecoveredBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        inlines: [{ type: 'text', text: headingMatch[2].trim() }],
      });
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', code: codeLines.join('\n').trimEnd() });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', blocks: recoverDocumentFromMarkdownLike(quoteLines.join('\n')).blocks });
      continue;
    }

    const tableSeparator = lines[index + 1]?.trim() || '';
    if (trimmed.includes('|') && /^[:|\-\s]+$/.test(tableSeparator)) {
      const tableLines = [trimmed];
      index += 2;
      while (index < lines.length && lines[index].trim().includes('|')) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const headerCells = tableLines[0]
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => [{ type: 'text', text: cell.trim() }] as RecoveredInline[]);
      const rows = tableLines.slice(1).map((row) =>
        row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => [{ type: 'text', text: cell.trim() }] as RecoveredInline[]),
      );
      blocks.push({ type: 'table', table: { headers: headerCells, rows } });
      continue;
    }

    const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (unorderedMatch || orderedMatch) {
      const rootLists: Array<{ indent: number; list: RecoveredList }> = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        const unordered = currentLine.match(/^(\s*)[-*+]\s+(.*)$/);
        const ordered = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (!unordered && !ordered) break;

        const isOrdered = Boolean(ordered);
        const indent = countLeadingSpaces(currentLine);
        const textValue = isOrdered ? ordered?.[3] || '' : unordered?.[2] || '';
        const list = ensureListAtDepth(rootLists, indent, isOrdered);
        list.items.push({ blocks: [buildParagraphBlockFromText(textValue)] });
        index += 1;
      }

      if (rootLists[0]) {
        blocks.push({ type: 'list', list: rootLists[0].list });
      }
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next) {
        index += 1;
        break;
      }
      if (
        /^(#{1,6})\s+/.test(next) ||
        /^```/.test(next) ||
        next.startsWith('>') ||
        /^(\s*)[-*+]\s+/.test(lines[index]) ||
        /^(\s*)(\d+)\.\s+/.test(lines[index])
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(buildParagraphBlockFromText(paragraphLines.join(' ')));
  }

  return { blocks };
}

export function recoverDocumentFromStructuredText(input: {
  text: string;
  kind: StructuredTextKind;
}): RecoveredDocument {
  if (input.kind === 'csv') {
    return recoverTableFromDelimitedText(input.text, ',');
  }

  if (input.kind === 'tsv') {
    return recoverTableFromDelimitedText(input.text, '\t');
  }

  if (input.kind === 'markdown' || input.kind === 'rst') {
    return recoverDocumentFromMarkdownLike(input.text);
  }

  if (input.kind === 'json' || input.kind === 'xml' || input.kind === 'yaml' || input.kind === 'yml' || input.kind === 'log') {
    return recoverDocumentFromPreformattedText(input.text);
  }

  return recoverDocumentFromPlainText(input.text);
}

export function countRecoveredTables(document: RecoveredDocument): number {
  let count = 0;

  function walk(blocks: RecoveredBlock[]): void {
    for (const block of blocks) {
      if (block.type === 'table') count += 1;
      if (block.type === 'blockquote') walk(block.blocks);
      if (block.type === 'list') {
        for (const item of block.list.items) {
          walk(item.blocks);
        }
      }
    }
  }

  walk(document.blocks);
  return count;
}

export function recoveredDocumentSignals(document: RecoveredDocument): {
  hasTable: boolean;
  hasNestedList: boolean;
  hasCodeBlock: boolean;
  hasDeepHeading: boolean;
} {
  const signals = {
    hasTable: false,
    hasNestedList: false,
    hasCodeBlock: false,
    hasDeepHeading: false,
  };

  function walk(blocks: RecoveredBlock[], nestedListDepth = 0): void {
    for (const block of blocks) {
      if (block.type === 'heading' && block.level > 3) {
        signals.hasDeepHeading = true;
      }
      if (block.type === 'table') {
        signals.hasTable = true;
      }
      if (block.type === 'code') {
        signals.hasCodeBlock = true;
      }
      if (block.type === 'blockquote') {
        walk(block.blocks, nestedListDepth);
      }
      if (block.type === 'list') {
        if (nestedListDepth > 0) {
          signals.hasNestedList = true;
        }
        for (const item of block.list.items) {
          walk(item.blocks, nestedListDepth + 1);
          if (item.blocks.some((child) => child.type === 'list')) {
            signals.hasNestedList = true;
          }
        }
      }
    }
  }

  walk(document.blocks);
  return signals;
}
