import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  prepareGeneratedPdfFixtures,
  prepareRealDocumentFixtures,
  readUploadPayload,
} from './batch-document-fixtures.mjs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const sessionId = `e2e-batch-documents-${Date.now()}`;
const batchSurfaceSelector = '[data-batch-surface="primary"]';

function fail(message) {
  throw new Error(message);
}

async function assertPathExists(targetPath, message) {
  try {
    await fs.stat(targetPath);
  } catch {
    fail(message);
  }
}

function isLocalBaseUrl() {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseUrl);
}

async function createFixtures() {
  const dir = path.join(process.cwd(), '.tmp-e2e-batch-documents');
  await fs.mkdir(dir, { recursive: true });

  const textPath = path.join(dir, 'batch-note.txt');
  const markdownPath = path.join(dir, 'batch-summary.md');
  const invalidPath = path.join(dir, 'unsupported.png');
  const structureHtmlPath = path.join(process.cwd(), 'public', 'test-fixtures', 'structure-source.html');

  await fs.writeFile(textPath, 'Oleriq batch upload test.\n\nThis file should convert cleanly.');
  await fs.writeFile(markdownPath, '# Batch Summary\n\nThis markdown file should convert cleanly.');
  await fs.writeFile(invalidPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const longPdfPath = path.join(dir, 'long-batch-fixture.pdf');

  try {
    const stat = await fs.stat(longPdfPath);
    if (stat.size === 0) {
      throw new Error('empty cached PDF');
    }
  } catch {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 1280 } });

    try {
      const sections = Array.from({ length: 130 }, (_, index) => {
        const pageNumber = index + 1;
        return `
          <section class="sheet">
            <h1>Long PDF Fixture Page ${pageNumber}</h1>
            <p>This page exists to exercise deterministic PDF truncation diagnostics.</p>
            <p>Page ${pageNumber} should not disappear silently when the converter caps long PDFs.</p>
          </section>
        `;
      }).join('\n');

      await page.setContent(
        `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Georgia, 'Times New Roman', serif; color: #111827; margin: 0; }
              .sheet {
                min-height: 9.2in;
                padding: 0.55in 0.6in;
                box-sizing: border-box;
                page-break-after: always;
              }
              .sheet:last-child { page-break-after: auto; }
              h1 { font-size: 26px; margin: 0 0 14px; }
              p { font-size: 14px; line-height: 1.5; margin: 0 0 10px; }
            </style>
          </head>
          <body>${sections}</body>
        </html>`,
        { waitUntil: 'load' },
      );
      await page.pdf({
        path: longPdfPath,
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.35in',
          right: '0.35in',
          bottom: '0.35in',
          left: '0.35in',
        },
      });
    } finally {
      await page.close();
      await browser.close();
    }
  }

  return { textPath, markdownPath, invalidPath, structureHtmlPath, longPdfPath };
}

async function readLocalUploadPayload(filePath, mimeType) {
  return {
    name: path.basename(filePath),
    mimeType,
    buffer: await fs.readFile(filePath),
  };
}

async function waitForUploadSummary(page, selectedCount, uploadedCount) {
  const expectedLine = `${selectedCount.toLocaleString()} selected`;
  await page.waitForFunction(
    ({ expectedLine, uploadedCount, batchSurfaceSelector }) => {
      const panel = document.querySelector(batchSurfaceSelector);
      const text = panel instanceof HTMLElement ? panel.innerText : '';
      return (
        text.includes(expectedLine) &&
        (text.includes(`${uploadedCount.toLocaleString()} uploaded`) ||
          text.includes('Unsupported file type.') ||
          text.includes('failed'))
      );
    },
    { expectedLine, uploadedCount, batchSurfaceSelector },
    { timeout: 120_000 },
  );
}

async function openMoreOptions(page) {
  const button = page.getByRole('button', { name: 'More options' });
  await button.click();
  await page.locator('[data-batch-more-options][data-batch-more-options-open="true"]').waitFor({
    timeout: 60_000,
  });
}

async function documentFileInput(page) {
  const locator = page.locator('input[type="file"][multiple]').first();
  try {
    await locator.waitFor({ state: 'attached', timeout: 10_000 });
    return locator;
  } catch {
    const bodyText = await page.locator('body').innerText();
    fail(`Document uploader did not render after switching to Documents: ${bodyText}`);
  }
}

