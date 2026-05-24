import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { prepareGeneratedPdfFixtures } from './batch-document-fixtures.mjs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const tempDir = path.join(process.cwd(), '.tmp-check-document-image-conversion');
const sessionId = `check-document-image-${Date.now()}`;
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2WQAAAAASUVORK5CYII=';
const pngBytes = Buffer.from(pngBase64, 'base64');
const dataUri = `data:image/png;base64,${pngBase64}`;

function fail(message) {
  throw new Error(message);
}

function containsReadableCaption(output, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:\\\\)?\\[Image:\\s*${escaped}(?:\\\\)?\\]`, 'i');
  return pattern.test(output);
}

function containsMarkdownImage(output) {
  return /!\[[^\]]*\]\(data:image/i.test(output);
}

async function createFixtures() {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const htmlPath = path.join(tempDir, 'image-note.html');
  const docxPath = path.join(tempDir, 'image-note.docx');
  const epubDir = path.join(tempDir, 'epub-src');
  const epubPath = path.join(tempDir, 'image-note.epub');

  await fs.writeFile(
    htmlPath,
    `<!doctype html><html><body><h1>HTML Fixture</h1><p>Before image.</p><img src="${dataUri}" alt="blue square" /><p>After image.</p></body></html>`,
    'utf8',
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('DOCX Fixture')] }),
          new Paragraph({ children: [new TextRun('Before image.')] }),
          new Paragraph({
            children: [
              new ImageRun({
                data: pngBytes,
                type: 'png',
                transformation: { width: 32, height: 32 },
                altText: { title: 'blue square', description: 'blue square', name: 'blue square' },
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun('After image.')] }),
        ],
      },
    ],
  });
  await fs.writeFile(docxPath, await Packer.toBuffer(doc));

  await fs.mkdir(path.join(epubDir, 'META-INF'), { recursive: true });
  await fs.mkdir(path.join(epubDir, 'OEBPS', 'images'), { recursive: true });
  await fs.writeFile(path.join(epubDir, 'mimetype'), 'application/epub+zip', 'utf8');
  await fs.writeFile(
    path.join(epubDir, 'META-INF', 'container.xml'),
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    'utf8',
  );
  await fs.writeFile(
    path.join(epubDir, 'OEBPS', 'content.opf'),
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
    'utf8',
  );
  await fs.writeFile(
    path.join(epubDir, 'OEBPS', 'chapter1.xhtml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chapter One</title></head>
  <body>
    <h1>Chapter One</h1>
    <p>Before image.</p>
    <img src="images/blue.png" alt="blue square" />
    <p>After image.</p>
  </body>
</html>`,
    'utf8',
  );
  await fs.writeFile(path.join(epubDir, 'OEBPS', 'images', 'blue.png'), pngBytes);

  const py = [
    'import pathlib, zipfile',
    `root = pathlib.Path(r"${epubDir.replace(/\\/g, '\\\\')}")`,
    `target = pathlib.Path(r"${epubPath.replace(/\\/g, '\\\\')}")`,
    'with zipfile.ZipFile(target, "w") as zf:',
    '    for file_path in sorted(root.rglob("*")):',
    '        if file_path.is_file():',
    '            zf.write(file_path, file_path.relative_to(root).as_posix())',
  ].join('\n');
  execFileSync('python', ['-c', py], { stdio: 'inherit' });

  const { fixtures: generatedPdfFixtures } = await prepareGeneratedPdfFixtures({
    dirName: path.join('.tmp-check-document-image-conversion', 'generated-pdf-fixtures'),
  });

  return { htmlPath, docxPath, epubPath, generatedPdfFixtures };
}

async function uploadAndFinalize(filePath, contentType) {
  const filename = path.basename(filePath);
  const bytes = await fs.readFile(filePath);
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes,
    },
  );

  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Upload failed for ${filename}: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
    },
    body: JSON.stringify({
      mode: 'filesystem',
      objectKey: uploadJson.file.objectKey,
      objectUrl: uploadJson.file.objectUrl,
      downloadUrl: uploadJson.file.downloadUrl,
      filename: uploadJson.file.originalFilename,
      contentType: uploadJson.file.contentType,
      byteSize: uploadJson.file.byteSize,
    }),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Finalize failed for ${filename}: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  return completeJson.file.uploadId;
}

