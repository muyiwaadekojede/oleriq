import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { Document, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';

const DEFAULT_FIXTURE_DIR = '.tmp-batch-document-fixtures';
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAArElEQVR4nO3RMQ0AIADAMMC/5+GiPEgU9LpnUTivA35hdMDoQNGBogNFB4oOFB0oOlB0oOhA0YGiA0UHig4UHSo6UHSg6EDRgaIDRQeKDhQdKDpQdKDoQNGBogNFB4oOFB0oOlB0oOhA0YGiA0UHig4UHSo6UHSg6EDRgaIDRQeKDhQdKDpQdKDoQNGBogNFB4oOFB0oOlB0oOhA0YGiA8UA8d0BIP3AdK4AAAAASUVORK5CYII=';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const PNG_DATA_URI = `data:image/png;base64,${PNG_BASE64}`;

const GENERATED_DOCUMENT_FIXTURES = {
  txt: {
    filename: 'plain-notes.txt',
    contentType: 'text/plain; charset=utf-8',
    create: async () => Buffer.from(createPlainTextFixture(), 'utf8'),
  },
  md: {
    filename: 'reference-structure.md',
    contentType: 'text/markdown; charset=utf-8',
    create: async () => Buffer.from(createMarkdownFixture(), 'utf8'),
  },
  csv: {
    filename: 'comparison-grid.csv',
    contentType: 'text/csv; charset=utf-8',
    create: async () => Buffer.from(createCsvFixture(','), 'utf8'),
  },
  tsv: {
    filename: 'comparison-grid.tsv',
    contentType: 'text/tab-separated-values; charset=utf-8',
    create: async () => Buffer.from(createCsvFixture('\t'), 'utf8'),
  },
  json: {
    filename: 'batch-summary.json',
    contentType: 'application/json',
    create: async () => Buffer.from(createJsonFixture(), 'utf8'),
  },
  xml: {
    filename: 'batch-summary.xml',
    contentType: 'application/xml',
    create: async () => Buffer.from(createXmlFixture(), 'utf8'),
  },
  yaml: {
    filename: 'batch-summary.yaml',
    contentType: 'text/plain; charset=utf-8',
    create: async () => Buffer.from(createYamlFixture(), 'utf8'),
  },
  yml: {
    filename: 'batch-summary.yml',
    contentType: 'text/plain; charset=utf-8',
    create: async () => Buffer.from(createYamlFixture(), 'utf8'),
  },
  log: {
    filename: 'batch-run.log',
    contentType: 'text/plain; charset=utf-8',
    create: async () => Buffer.from(createLogFixture(), 'utf8'),
  },
  rst: {
    filename: 'batch-guide.rst',
    contentType: 'text/plain; charset=utf-8',
    create: async () => Buffer.from(createRstFixture(), 'utf8'),
  },
  docx: {
    filename: 'tiny-picture.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    create: createDocxFixtureBuffer,
  },
  epub: {
    filename: 'illustrated-sample.epub',
    contentType: 'application/epub+zip',
    create: createEpubFixtureBuffer,
  },
  html: {
    filename: 'illustrated-sample.html',
    contentType: 'text/html; charset=utf-8',
    create: async () => Buffer.from(createHtmlFixtureDocument('HTML Fixture'), 'utf8'),
  },
  htm: {
    filename: 'illustrated-sample.htm',
    contentType: 'text/html; charset=utf-8',
    create: async () => Buffer.from(createHtmlFixtureDocument('HTM Fixture'), 'utf8'),
  },
};

const GENERATED_PDF_FIXTURES = {
  pdfInline: {
    filename: 'inline-image.pdf',
    contentType: 'application/pdf',
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: #111827;
      }
      main {
        width: 6.25in;
        margin: 0.6in auto 0.75in;
      }
      h1 {
        font-size: 28px;
        margin: 0 0 18px;
      }
      p {
        font-size: 15px;
        line-height: 1.55;
        margin: 0 0 14px;
      }
      figure {
        margin: 20px 0 18px;
      }
      figure img {
        display: block;
        width: 180px;
        height: 180px;
      }
      figcaption {
        font-size: 13px;
        margin-top: 8px;
        color: #374151;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Inline PDF Fixture</h1>
      <p>Before image paragraph. The next figure should stay near this section when converted.</p>
      <figure>
        <img src="${PNG_DATA_URI}" alt="inline figure" />
        <figcaption>Inline figure</figcaption>
      </figure>
      <p>After image paragraph. This text should follow the retained figure in reading order.</p>
    </main>
  </body>
</html>`,
  },
  pdfDecorative: {
    filename: 'decorative-header.pdf',
    contentType: 'application/pdf',
    html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: #111827;
      }
      .frame {
        width: 7.4in;
        margin: 0.5in auto 0.65in;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 28px;
      }
      .hero-copy {
        width: 4.4in;
      }
      .hero-copy h1 {
        font-size: 28px;
        margin: 0 0 10px;
      }
      .hero-copy p {
        font-size: 15px;
        line-height: 1.55;
        margin: 0;
      }
      .hero-art {
        width: 170px;
        height: 170px;
        object-fit: cover;
        border-radius: 20px;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
      }
      .article {
        width: 4.5in;
        margin-top: 28px;
      }
      .article p {
        font-size: 15px;
        line-height: 1.6;
        margin: 0 0 14px;
      }
    </style>
  </head>
  <body>
    <div class="frame">
      <section class="hero">
        <div class="hero-copy">
          <h1>Decorative PDF Fixture</h1>
          <p>This cover art sits beside the lead copy rather than inside the main text column.</p>
        </div>
        <img class="hero-art" src="${PNG_DATA_URI}" alt="decorative badge" />
      </section>
      <section class="article">
        <p>Body paragraph one. The converter should keep this text flow stable and honest.</p>
        <p>Body paragraph two. A low-confidence image should appear later in page order instead of being forced into this paragraph flow.</p>
      </section>
    </div>
  </body>
</html>`,
  },
};

function createHtmlFixtureDocument(title) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body {
        font-family: Georgia, "Times New Roman", serif;
        color: #111827;
        margin: 0;
        padding: 32px;
      }
      h1 {
        font-size: 30px;
        margin: 0 0 16px;
      }
      p {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 14px;
      }
      figure {
        margin: 18px 0;
      }
      figure img {
        display: block;
        width: 120px;
        height: 120px;
      }
      figcaption {
        font-size: 14px;
        color: #4b5563;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>Before image paragraph. This fixture is deterministic and image-aware.</p>
    <figure>
      <img src="${PNG_DATA_URI}" alt="blue square" />
      <figcaption>Blue square</figcaption>
    </figure>
    <p>After image paragraph. This text should remain in reading order.</p>
  </body>
</html>`;
}

function createPlainTextFixture() {
  return [
    'Oleriq plain text fixture',
    '',
    'This file exercises plain text uploads with short paragraphs and simple reference lines.',
    '',
    'Batch trust should stay readable even when the source has no rich structure.',
  ].join('\n');
}

function createMarkdownFixture() {
  return [
    '# Markdown Fixture',
    '',
    'This fixture uses a common technical-note shape.',
    '',
    '## Outline',
    '',
    '- Primary item',
    '- Nested ideas',
    '  - Child A',
    '  - Child B',
    '',
    '## Table',
    '',
    '| Format | Trust signal |',
    '| --- | --- |',
    '| Markdown | Strong |',
    '| TXT | Needs review |',
    '',
    '## Code',
    '',
    '```ts',
    'function keepTrust(value: string) {',
    '  return value.trim();',
    '}',
    '```',
  ].join('\n');
}

