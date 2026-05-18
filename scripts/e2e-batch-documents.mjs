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

function fail(message) {
  throw new Error(message);
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

  await fs.writeFile(textPath, 'Clearpage batch upload test.\n\nThis file should convert cleanly.');
  await fs.writeFile(markdownPath, '# Batch Summary\n\nThis markdown file should convert cleanly.');
  await fs.writeFile(invalidPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  return { textPath, markdownPath, invalidPath };
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
    ({ expectedLine, uploadedCount }) => {
      const panel = document.querySelector('main section.rounded-2xl.border');
      const text = panel instanceof HTMLElement ? panel.innerText : '';
      return (
        text.includes(expectedLine) &&
        (text.includes(`${uploadedCount.toLocaleString()} uploaded`) ||
          text.includes('Unsupported file type.') ||
          text.includes('failed'))
      );
    },
    { expectedLine, uploadedCount },
    { timeout: 120_000 },
  );
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
      'x-clearpage-session': sessionId,
    },
    body: JSON.stringify(completePayload),
  });
  const completeJson = await completeResponse.json();
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Upload completion failed: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-clearpage-session': sessionId,
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

  const jobId = createJson.job.jobId;
  const timeoutAt = Date.now() + 180_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-clearpage-session': sessionId,
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

  if (detail.job.degradedCount !== 1) {
    fail(`Expected one degraded TXT document result, got: ${JSON.stringify(detail.job)}`);
  }

  if (detail.items[0].qualityState !== 'degraded') {
    fail(`Expected degraded document item qualityState, got: ${JSON.stringify(detail.items[0])}`);
  }

  if (!Array.isArray(detail.items[0].warnings) || detail.items[0].warnings.length === 0) {
    fail(`Expected document batch warnings for TXT image downgrade, got: ${JSON.stringify(detail.items[0])}`);
  }

  const downloadResponse = await fetch(
    `${baseUrl}/api/batch-jobs/download?jobId=${encodeURIComponent(jobId)}&itemId=${detail.items[0].id}`,
    {
      headers: {
        'x-clearpage-session': sessionId,
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
  for (const extension of ['.pdf', '.epub', '.docx', '.html', '.htm']) {
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
    await page.getByRole('button', { name: 'Documents' }).click();

    const pdfUpload = await readUploadPayload(semanticFixtures.pdfInline);
    const textUpload = await readLocalUploadPayload(fixtures.textPath, 'text/plain');
    await (await documentFileInput(page)).setInputFiles([pdfUpload, textUpload]);

    await page.getByText(semanticFixtures.pdfInline.filename).waitFor({ timeout: 60_000 });
    await page.getByText(path.basename(fixtures.textPath)).waitFor({ timeout: 60_000 });
    await waitForUploadSummary(page, 2, 2);
    const uploadSummary = await page.locator('main section.rounded-2xl.border').first().innerText();
    if (!uploadSummary.includes('2 uploaded')) {
      fail(`Expected both fixtures to upload before submit, got: ${uploadSummary}`);
    }

    await page.getByText('Document images').waitFor({ timeout: 60_000 });
    await page.getByText('Applies only to PDF, EPUB, HTML/HTM, and DOCX files in this batch.').waitFor({
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

async function assertUiPass1FixtureAcceptance(realFixtures, fixtures) {
  const configResponse = await fetch(`${baseUrl}/api/batch-upload-config`);
  const configJson = await configResponse.json();
  const useInvalidFixture = configJson.success && configJson.mode === 'filesystem' && isLocalBaseUrl();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Documents' }).click();

    const uploads = await Promise.all([
      readUploadPayload(realFixtures.docx),
      readUploadPayload(realFixtures.html),
      readUploadPayload(realFixtures.htm),
      readUploadPayload(realFixtures.epub),
    ]);

    await (await documentFileInput(page)).setInputFiles(uploads);

    for (const fixture of [realFixtures.docx, realFixtures.html, realFixtures.htm, realFixtures.epub]) {
      await page.getByText(fixture.filename, { exact: true }).waitFor({ timeout: 60_000 });
    }

    await waitForUploadSummary(page, 4, 4);

    const bodyText = await page.locator('main section.rounded-2xl.border').first().innerText();
    if (!bodyText.includes('4 uploaded')) {
      fail(`Expected four Pass 1 fixtures to upload, got: ${bodyText}`);
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
    'document image mode wiring',
    () => assertUiDocumentImageMode(fixtures, semanticFixtures),
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
