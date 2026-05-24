import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const smallDirectPdfUrl = `${baseUrl}/test-fixtures/direct-source.pdf`;
const directDocUrl = `${baseUrl}/test-fixtures/fallback-sample.doc`;
const batchSurfaceSelector = '[data-batch-surface="primary"]';

async function assertApiFallbackToOriginal() {
  const response = await fetch(`${baseUrl}/api/direct-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: directDocUrl,
      format: 'md',
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Direct file API fallback failed: ${response.status} ${raw}`);
  }

  const fallbackHeader = response.headers.get('x-oleriq-fallback-format') || '';
  if (fallbackHeader !== 'original') {
    throw new Error(`Expected x-oleriq-fallback-format=original, got: ${fallbackHeader || '(missing)'}`);
  }

  const contentDisposition = response.headers.get('content-disposition') || '';
  if (!/filename=/i.test(contentDisposition)) {
    throw new Error('Fallback response missing content-disposition filename.');
  }
}

async function assertHomepageDirectPdfDownload(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const sessionId = await page.evaluate(() => window.localStorage.getItem('oleriq_session_id') || '');
  if (!sessionId) {
    throw new Error('Expected homepage session id to be stored under oleriq_session_id.');
  }
  await page.locator('#url-input').fill(smallDirectPdfUrl);

  await page.getByRole('button', { name: 'Convert URL' }).click();
  await page.getByText('Direct file detected').waitFor({ timeout: 120_000 });
  await page.getByText('Direct file downloaded. Choose another format if needed.').waitFor({
    timeout: 120_000,
  });
  await page.getByText('Direct file detected').waitFor({ timeout: 120_000 });
  await page.locator('select').first().selectOption('pdf');

  await page.getByRole('button', { name: 'Download' }).first().click();
  await page.getByText('PDF download requested. Check your browser downloads tray.').waitFor({
    timeout: 120_000,
  });
}

async function assertDirectPdfEndpoint() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${baseUrl}/api/direct-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: smallDirectPdfUrl,
        format: 'pdf',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`Direct PDF passthrough failed: ${response.status} ${raw}`);
    }

    const contentDisposition = response.headers.get('content-disposition') || '';
    if (!/\.pdf/i.test(contentDisposition)) {
      throw new Error(`Expected PDF filename in content-disposition, got: ${contentDisposition}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Expected streaming body from direct PDF passthrough response.');
    }

    const firstChunk = await reader.read();
    await reader.cancel();
    if (firstChunk.done || !firstChunk.value || firstChunk.value.byteLength <= 0) {
      throw new Error('Direct PDF passthrough returned no readable bytes.');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function assertBatchDirectDocDownload(page) {
  await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
  await page.locator('#batch-urls').fill(directDocUrl);
  await page.getByRole('button', { name: 'Start Batch' }).click();
  await page.locator(`${batchSurfaceSelector}[data-batch-stage="review"]`).waitFor({ timeout: 180_000 });

  const showCleanRows = page.getByRole('button', { name: /Show clean rows/i });
  await showCleanRows.waitFor({ timeout: 120_000 });
  await showCleanRows.click();

  const firstRow = page.locator('[data-batch-row]').first();
  await firstRow.getByRole('button').first().click();

  const rowDownloadButton = firstRow.getByRole('button', { name: 'Download' });
  await rowDownloadButton.waitFor({ timeout: 120_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await rowDownloadButton.click();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();

  if (!/\.doc$/i.test(filename)) {
    throw new Error(`Expected original DOC fallback filename from batch download, got: ${filename}`);
  }
}

async function main() {
  await assertApiFallbackToOriginal();
  await assertDirectPdfEndpoint();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await assertHomepageDirectPdfDownload(page);
    await assertBatchDirectDocDownload(page);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log('e2e-direct-file passed');
}

await main();