async function runBatch(uploadId, format, images) {
  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: [{ uploadId }],
      format,
      images,
      settings: {
        fontFace: 'serif',
        fontSize: 16,
        lineSpacing: 1.6,
        colorTheme: 'light',
      },
    }),
  });
  const createJson = await createResponse.json();
  if (!createResponse.ok || !createJson.success || !createJson.job?.jobId) {
    fail(`Batch create failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 120_000;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: { 'x-oleriq-session': sessionId },
      },
    );
    const json = await response.json();

    if (json.job?.status === 'completed') {
      const item = json.items?.[0];
      const downloadResponse = await fetch(
        `${baseUrl}/api/batch-jobs/download?jobId=${encodeURIComponent(jobId)}&itemId=${item.id}`,
        {
          headers: { 'x-oleriq-session': sessionId },
        },
      );
      if (!downloadResponse.ok) {
        fail(`Download failed for ${jobId}: ${downloadResponse.status}`);
      }

      return await downloadResponse.text();
    }

    if (json.job?.status === 'failed') {
      fail(`Job failed: ${JSON.stringify(json)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  fail(`Timed out waiting for ${jobId}`);
}

async function main() {
  const { htmlPath, docxPath, epubPath, generatedPdfFixtures } = await createFixtures();

  const htmlUploadId = await uploadAndFinalize(htmlPath, 'text/html');
  const htmlOff = await runBatch(htmlUploadId, 'md', 'off');
  if (containsMarkdownImage(htmlOff) || /blue square/i.test(htmlOff)) {
    fail('HTML images=off still retained image output.');
  }

  const htmlCaptions = await runBatch(htmlUploadId, 'md', 'captions');
  if (!containsReadableCaption(htmlCaptions, 'blue square')) {
    fail('HTML images=captions did not emit the expected image caption.');
  }

  const docxUploadId = await uploadAndFinalize(
    docxPath,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
  const docxOn = await runBatch(docxUploadId, 'md', 'on');
  if (!containsMarkdownImage(docxOn)) {
    fail('DOCX images=on did not retain an image in markdown output.');
  }

  const docxTxtOn = await runBatch(docxUploadId, 'txt', 'on');
  if (!containsReadableCaption(docxTxtOn, 'blue square')) {
    fail('DOCX images=on did not degrade to readable captions in TXT output.');
  }

  const epubUploadId = await uploadAndFinalize(epubPath, 'application/epub+zip');
  const epubOn = await runBatch(epubUploadId, 'md', 'on');
  if (!containsMarkdownImage(epubOn)) {
    fail('EPUB images=on did not retain an image in markdown output.');
  }

  const inlinePdfUploadId = await uploadAndFinalize(
    generatedPdfFixtures.pdfInline.localPath,
    generatedPdfFixtures.pdfInline.contentType,
  );
  const inlinePdfOff = await runBatch(inlinePdfUploadId, 'md', 'off');
  if (containsMarkdownImage(inlinePdfOff) || /\[Image:/i.test(inlinePdfOff)) {
    fail('PDF images=off still retained inline image output.');
  }

  const inlinePdfCaptions = await runBatch(inlinePdfUploadId, 'md', 'captions');
  if (!containsReadableCaption(inlinePdfCaptions, 'Inline figure')) {
    fail('PDF images=captions did not emit the expected inline image caption.');
  }

  const inlinePdfOn = await runBatch(inlinePdfUploadId, 'md', 'on');
  if (!containsMarkdownImage(inlinePdfOn)) {
    fail('PDF images=on did not retain an inline image in markdown output.');
  }

  const inlinePdfTxtOn = await runBatch(inlinePdfUploadId, 'txt', 'on');
  if (!containsReadableCaption(inlinePdfTxtOn, 'Inline figure')) {
    fail('PDF images=on did not degrade to readable captions in TXT output.');
  }

  const decorativePdfUploadId = await uploadAndFinalize(
    generatedPdfFixtures.pdfDecorative.localPath,
    generatedPdfFixtures.pdfDecorative.contentType,
  );
  const decorativePdfCaptions = await runBatch(decorativePdfUploadId, 'md', 'captions');
  const bodyIndex = decorativePdfCaptions.indexOf('Body paragraph two.');
  const imageIndex = decorativePdfCaptions.indexOf('[Image:');
  if (bodyIndex === -1 || imageIndex === -1) {
    fail('Decorative PDF captions output did not include the expected text and image placeholder.');
  }
  if (imageIndex <= bodyIndex) {
    fail('Decorative PDF low-confidence image was not preserved later in page order.');
  }

  console.log('check-document-image-conversion passed');
}

await main();
