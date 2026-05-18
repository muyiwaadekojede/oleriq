import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#url-input').fill(articleUrl);
  await page.getByRole('button', { name: 'Convert URL' }).click();
  await page.getByRole('progressbar').waitFor({ state: 'visible', timeout: 10_000 });

  const pdfButton = page.getByRole('button', { name: 'Download PDF' }).first();
  await pdfButton.waitFor({ state: 'attached', timeout: 60_000 });
  await pdfButton.scrollIntoViewIfNeeded();
  await pdfButton.waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('heading', { name: 'Result trust' }).first().waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: 'New URL' }).first().click();

  await page.locator('#url-input').waitFor({ timeout: 10_000 });

  await page.locator('#url-input').fill('https://example.invalid');
  await page.getByRole('button', { name: 'Convert URL' }).click();

  await page.getByRole('heading', { name: "We couldn't extract this page" }).waitFor({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Close' }).click();

  console.log('e2e-ui passed');
} finally {
  await page.close();
  await browser.close();
}
