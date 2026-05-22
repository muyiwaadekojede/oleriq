import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const outputDir = path.resolve(process.cwd(), 'public', 'proof', 'batch');

mkdirSync(outputDir, { recursive: true });

async function mockJobCreation(page, jobId, totalUrls, estimatedProcessingMs) {
  await page.route('**/api/batch-jobs', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        job: {
          jobId,
          totalUrls,
          status: 'queued',
          estimatedProcessingMs,
        },
      }),
    });
  });
}

async function captureRunningSurface(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1280 } });
  const page = await context.newPage();

  await mockJobCreation(page, 'mock-running-proof-job', 3, 42_000);
  await page.route('**/api/batch-jobs?jobId=mock-running-proof-job*&limit=400&offset=0', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        estimatedRemainingMs: 38_000,
        job: {
          id: 'mock-running-proof-job',
          status: 'running',
          inputMode: 'url',
          totalUrls: 3,
          processedUrls: 1,
          successCount: 0,
          failureCount: 0,
          degradedCount: 0,
          usableCount: 0,
          emptyOutputCount: 0,
          partialOutputCount: 0,
          averageDurationMs: null,
          startedAt: new Date('2026-05-21T12:00:00.000Z').toISOString(),
          completedAt: null,
        },
        items: [],
      }),
    });
  });

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await page.locator('#batch-urls').fill(`${articleUrl}\nhttps://example.invalid/test`);
    await page.getByRole('button', { name: 'Start Batch' }).click();
    await page.locator('[data-batch-surface="primary"][data-batch-stage="running"]').waitFor({ timeout: 30_000 });
    await page.locator('[data-batch-surface="primary"]').screenshot({ path: path.join(outputDir, 'batch-running-proof.png') });
  } finally {
    await page.close();
    await context.close();
  }
}

async function captureReviewProof(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1500 } });
  const page = await context.newPage();

  await mockJobCreation(page, 'mock-review-proof-job', 3, 18_000);
  await page.route('**/api/batch-jobs?jobId=mock-review-proof-job*&limit=400&offset=0', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        estimatedRemainingMs: 0,
        job: {
          id: 'mock-review-proof-job',
          status: 'completed',
          inputMode: 'url',
          totalUrls: 3,
          processedUrls: 3,
          successCount: 2,
          failureCount: 1,
          degradedCount: 0,
          usableCount: 1,
          emptyOutputCount: 0,
          partialOutputCount: 1,
          averageDurationMs: 1_500,
          startedAt: new Date('2026-05-21T12:00:00.000Z').toISOString(),
          completedAt: new Date('2026-05-21T12:00:05.000Z').toISOString(),
        },
        items: [
          {
            id: 1,
            url: 'https://example.com/bbc',
            status: 'success',
            qualityState: 'usable',
            warnings: [],
            diagnosticReasons: [],
            durationMs: 1400,
            extractionId: 'extract-1',
            sourceUrl: 'https://example.com/bbc',
            title: 'BBC Sport article',
            originalFilename: null,
            contentType: 'text/html',
            byteSize: null,
            sourceObjectKey: null,
            outputObjectKey: 'output-1',
            outputFilename: 'bbc-sport-article.txt',
            outputFormat: 'txt',
            errorCode: null,
            errorMessage: null,
          },
          {
            id: 2,
            url: 'https://example.com/mdn',
            status: 'success',
            qualityState: 'partial',
            warnings: ['This finished, but only part came back intact for TXT output.'],
            diagnosticReasons: ['structure_table_loss_risk'],
            durationMs: 1800,
            extractionId: 'extract-2',
            sourceUrl: 'https://example.com/mdn',
            title: 'MDN table reference',
            originalFilename: null,
            contentType: 'text/html',
            byteSize: null,
            sourceObjectKey: null,
            outputObjectKey: 'output-2',
            outputFilename: 'mdn-table-reference.txt',
            outputFormat: 'txt',
            errorCode: null,
            errorMessage: null,
          },
          {
            id: 3,
            url: 'https://example.com/iana',
            status: 'failure',
            qualityState: null,
            warnings: [],
            diagnosticReasons: [],
            durationMs: 900,
            extractionId: null,
            sourceUrl: 'https://example.com/iana',
            title: 'IANA example domains',
            originalFilename: null,
            contentType: 'text/html',
            byteSize: null,
            sourceObjectKey: null,
            outputObjectKey: null,
            outputFilename: null,
            outputFormat: null,
            errorCode: 'EMPTY_CONTENT',
            errorMessage: 'No usable converted file came back from this row.',
          },
        ],
      }),
    });
  });

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await page.locator('#batch-urls').fill(articleUrl);
    await page.getByRole('button', { name: 'Start Batch' }).click();
    await page.locator('[data-batch-surface="primary"][data-batch-stage="review"]').waitFor({ timeout: 30_000 });

    await page
      .locator('[data-batch-surface="primary"]')
      .screenshot({ path: path.join(outputDir, 'batch-route-proof-review.png') });

    const partialRow = page.locator('[data-batch-row]').filter({ hasText: 'MDN table reference' }).first();
    await partialRow.getByRole('button', { name: /Expand/i }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-batch-row][data-batch-row-status="partial"]')?.getAttribute('data-batch-row-expanded') ===
        'true',
      undefined,
      { timeout: 30_000 },
    );
    await partialRow.screenshot({ path: path.join(outputDir, 'batch-structure-proof.png') });
  } finally {
    await page.close();
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });

try {
  await captureRunningSurface(browser);
  await captureReviewProof(browser);
  console.log(`Saved /batch proof artifacts to ${outputDir}`);
} finally {
  await browser.close();
}