function createCsvFixture(delimiter) {
  return [
    ['format', 'structure', 'notes'].join(delimiter),
    ['pdf', 'high', 'Retains page layout'].join(delimiter),
    ['md', 'medium', 'Readable but lighter'].join(delimiter),
    ['txt', 'low', 'Table shape is flattened'].join(delimiter),
  ].join('\n');
}

function createJsonFixture() {
  return JSON.stringify(
    {
      title: 'Batch Summary Fixture',
      resultState: 'degraded',
      diagnostics: ['structure_table_loss_risk', 'document_pdf_truncated_pages'],
      rows: [
        { format: 'pdf', trust: 'usable' },
        { format: 'txt', trust: 'degraded' },
      ],
    },
    null,
    2,
  );
}

function createXmlFixture() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<batchSummary>
  <title>Batch Summary Fixture</title>
  <resultState>degraded</resultState>
  <diagnostics>
    <reason>structure_table_loss_risk</reason>
    <reason>document_pdf_truncated_pages</reason>
  </diagnostics>
  <rows>
    <row format="pdf" trust="usable" />
    <row format="txt" trust="degraded" />
  </rows>
</batchSummary>`;
}

function createYamlFixture() {
  return [
    'title: Batch Summary Fixture',
    'result_state: degraded',
    'diagnostics:',
    '  - structure_table_loss_risk',
    '  - document_pdf_truncated_pages',
    'rows:',
    '  - format: pdf',
    '    trust: usable',
    '  - format: txt',
    '    trust: degraded',
  ].join('\n');
}

function createLogFixture() {
  return [
    '2026-05-20T10:00:00Z INFO batch started format=txt',
    '2026-05-20T10:00:04Z WARN structure_table_loss_risk row=1',
    '2026-05-20T10:00:06Z WARN document_pdf_truncated_pages row=2',
    '2026-05-20T10:00:08Z INFO batch completed usable=0 degraded=2 failed=0',
  ].join('\n');
}

function createRstFixture() {
  return [
    'Batch Guide Fixture',
    '===================',
    '',
    'Overview',
    '--------',
    '',
    '- Primary item',
    '- Nested items are listed below',
    '',
    'Code sample::',
    '',
    '   function keepTrust(value) {',
    '     return value.trim()',
    '   }',
  ].join('\n');
}

async function createDocxFixtureBuffer() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'DOCX Fixture', bold: true })],
          }),
          new Paragraph({
            children: [new TextRun('Before image paragraph. This fixture is deterministic and image-aware.')],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: PNG_BYTES,
                type: 'png',
                transformation: { width: 72, height: 72 },
                altText: {
                  title: 'blue square',
                  description: 'blue square',
                  name: 'blue square',
                },
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun('After image paragraph. This text should remain in reading order.')],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

async function createEpubFixtureBuffer() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>EPUB Fixture</dc:title>
    <dc:identifier id="BookId">fixture-book</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="img1" href="images/blue.png" media-type="image/png"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`,
  );
  zip.file(
    'OEBPS/chapter1.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter One</title></head>
  <body>
    <h1>Chapter One</h1>
    <p>Before image paragraph. This fixture is deterministic and image-aware.</p>
    <figure>
      <img src="images/blue.png" alt="blue square" />
      <figcaption>Blue square</figcaption>
    </figure>
    <p>After image paragraph. This text should remain in reading order.</p>
  </body>
</html>`,
  );
  zip.file('OEBPS/images/blue.png', PNG_BYTES);
  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

async function ensureGeneratedFixtureFile(dir, key, spec) {
  const localPath = path.join(dir, spec.filename);

  try {
    const stat = await fs.stat(localPath);
    if (stat.size > 0) {
      return {
        key,
        ...spec,
        localPath,
        byteSize: stat.size,
        imageCapable: true,
      };
    }
  } catch {
    // Generate the fixture when it is not cached locally.
  }

  const bytes = await spec.create();
  await fs.writeFile(localPath, bytes);

  return {
    key,
    ...spec,
    localPath,
    byteSize: bytes.length,
    imageCapable: true,
  };
}

async function renderPdfFixture(browser, localPath, html) {
  const page = await browser.newPage({ viewport: { width: 960, height: 1280 } });

  try {
    await page.emulateMedia({ media: 'screen' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: localPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.45in',
        right: '0.45in',
        bottom: '0.55in',
        left: '0.45in',
      },
    });
  } finally {
    await page.close();
  }
}

async function ensureGeneratedPdfFixtures(dir) {
  const fixtures = {};
  let browser = null;

  try {
    for (const [key, spec] of Object.entries(GENERATED_PDF_FIXTURES)) {
      const localPath = path.join(dir, spec.filename);
      let byteSize = 0;

      try {
        const stat = await fs.stat(localPath);
        if (stat.size > 0) {
          byteSize = stat.size;
        }
      } catch {
        // Render the deterministic fixture below.
      }

      if (byteSize === 0) {
        browser ??= await chromium.launch({ headless: true });
        await renderPdfFixture(browser, localPath, spec.html);
        const stat = await fs.stat(localPath);
        byteSize = stat.size;
      }

      fixtures[key] = {
        key,
        filename: spec.filename,
        contentType: spec.contentType,
        localPath,
        byteSize,
        imageCapable: true,
      };
    }
  } finally {
    await browser?.close();
  }

  return fixtures;
}

export async function prepareRealDocumentFixtures(options = {}) {
  const dirName = options.dirName || DEFAULT_FIXTURE_DIR;
  const dir = path.join(process.cwd(), dirName);
  await fs.mkdir(dir, { recursive: true });

  const entries = await Promise.all(
    Object.entries(GENERATED_DOCUMENT_FIXTURES).map(([key, spec]) =>
      ensureGeneratedFixtureFile(dir, key, spec),
    ),
  );

  const generatedPdfFixtures = await ensureGeneratedPdfFixtures(dir);
  const fixtures = {
    ...Object.fromEntries(entries.map((fixture) => [fixture.key, fixture])),
    ...generatedPdfFixtures,
  };
  return { dir, fixtures };
}

export async function prepareGeneratedPdfFixtures(options = {}) {
  const dirName = options.dirName || DEFAULT_FIXTURE_DIR;
  const dir = path.join(process.cwd(), dirName);
  await fs.mkdir(dir, { recursive: true });
  const fixtures = await ensureGeneratedPdfFixtures(dir);
  return { dir, fixtures };
}

export async function readUploadPayload(fixture) {
  return {
    name: fixture.filename,
    mimeType: fixture.contentType,
    buffer: await fs.readFile(fixture.localPath),
  };
}
