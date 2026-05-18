import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;

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
    fail(`Unexpected /batch text on first load: ${text}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });

  await assertText(page, 'Batch convert URLs and documents');
  await assertText(page, 'Convert many links or files into clean, readable Markdown, TXT, DOCX, or PDF.');
  await assertText(page, 'Batch convert many URLs or files into readable documents');
  await assertText(page, 'What Clearpage tries to preserve during batch conversion');
  await assertText(page, 'How batch results are reported');
  await assertText(page, 'Progress, retries, and trust during longer runs');
  await assertText(page, 'Workloads this route is built for');
  await assertText(page, 'Batch conversion FAQ');
  await assertTextAbsent(page, 'Batch Workspace');
  await assertTextAbsent(page, 'Input mode');
  await assertTextAbsent(page, 'Prepare batch');
  await assertTextAbsent(page, 'Batch activity');
  await assertTextAbsent(page, 'Retry failed URLs');
  await assertTextAbsent(page, 'Retry failed files');

  const visibleWorkingSurfaceCount = await page.locator('main section.rounded-2xl.border').evaluateAll((elements) =>
    elements.filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).length,
  );

  if (visibleWorkingSurfaceCount !== 1) {
    fail(`Expected exactly one visible /batch working surface on first load, found ${visibleWorkingSurfaceCount}.`);
  }

  const articleSection = page.locator('section[aria-labelledby="batch-search-guidance-heading"]');
  await articleSection.waitFor({ timeout: 30_000 });

  const visibleArticleCount = await articleSection.evaluateAll((elements) =>
    elements.filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).length,
  );

  if (visibleArticleCount !== 1) {
    fail(`Expected exactly one visible /batch below-fold article body, found ${visibleArticleCount}.`);
  }

  const visibleMainLinks = await page.locator('main a').count();
  if (visibleMainLinks !== 1) {
    fail(`Expected exactly one visible /batch internal link on first load, found ${visibleMainLinks} links.`);
  }

  await assertText(page, 'single URL converter');
  await assertTextAbsent(page, 'When to use the homepage');

  const articleBox = await articleSection.boundingBox();
  const workingSurfaceBox = await page.locator('main section.rounded-2xl.border').first().boundingBox();

  if (!articleBox || !workingSurfaceBox) {
    fail('Unable to read /batch working-surface or article layout bounds.');
  }

  if (articleBox.y <= workingSurfaceBox.y + workingSurfaceBox.height) {
    fail('Expected the /batch below-fold article to begin after the working surface.');
  }

  await page.getByRole('button', { name: 'Documents' }).click();
  await assertText(page, 'Convert many links or files into clean, readable Markdown, TXT, DOCX, or PDF.');
  await assertTextAbsent(page, 'Batch activity');
  await assertTextAbsent(page, 'Retry failed files');

  await page.getByRole('button', { name: 'URLs' }).click();
  await page.locator('#batch-urls').fill(`${articleUrl}\nhttps://example.invalid`);
  await page.getByRole('button', { name: 'Start Batch' }).click();
  await page.getByRole('heading', { name: 'Batch activity' }).waitFor({ timeout: 180_000 });
  await page.getByRole('progressbar').waitFor({ timeout: 60_000 });
  const retryButton = page.getByRole('button', { name: /Retry failed URLs/ });
  await retryButton.waitFor({ timeout: 180_000 });
  const previousJobText = await page.locator('text=/Job\\s+[a-f0-9]{8}/i').first().innerText();
  await retryButton.click();
  await page.getByRole('button', { name: 'Processing Batch...' }).waitFor({ timeout: 180_000 });
  await page.waitForFunction(
    ({ prior }) => {
      const text = document.body.innerText;
      const match = text.match(/Job\s+([a-f0-9]{8})/i);
      return Boolean(match && match[0] !== prior);
    },
    { prior: previousJobText },
    { timeout: 180_000 },
  );

  console.log('/batch design-law check passed');
} finally {
  await browser.close();
}
