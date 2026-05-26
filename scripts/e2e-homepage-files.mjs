import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

function fail(message) {
  throw new Error(message);
}

async function createFixture() {
  const dir = path.join(process.cwd(), '.tmp-e2e-homepage-files');
  await fs.mkdir(dir, { recursive: true });

  const fixturePath = path.join(dir, 'homepage-file-note.txt');
  await fs.writeFile(
    fixturePath,
    ['Homepage file conversion test.', '', 'This file should convert without leaving /.'].join('\n'),
  );
  return fixturePath;
}

async function waitForUploadSummary(page) {
  await page.waitForFunction(
    () => {
      const panel = document.querySelector('[data-homepage-file-workspace]');
      const text = panel instanceof HTMLElement ? panel.innerText : '';
      return text.includes('1 selected') && text.includes('1 uploaded');
    },
    undefined,
    { timeout: 120_000 },
  );
}

async function main() {
  const fixturePath = await createFixture();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const hero = page.locator('[data-homepage-hero="primary"]').first();
    await hero.locator('[data-homepage-mode-switch] button', { hasText: 'File' }).click();
    await page.locator('[data-homepage-file-workspace]').waitFor({ timeout: 60_000 });

    const input = page.locator('[data-homepage-file-workspace] input[type="file"][multiple]').first();
    await input.setInputFiles([fixturePath]);
    await waitForUploadSummary(page);

    await page
      .locator('[data-homepage-file-workspace] select[aria-label="Output format"]')
      .selectOption('md');
    await page.getByRole('button', { name: 'Convert files' }).click();

    const review = page.locator('[data-homepage-file-workspace] [data-batch-review-list]').first();
    await review.waitFor({ timeout: 180_000 });

    const summaryText = await page.locator('[data-homepage-file-workspace] [data-batch-review-summary]').innerText();
    if (!summaryText.includes('1 usable')) {
      fail(`Expected homepage file summary to include 1 usable result, got: ${summaryText}`);
    }

    await hero.locator('button', { hasText: 'Advanced options' }).click();
    await page.locator('[data-auth-session-manager="true"]').waitFor({ timeout: 60_000 });

    const showCleanRows = page.getByRole('button', { name: /Show clean rows/i }).first();
    await showCleanRows.waitFor({ timeout: 60_000 });
    await showCleanRows.click();
    await page.getByText('homepage-file-note.txt').waitFor({ timeout: 60_000 });
  } finally {
    await page.close();
    await browser.close();
  }

  console.log('e2e-homepage-files passed');
}

await main();
