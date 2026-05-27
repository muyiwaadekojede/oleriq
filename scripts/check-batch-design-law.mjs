import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const setupSurfaceSelector = '[data-batch-surface="primary"]';
const retiredBrand = ['Clear', 'page'].join('');
const retiredBrandHeading = `What the retired ${retiredBrand} brand tried to preserve during batch conversion`;

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

  const pageTitle = await page.title();
  if (pageTitle !== 'Batch convert URLs and documents to Markdown, TXT, DOCX, or PDF | Oleriq') {
    fail(`Expected /batch title to use Oleriq, got: ${pageTitle}`);
  }

  await assertText(page, 'Batch convert URLs and documents');
  await assertText(page, 'Convert many links or files into clean, readable Markdown, TXT, DOCX, or PDF.');
  await assertText(page, 'Batch convert URLs and documents');
  await assertText(page, 'One finished run should not hide what actually came back.');
  await assertTextAbsent(page, 'Batch Workspace');
  await assertTextAbsent(page, 'Prepare batch');
  await assertSingleWorkingSurface(page);
  await assertStage(page, 'setup');

  const surface = page.locator(setupSurfaceSelector);
  const surfaceText = await surface.innerText();
  if (surfaceText.includes('Batch convert many links into one clean output.')) {
    fail('URL setup should not repeat the route headline inside the primary panel.');
  }
  if (surfaceText.includes('Choose the input, choose the output, then start.')) {
    fail('URL setup should not repeat the route helper copy inside the primary panel.');
  }
  if (surfaceText.includes('Import')) {
    fail('URL setup should keep Import inside More options.');
  }
  if (surfaceText.includes('Limit 50,000 URLs')) {
    fail('URL technical limits should stay hidden before More options opens.');
  }
  if (surfaceText.includes('Authenticated session')) {
    fail('URL setup must not show authenticated session controls.');
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
  await assertTextAbsent(page, 'Authenticated session');

  await page.getByRole('button', { name: 'Documents' }).click();
  await assertStage(page, 'setup');
  await assertText(page, 'Drop documents here or choose files.');
  const documentSurfaceText = await surface.innerText();
  if (documentSurfaceText.includes('Batch convert many files into one clean output.')) {
    fail('Document setup should not repeat the route headline inside the primary panel.');
  }
  if (documentSurfaceText.includes('Choose the input, choose the output, then start.')) {
    fail('Document setup should not repeat the route helper copy inside the primary panel.');
  }
  await assertTextAbsent(page, 'Document images');
  await assertTextAbsent(page, '60 MB per file');
  await assertTextAbsent(page, 'Authenticated session');

  const documentMoreOptionsButton = page.getByRole('button', { name: 'More options' });
  await documentMoreOptionsButton.click();
  await page.locator('[data-batch-more-options][data-batch-more-options-open="true"]').waitFor({ timeout: 30_000 });
  await assertText(page, 'Document images');
  await assertText(page, '60 MB per file');
  await assertText(page, '2.0 GB total');
  await assertTextAbsent(page, 'Authenticated session');
}


async function assertBelowFoldGuide(page) {
  const guide = page.locator('[data-batch-guide="true"]');
  await guide.waitFor({ timeout: 30_000 });

  const requiredSections = [
    'truth-surface',
    'structure-proof',
    'run-recovery',
    'faq',
  ];

  for (const section of requiredSections) {
    const count = await guide.locator(`[data-batch-guide-section="${section}"]`).count();
    if (count !== 1) {
      fail(`Expected exactly one below-fold section for ${section}, found ${count}.`);
    }
  }

  const proofImageCount = await guide.locator('[data-batch-guide-artifact] img').count();
  if (proofImageCount < 3) {
    fail(`Expected at least 3 real /batch proof artifacts, found ${proofImageCount}.`);
  }

  const removedSections = ['route-proof', 'status-truth', 'workload-fit'];
  for (const section of removedSections) {
    const count = await guide.locator(`[data-batch-guide-section="${section}"]`).count();
    if (count !== 0) {
      fail(`Expected legacy below-fold section ${section} to be removed, found ${count}.`);
    }
  }

  const supportCardCount = await guide.locator('[data-batch-guide-card]').count();
  if (supportCardCount > 6) {
    fail(`Expected the reduced below-fold pass to keep support cards at 6 or fewer, found ${supportCardCount}.`);
  }

  await assertText(page, 'One finished run should not hide what actually came back.');
  await assertText(page, 'Readable structure can still flatten.');
  await assertText(page, 'Longer runs stay legible and recoverable.');
  await assertText(page, 'Use /batch when repeated work needs one output target and one review surface.');
  await assertText(page, 'Questions that matter before a bigger run.');
  await assertText(page, 'Truth surface');
  await assertText(page, 'Structure proof');
  await assertText(page, 'Run recovery');
  await assertTextAbsent(page, retiredBrand);

  const faqHeading = guide.locator('[data-batch-guide-section="faq"] h2');
  await faqHeading.scrollIntoViewIfNeeded();
  const faqHeadingLines = await faqHeading.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const height = element.getBoundingClientRect().height;
    return { lineHeight, height };
  });
  if (
    Number.isFinite(faqHeadingLines.lineHeight) &&
    Number.isFinite(faqHeadingLines.height) &&
    faqHeadingLines.height > faqHeadingLines.lineHeight * 1.35
  ) {
    fail(
      `Expected FAQ heading to stay on one desktop line, got height ${faqHeadingLines.height} for line-height ${faqHeadingLines.lineHeight}.`,
    );
  }

  await assertTextAbsent(page, retiredBrandHeading);
  await assertTextAbsent(page, 'How batch results are reported');
  await assertTextAbsent(page, 'Progress, retries, and trust during longer runs');
  await assertTextAbsent(page, 'Workloads this route is built for');

  const faqItems = guide.locator('[data-batch-faq-item]');
  const faqCount = await faqItems.count();
  if (faqCount !== 4) {
    fail(`Expected 4 collapsible FAQ items, found ${faqCount}.`);
  }

  for (let index = 0; index < faqCount; index += 1) {
    const item = faqItems.nth(index);
    const open = await item.getAttribute('open');
    if (open !== null) {
      fail(`Expected FAQ item ${index} to be collapsed by default.`);
    }
  }

  const hiddenAnswerText = 'Yes. That is why the route keeps partial and degraded separate instead of flattening every finished row into one clean-looking state.';
  const visibleGuideText = (await guide.innerText()).toLowerCase();
  if (visibleGuideText.includes(hiddenAnswerText.toLowerCase())) {
    fail('FAQ answers should not be visible before expansion.');
  }

  await faqItems.nth(0).locator('summary').click();
  const expandedText = (await guide.innerText()).toLowerCase();
  if (!expandedText.includes(hiddenAnswerText.toLowerCase())) {
    fail('FAQ answer did not become visible after expansion.');
  }
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
    await assertBelowFoldGuide(page);

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