async function assertApiDocumentBatch(textPath) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  if (!configResponse.ok) {
    fail(`Upload config failed: ${configResponse.status}`);
  }

  const configJson = await configResponse.json();
  if (!configJson.success || !['filesystem', 'blob'].includes(configJson.mode)) {
    fail(`Unexpected upload config: ${JSON.stringify(configJson)}`);
  }

  if (configJson.mode === 'blob') {
    console.log('Skipping API-only blob upload assertion. Browser flow covers live blob uploads.');
    return;
  }

  const textBytes = await fs.readFile(textPath);
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent('batch-note.txt')}&contentType=${encodeURIComponent('text/plain')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: textBytes,
    },
  );
  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Local upload failed: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  if (!String(uploadJson.file.objectKey).startsWith('filesystem:oleriq/uploads/')) {
    fail(`Expected uploaded document objectKey to use filesystem:oleriq/uploads/, got: ${JSON.stringify(uploadJson.file)}`);
  }

  const completePayload = {
    mode: 'filesystem',
    objectKey: uploadJson.file.objectKey,
    objectUrl: uploadJson.file.objectUrl,
    downloadUrl: uploadJson.file.downloadUrl,
    filename: uploadJson.file.originalFilename,
    contentType: uploadJson.file.contentType,
    byteSize: uploadJson.file.byteSize,
  };

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
    },
    body: JSON.stringify(completePayload),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Upload completion failed: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  await assertPathExists(
    path.join(process.cwd(), 'data', 'durable-document-batch', 'oleriq', 'state', 'uploads', `${completeJson.file.uploadId}.json`),
    `Expected durable upload manifest under data/durable-document-batch/oleriq/state/uploads/${completeJson.file.uploadId}.json`,
  );

  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: [{ uploadId: completeJson.file.uploadId }],
      format: 'txt',
      images: 'on',
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
    fail(`Document batch create failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  if (process.env.VERCEL) {
    await assertPathExists(
      path.join(process.cwd(), 'data', 'durable-document-batch', 'oleriq', 'state', 'jobs', `${createJson.job.jobId}.json`),
      `Expected durable job manifest under data/durable-document-batch/oleriq/state/jobs/${createJson.job.jobId}.json`,
    );
  }

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 180_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': sessionId,
        },
      },
    );

    if (!response.ok) {
      fail(`Document batch status failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    detail = json;
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  if (!detail?.job || detail.job.status !== 'completed') {
    fail(`Document batch API did not complete: ${JSON.stringify(detail)}`);
  }

  if (!Array.isArray(detail.items) || detail.items[0]?.status !== 'success' || !detail.items[0]?.id) {
    fail(`Document batch API returned unexpected items: ${JSON.stringify(detail)}`);
  }

  if (!String(detail.items[0].sourceObjectKey || '').startsWith('filesystem:oleriq/uploads/')) {
    fail(`Expected sourceObjectKey to use filesystem:oleriq/uploads/, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!String(detail.items[0].outputObjectKey || '').startsWith('filesystem:oleriq/outputs/')) {
    fail(`Expected outputObjectKey to use filesystem:oleriq/outputs/, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (detail.job.degradedCount !== 1) {
    fail(`Expected one degraded TXT document result, got: ${JSON.stringify(detail.job)}`);
  }

  if (typeof detail.job.usableCount !== 'number') {
    fail(`Expected usableCount in document batch job detail, got: ${JSON.stringify(detail.job)}`);
  }

  if (typeof detail.job.partialOutputCount !== 'number') {
    fail(`Expected partialOutputCount in document batch job detail, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.items[0].qualityState !== 'degraded') {
    fail(`Expected degraded document item qualityState, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!Array.isArray(detail.items[0].warnings) || detail.items[0].warnings.length === 0) {
    fail(`Expected document batch warnings for TXT image downgrade, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (
    !Array.isArray(detail.items[0].diagnosticReasons) ||
    !detail.items[0].diagnosticReasons.includes('document_txt_images_downgraded_to_captions')
  ) {
    fail(`Expected document batch diagnosticReasons for TXT image downgrade, got: ${JSON.stringify(detail.items[0])}`);
  }

  const downloadResponse = await fetch(
    `${baseUrl}/api/batch-jobs/download?jobId=${encodeURIComponent(jobId)}&itemId=${detail.items[0].id}`,
    {
      headers: {
        'x-oleriq-session': sessionId,
      },
    },
  );

  if (!downloadResponse.ok) {
    fail(`Document batch download failed: ${downloadResponse.status} ${await downloadResponse.text()}`);
  }

  const contentDisposition = downloadResponse.headers.get('content-disposition') || '';
  if (!/\.txt/i.test(contentDisposition)) {
    fail(`Expected TXT document batch download, got: ${contentDisposition}`);
  }
}

async function assertUploadConfigDocumentSupport() {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  if (!configResponse.ok) {
    fail(`Upload config failed: ${configResponse.status}`);
  }

  const configJson = await configResponse.json();
  const accept = String(configJson.accept || '');
  for (const extension of ['.pdf', '.epub', '.docx', '.html', '.htm', '.txt', '.md', '.csv', '.tsv', '.json', '.xml', '.yaml', '.yml', '.log', '.rst']) {
    if (!accept.includes(extension)) {
      fail(`Upload config accept list is missing ${extension}: ${accept}`);
    }
  }
}

async function assertUiDocumentImageMode(fixtures, semanticFixtures) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  let capturedRequest = null;

  try {
    await page.route('**/api/batch-jobs', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      capturedRequest = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            jobId: 'mock-job-1234',
            totalUrls: 2,
            status: 'queued',
            estimatedProcessingMs: 10_000,
          },
        }),
      });
    });

    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await switchToDocumentsMode(page);

    const pdfUpload = await readUploadPayload(semanticFixtures.pdfInline);
    const textUpload = await readLocalUploadPayload(fixtures.textPath, 'text/plain');
    await (await documentFileInput(page)).setInputFiles([pdfUpload, textUpload]);

    await page.getByText(semanticFixtures.pdfInline.filename).waitFor({ timeout: 60_000 });
    await page.getByText(path.basename(fixtures.textPath)).waitFor({ timeout: 60_000 });
    await waitForUploadSummary(page, 2, 2);
    const uploadSummary = await page.locator(batchSurfaceSelector).first().innerText();
    if (!uploadSummary.includes('2 uploaded')) {
      fail(`Expected both fixtures to upload before submit, got: ${uploadSummary}`);
    }

    await openMoreOptions(page);
    await page.getByText('Document images').waitFor({ timeout: 60_000 });
    await page.getByText('Applies when this batch includes PDF, EPUB, HTML/HTM, or DOCX files.').waitFor({
      timeout: 60_000,
    });

    const imageModeOn = page.getByRole('button', { name: 'On', exact: true });
    await imageModeOn.click();
    if ((await imageModeOn.getAttribute('aria-pressed')) !== 'true') {
      fail('Document image mode did not switch to On.');
    }

    await page.getByRole('button', { name: 'Start Batch' }).click();
    await page.getByText(/Job queued/i).waitFor({ timeout: 60_000 });

    if (!capturedRequest) {
      fail('Did not capture the document batch create request.');
    }

    if (capturedRequest.inputMode !== 'document') {
      fail(`Expected document batch request, got: ${JSON.stringify(capturedRequest)}`);
    }

    if (capturedRequest.images !== 'on') {
      fail(`Expected image-aware document batch request with images=on, got: ${JSON.stringify(capturedRequest)}`);
    }

    if (!Array.isArray(capturedRequest.files) || capturedRequest.files.length !== 2) {
      fail(`Expected two uploaded files in the batch request, got: ${JSON.stringify(capturedRequest)}`);
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function assertApiDocumentStructureDiagnostics(structureHtmlPath) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  if (!configResponse.ok) {
    fail(`Upload config failed: ${configResponse.status}`);
  }

  const configJson = await configResponse.json();
  if (!configJson.success || !['filesystem', 'blob'].includes(configJson.mode)) {
    fail(`Unexpected upload config: ${JSON.stringify(configJson)}`);
  }

  if (configJson.mode === 'blob') {
    console.log('Skipping API-only structure diagnostic assertion for blob uploads. Browser flow covers live blob uploads.');
    return;
  }

  const htmlBytes = await fs.readFile(structureHtmlPath);
  const structureSessionId = `${sessionId}-structure`;
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(structureSessionId)}&filename=${encodeURIComponent('structure-source.html')}&contentType=${encodeURIComponent('text/html')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/html',
      },
      body: htmlBytes,
    },
  );
  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Structure fixture local upload failed: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  const completePayload = {
    mode: 'filesystem',
    objectKey: uploadJson.file.objectKey,
    objectUrl: uploadJson.file.objectUrl,
    downloadUrl: uploadJson.file.downloadUrl,
    filename: uploadJson.file.originalFilename,
    contentType: uploadJson.file.contentType,
    byteSize: uploadJson.file.byteSize,
  };

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': structureSessionId,
    },
    body: JSON.stringify(completePayload),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Structure fixture upload completion failed: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': structureSessionId,
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: [{ uploadId: completeJson.file.uploadId }],
      format: 'md',
      images: 'off',
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
    fail(`Structure fixture batch create failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 180_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': structureSessionId,
        },
      },
    );

    if (!response.ok) {
      fail(`Structure fixture batch status failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    detail = json;
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  if (!detail?.job || detail.job.status !== 'completed') {
    fail(`Structure fixture batch did not complete: ${JSON.stringify(detail)}`);
  }

  if (!Array.isArray(detail.items) || detail.items[0]?.status !== 'success') {
    fail(`Structure fixture batch returned unexpected items: ${JSON.stringify(detail)}`);
  }

  if (detail.job.degradedCount !== 0) {
    fail(`Expected zero degraded structure-rich Markdown document results after recovery, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.items[0].qualityState !== 'usable') {
    fail(`Expected usable qualityState for structure-rich markdown export after recovery, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!Array.isArray(detail.items[0].diagnosticReasons)) {
    fail(`Expected structure-rich markdown export to return diagnosticReasons array, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (detail.items[0].diagnosticReasons.length !== 0) {
    fail(`Expected structure-rich markdown export to clear structure diagnosticReasons after recovery, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!Array.isArray(detail.items[0].warnings) || detail.items[0].warnings.length !== 0) {
    fail(`Expected structure-rich markdown export warnings to clear after recovery, got: ${JSON.stringify(detail.items[0])}`);
  }
}

async function switchToDocumentsMode(page) {
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await page.locator(`${batchSurfaceSelector}[data-batch-mode="document"]`).waitFor({ timeout: 30_000 });
}

async function assertApiDocumentTxtStructureDiagnostics(structureHtmlPath) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  if (!configResponse.ok) {
    fail(`Upload config failed: ${configResponse.status}`);
  }

  const configJson = await configResponse.json();
  if (!configJson.success || !['filesystem', 'blob'].includes(configJson.mode)) {
    fail(`Unexpected upload config: ${JSON.stringify(configJson)}`);
  }

  if (configJson.mode === 'blob') {
    console.log('Skipping API-only TXT structure diagnostic assertion for blob uploads. Browser flow covers live blob uploads.');
    return;
  }

  const htmlBytes = await fs.readFile(structureHtmlPath);
  const structureSessionId = `${sessionId}-structure-txt`;
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(structureSessionId)}&filename=${encodeURIComponent('structure-source.html')}&contentType=${encodeURIComponent('text/html')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/html',
      },
      body: htmlBytes,
    },
  );
  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Structure TXT fixture local upload failed: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  const completePayload = {
    mode: 'filesystem',
    objectKey: uploadJson.file.objectKey,
    objectUrl: uploadJson.file.objectUrl,
    downloadUrl: uploadJson.file.downloadUrl,
    filename: uploadJson.file.originalFilename,
    contentType: uploadJson.file.contentType,
    byteSize: uploadJson.file.byteSize,
  };

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': structureSessionId,
    },
    body: JSON.stringify(completePayload),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Structure TXT fixture upload completion failed: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': structureSessionId,
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: [{ uploadId: completeJson.file.uploadId }],
      format: 'txt',
      images: 'off',
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
    fail(`Structure TXT fixture batch create failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 180_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': structureSessionId,
        },
      },
    );

    if (!response.ok) {
      fail(`Structure TXT fixture batch status failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    detail = json;
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  if (!detail?.job || detail.job.status !== 'completed') {
    fail(`Structure TXT fixture batch did not complete: ${JSON.stringify(detail)}`);
  }

  if (!Array.isArray(detail.items) || detail.items[0]?.status !== 'success') {
    fail(`Structure TXT fixture batch returned unexpected items: ${JSON.stringify(detail)}`);
  }

  if (detail.job.degradedCount !== 1) {
    fail(`Expected one degraded structure-rich TXT document result from remaining table-loss risk, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.items[0].qualityState !== 'degraded') {
    fail(`Expected degraded qualityState for structure-rich TXT export, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (
    !Array.isArray(detail.items[0].diagnosticReasons) ||
    !detail.items[0].diagnosticReasons.includes('structure_table_loss_risk')
  ) {
    fail(`Expected structure_table_loss_risk diagnosticReason on TXT export, got: ${JSON.stringify(detail.items[0])}`);
  }

  for (const reason of ['structure_heading_loss_risk', 'structure_list_loss_risk', 'structure_code_block_loss_risk']) {
    if (detail.items[0].diagnosticReasons.includes(reason)) {
      fail(`Expected TXT structure recovery to clear ${reason}, got: ${JSON.stringify(detail.items[0])}`);
    }
  }

  if (!Array.isArray(detail.items[0].warnings) || detail.items[0].warnings.length === 0) {
    fail(`Expected structure-loss warning text for structure-rich TXT export, got: ${JSON.stringify(detail.items[0])}`);
  }
}

async function assertApiDocumentPdfTruncationDiagnostics(longPdfPath) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  if (!configResponse.ok) {
    fail(`Upload config failed: ${configResponse.status}`);
  }

  const configJson = await configResponse.json();
  if (!configJson.success || !['filesystem', 'blob'].includes(configJson.mode)) {
    fail(`Unexpected upload config: ${JSON.stringify(configJson)}`);
  }

  if (configJson.mode === 'blob') {
    console.log('Skipping API-only PDF truncation assertion for blob uploads. Browser flow covers live blob uploads.');
    return;
  }

  const pdfBytes = await fs.readFile(longPdfPath);
  const truncationSessionId = `${sessionId}-pdf-truncation`;
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(truncationSessionId)}&filename=${encodeURIComponent('long-batch-fixture.pdf')}&contentType=${encodeURIComponent('application/pdf')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: pdfBytes,
    },
  );
  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Long PDF local upload failed: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  const completePayload = {
    mode: 'filesystem',
    objectKey: uploadJson.file.objectKey,
    objectUrl: uploadJson.file.objectUrl,
    downloadUrl: uploadJson.file.downloadUrl,
    filename: uploadJson.file.originalFilename,
    contentType: uploadJson.file.contentType,
    byteSize: uploadJson.file.byteSize,
  };

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': truncationSessionId,
    },
    body: JSON.stringify(completePayload),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Long PDF upload completion failed: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': truncationSessionId,
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: [{ uploadId: completeJson.file.uploadId }],
      format: 'md',
      images: 'off',
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
    fail(`Long PDF batch create failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 300_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': truncationSessionId,
        },
      },
    );

    if (!response.ok) {
      fail(`Long PDF batch status failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    detail = json;
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  if (!detail?.job || detail.job.status !== 'completed') {
    fail(`Long PDF batch did not complete: ${JSON.stringify(detail)}`);
  }

  if (!Array.isArray(detail.items) || detail.items[0]?.status !== 'success') {
    fail(`Long PDF batch returned unexpected items: ${JSON.stringify(detail)}`);
  }

  if (detail.job.degradedCount !== 0) {
    fail(`Expected zero degraded long-PDF results after partial-state split, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.job.partialOutputCount < 1) {
    fail(`Expected partialOutputCount to include truncated PDF results, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.items[0].qualityState !== 'partial') {
    fail(`Expected partial qualityState for truncated long PDF, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (
    !Array.isArray(detail.items[0].diagnosticReasons) ||
    !detail.items[0].diagnosticReasons.includes('document_pdf_truncated_pages')
  ) {
    fail(`Expected document_pdf_truncated_pages diagnosticReason, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!Array.isArray(detail.items[0].warnings) || detail.items[0].warnings.length === 0) {
    fail(`Expected PDF truncation warning text, got: ${JSON.stringify(detail.items[0])}`);
  }
}

async function assertUiDocumentDiagnostics(fixtures, semanticFixtures) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.route('**/api/batch-jobs?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            id: 'mock-document-job',
            status: 'completed',
            inputMode: 'document',
            totalUrls: 2,
            processedUrls: 2,
            successCount: 1,
            failureCount: 1,
            degradedCount: 1,
            usableCount: 0,
            emptyOutputCount: 0,
            partialOutputCount: 0,
            averageDurationMs: 2000,
            startedAt: new Date(Date.now() - 4000).toISOString(),
            completedAt: new Date().toISOString(),
          },
          estimatedRemainingMs: 0,
          items: [
            {
              id: 1,
              url: 'upload://note-1',
              status: 'success',
              qualityState: 'degraded',
              warnings: ['Images become captions instead of embedded images in TXT output.'],
              diagnosticReasons: ['document_txt_images_downgraded_to_captions'],
              durationMs: 1800,
              extractionId: null,
              sourceUrl: null,
              title: 'Batch note',
              originalFilename: 'batch-note.txt',
              contentType: 'text/plain',
              byteSize: 42,
              sourceObjectKey: 'upload-object',
              outputObjectKey: 'output-object',
              outputFilename: 'batch-note.txt',
              outputFormat: 'txt',
              errorCode: null,
              errorMessage: null,
            },
            {
              id: 2,
              url: 'upload://note-2',
              status: 'failure',
              qualityState: null,
              warnings: [],
              diagnosticReasons: [],
              durationMs: 2200,
              extractionId: null,
              sourceUrl: null,
              title: null,
              originalFilename: 'batch-summary.md',
              contentType: 'text/markdown',
              byteSize: 84,
              sourceObjectKey: 'upload-object-2',
              outputObjectKey: null,
              outputFilename: null,
              outputFormat: 'txt',
              errorCode: 'DOCUMENT_CONVERSION_FAILED',
              errorMessage: 'Uploaded file could not be converted to the selected format.',
            },
          ],
          paging: {
            limit: 400,
            offset: 0,
          },
        }),
      });
    });

    await page.route('**/api/batch-jobs', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          job: {
            jobId: 'mock-document-job',
            totalUrls: 2,
            status: 'queued',
            estimatedProcessingMs: 10_000,
          },
        }),
      });
    });

    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await switchToDocumentsMode(page);

    const pdfUpload = await readUploadPayload(semanticFixtures.pdfInline);
    const textUpload = await readLocalUploadPayload(fixtures.textPath, 'text/plain');
    await (await documentFileInput(page)).setInputFiles([pdfUpload, textUpload]);

    await page.getByText(semanticFixtures.pdfInline.filename).waitFor({ timeout: 60_000 });
    await page.getByText(path.basename(fixtures.textPath)).waitFor({ timeout: 60_000 });
    await waitForUploadSummary(page, 2, 2);

    await openMoreOptions(page);
    await page.getByRole('button', { name: 'On', exact: true }).click();
    await page.getByRole('button', { name: 'Start Batch' }).click();

    await page.locator(`${batchSurfaceSelector}[data-batch-stage="review"]`).waitFor({ timeout: 60_000 });
    const reviewSummary = page.locator('[data-batch-review-summary]');
    await reviewSummary.getByText('0 usable', { exact: true }).waitFor({ timeout: 60_000 });
    await reviewSummary.getByText('0 partial', { exact: true }).waitFor({ timeout: 60_000 });
    await reviewSummary.getByText('1 degraded', { exact: true }).waitFor({ timeout: 60_000 });
    await reviewSummary.getByText('1 failed', { exact: true }).waitFor({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Retry failed files (1)' }).waitFor({ timeout: 60_000 });

    const noteRow = page
      .locator('[data-batch-row]')
      .filter({ has: page.locator('[data-batch-row-title]', { hasText: 'batch-note.txt' }) })
      .first();

    await noteRow.getByRole('button').first().click();
    await page.getByText('Images become captions instead of embedded images in TXT output.').waitFor({
      timeout: 60_000,
    });
    await page
      .getByText('Next step: Use PDF or DOCX if embedded images matter.')
      .waitFor({ timeout: 60_000 });

    const failedRow = page
      .locator('[data-batch-row]')
      .filter({ has: page.locator('[data-batch-row-title]', { hasText: 'batch-summary.md' }) })
      .first();

    await failedRow.getByRole('button').first().click();
    await page
      .getByText('Next step: Retry the file, or switch output format if the original structure is not converting cleanly.')
      .waitFor({ timeout: 60_000 });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function assertUiPass1FixtureAcceptance(realFixtures, fixtures) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  const configJson = await configResponse.json();
  const useInvalidFixture = configJson.success && configJson.mode === 'filesystem' && isLocalBaseUrl();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await switchToDocumentsMode(page);

    const uploads = await Promise.all([
      readUploadPayload(realFixtures.docx),
      readUploadPayload(realFixtures.html),
      readUploadPayload(realFixtures.htm),
      readUploadPayload(realFixtures.epub),
      readUploadPayload(realFixtures.txt),
      readUploadPayload(realFixtures.md),
      readUploadPayload(realFixtures.csv),
      readUploadPayload(realFixtures.tsv),
      readUploadPayload(realFixtures.json),
      readUploadPayload(realFixtures.xml),
      readUploadPayload(realFixtures.yaml),
      readUploadPayload(realFixtures.yml),
      readUploadPayload(realFixtures.log),
      readUploadPayload(realFixtures.rst),
    ]);

    await (await documentFileInput(page)).setInputFiles(uploads);

    for (const fixture of [
      realFixtures.docx,
      realFixtures.html,
      realFixtures.htm,
      realFixtures.epub,
      realFixtures.txt,
      realFixtures.md,
      realFixtures.csv,
      realFixtures.tsv,
      realFixtures.json,
      realFixtures.xml,
      realFixtures.yaml,
      realFixtures.yml,
      realFixtures.log,
      realFixtures.rst,
    ]) {
      await page.getByText(fixture.filename, { exact: true }).waitFor({ timeout: 60_000 });
    }

    await waitForUploadSummary(page, 14, 14);

    const bodyText = await page.locator(batchSurfaceSelector).first().innerText();
    if (!bodyText.includes('14 uploaded')) {
      fail(`Expected fourteen Pass 1 fixtures to upload, got: ${bodyText}`);
    }

    if (bodyText.includes('Unsupported file type.')) {
      fail(`Pass 1 fixture upload still reports an unsupported type: ${bodyText}`);
    }

    if (useInvalidFixture) {
      const invalidUpload = await readLocalUploadPayload(fixtures.invalidPath, 'image/png');
      await (await documentFileInput(page)).setInputFiles([invalidUpload]);
      await page.getByText('Unsupported file type.').waitFor({ timeout: 60_000 });
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function runCheck(label, fn, failures) {
  try {
    await fn();
    console.log(`PASS ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${label}: ${message}`);
    console.error(`FAIL ${label}: ${message}`);
  }
}

async function main() {
  const fixtures = await createFixtures();
  const { fixtures: semanticFixtures } = await prepareGeneratedPdfFixtures({
    dirName: path.join('.tmp-e2e-batch-documents', 'semantic-fixtures'),
  });
  const { fixtures: realFixtures } = await prepareRealDocumentFixtures({
    dirName: '.tmp-e2e-batch-document-fixtures',
  });
  const failures = [];

  await runCheck('upload config document support', () => assertUploadConfigDocumentSupport(), failures);
  await runCheck('document batch api baseline', () => assertApiDocumentBatch(fixtures.textPath), failures);
  await runCheck(
    'document structure diagnostics baseline',
    () => assertApiDocumentStructureDiagnostics(fixtures.structureHtmlPath),
    failures,
  );
  await runCheck(
    'document TXT structure diagnostics baseline',
    () => assertApiDocumentTxtStructureDiagnostics(fixtures.structureHtmlPath),
    failures,
  );
  await runCheck(
    'document PDF truncation diagnostics baseline',
    () => assertApiDocumentPdfTruncationDiagnostics(fixtures.longPdfPath),
    failures,
  );
  await runCheck(
    'document image mode wiring',
    () => assertUiDocumentImageMode(fixtures, semanticFixtures),
    failures,
  );
  await runCheck(
    'document diagnostics UI',
    () => assertUiDocumentDiagnostics(fixtures, semanticFixtures),
    failures,
  );
  await runCheck(
    'pass1 fixture acceptance',
    () => assertUiPass1FixtureAcceptance(realFixtures, fixtures),
    failures,
  );

  if (failures.length > 0) {
    fail(`e2e-batch-documents failed\n- ${failures.join('\n- ')}`);
  }

  console.log('e2e-batch-documents passed');
}

await main();
