import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const setupSurfaceSelector = '[data-batch-surface="primary"]';

function fail(message) {
  throw new Error(message);
}

async function assertText(page, text) {
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  if (!bodyText.includes(text.toLowerCase())) {
    fail(`Missing required /batch text: ${text}`);
  }
}

async function assertTextAbsent(page, text) {
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  if (bodyText.includes(text.toLowerCase())) {
    fail(`Unexpected /batch text: ${text}`);
  }
}

async function assertSingleWorkingSurface(page) {
  const count = await page.locator(setupSurfaceSelector).count();
  if (count !== 1) {
    fail(`Expected exactly one visible /batch working surface, found ${count}.`);
  }
}

async function assertStage(page, stage) {
  await page.locator(`${setupSurfaceSelector}[data-batch-stage="${stage}"]`).waitFor({ timeout: 30_000 });
}

async function assertRowTitles(page, expectedTitles) {
  const titles = await page
    .locator('[data-batch-review-list] [data-batch-row] [data-batch-row-title]')
    .allInnerTexts();
  const normalized = titles.map((value) => value.trim()).filter(Boolean);
  const expected = [...expectedTitles];
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) {
    fail(`Expected visible review rows ${JSON.stringify(expected)}, got ${JSON.stringify(normalized)}.`);
  }
}

async function assertSetupState(page) {
  await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });

  const bodyFontSystem = await page.locator('body').getAttribute('data-font-system');
  if (bodyFontSystem !== 'newsreader-geist') {
    fail(`Expected body data-font-system to be newsreader-geist, found ${bodyFontSystem || 'null'}.`);
  }

  await assertText(page, 'Batch convert URLs and documents');
  await assertText(page, 'Convert many links or files into clean, readable Markdown, TXT, DOCX, or PDF.');
  await assertText(page, 'Batch convert many URLs or files into readable documents');
  await assertText(page, 'What Clearpage tries to preserve during batch conversion');
  await assertText(page, 'How batch results are reported');
  await assertText(page, 'Progress, retries, and trust during longer runs');
  await assertText(page, 'Workloads this route is built for');
  await assertText(page, 'Batch conversion FAQ');
  await assertTextAbsent(page, 'Batch Workspace');
  await assertTextAbsent(page, 'Prepare batch');
  await assertSingleWorkingSurface(page);
  await assertStage(page, 'setup');

  const surface = page.locator(setupSurfaceSelector);
  const surfaceText = await surface.innerText();
  if (surfaceText.includes('Import')) {
    fail('URL setup should keep Import inside More options.');
  }
  if (surfaceText.includes('Limit 50,000 URLs')) {
    fail('URL technical limits should stay hidden before More options opens.');
  }
  if (surfaceText.includes('Download 0')) {
    fail('Setup state should not show bulk download controls.');
  }

  const moreOptionsButton = page.getByRole('button', { name: 'More options' });
  await moreOptionsButton.waitFor({ timeout: 30_000 });
  const expanded = await moreOptionsButton.getAttribute('aria-expanded');
  if (expanded !== 'false') {
    fail(`Expected More options to be closed by default, got aria-expanded=${expanded}.`);
  }

  await moreOptionsButton.click();
  await page.locator('[data-batch-more-options][data-batch-more-options-open="true"]').waitFor({ timeout: 30_000 });
  await assertText(page, 'Import');
  await assertText(page, 'Limit 50,000 URLs');

  await page.getByRole('button', { name: 'Documents' }).click();
  await assertStage(page, 'setup');
  await assertText(page, 'Drop documents here or choose files.');
  await assertTextAbsent(page, 'Document images');
  await assertTextAbsent(page, '60 MB per file');

  const documentMoreOptionsButton = page.getByRole('button', { name: 'More options' });
  await documentMoreOptionsButton.click();
  await page.locator('[data-batch-more-options][data-batch-more-options-open="true"]').waitFor({ timeout: 30_000 });
  await assertText(page, 'Document images');
  await assertText(page, '60 MB per file');
  await assertText(page, '2.0 GB total');
}

async function assertRunningState(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

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
          jobId: 'mock-running-job',
          totalUrls: 3,
          status: 'queued',
          estimatedProcessingMs: 42000,
        },
      }),
    });
  });

  await page.route('**/api/batch-jobs?jobId=mock-running-job*&limit=400&offset=0', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        estimatedRemainingMs: 38000,
        job: {
          id: 'mock-running-job',
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
    await assertStage(page, 'running');
    await page.getByRole('progressbar').waitFor({ timeout: 30_000 });

    const surfaceText = await page.locator(setupSurfaceSelector).innerText();
    if (surfaceText.includes('Retry failed URLs')) {
      fail('Running state should not show retry controls before settled rows exist.');
    }
    if (surfaceText.includes('Show clean rows')) {
      fail('Running state should not show review controls before settled rows exist.');
    }

    const reviewListCount = await page.locator('[data-batch-review-list]').count();
    if (reviewListCount !== 0) {
      fail(`Running state should hide the review list until settled rows exist, found ${reviewListCount} review lists.`);
    }
  } finally {
    await page.close();
    await context.close();
  }
}

async function assertReviewState(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

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
          jobId: 'mock-review-job',
          totalUrls: 3,
          status: 'queued',
          estimatedProcessingMs: 18000,
        },
      }),
    });
  });

  await page.route('**/api/batch-jobs?jobId=mock-review-job*&limit=400&offset=0', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        estimatedRemainingMs: 0,
        job: {
          id: 'mock-review-job',
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
          averageDurationMs: 1500,
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
    await assertStage(page, 'review');

    await assertText(page, '1 usable');
    await assertText(page, '1 partial');
    await assertText(page, '0 degraded');
    await assertText(page, '1 failed');
    await assertText(page, 'Show clean rows');

    await assertRowTitles(page, ['IANA example domains', 'MDN table reference']);

    const rows = page.locator('[data-batch-review-list] [data-batch-row]');
    const rowCount = await rows.count();
    if (rowCount !== 2) {
      fail(`Expected 2 visible non-clean rows before showing clean rows, found ${rowCount}.`);
    }

    for (let index = 0; index < rowCount; index += 1) {
      const row = rows.nth(index);
      const expanded = await row.getAttribute('data-batch-row-expanded');
      if (expanded !== 'false') {
        fail(`Expected row ${index} to be collapsed by default, got data-batch-row-expanded=${expanded}.`);
      }

      const rowText = await row.innerText();
      if (rowText.includes('Download')) {
        fail(`Collapsed row ${index} should not expose Download actions.`);
      }
      if (rowText.includes('Retry')) {
        fail(`Collapsed row ${index} should not expose Retry actions.`);
      }
    }

    await page.getByRole('button', { name: /Show clean rows/i }).click();
    await assertRowTitles(page, ['IANA example domains', 'MDN table reference', 'BBC Sport article']);
  } finally {
    await page.close();
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  try {
    await assertSetupState(page);
  } finally {
    await page.close();
  }

  await assertRunningState(browser);
  await assertReviewState(browser);

  console.log('/batch design-law check passed');
} finally {
  await browser.close();
}
