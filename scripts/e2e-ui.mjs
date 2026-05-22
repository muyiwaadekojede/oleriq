import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const structureUrl = `${baseUrl}/test-fixtures/structure-source.html`;
const rscFallbackUrl = `${baseUrl}/test-fixtures/rsc-fallback-source.html`;
const dynamicShellUrl = `${baseUrl}/test-fixtures/dynamic-shell-source.html`;
const degradedArticleUrl =
  'https://www.hashicorp.com/blog/terraform-adds-pre-written-sentinel-policies-for-iso-27001';

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
  await page.getByText('Clean output with no current warning signs.').first().waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: 'New URL' }).first().click();

  await page.locator('#url-input').waitFor({ timeout: 10_000 });

  await page.locator('#url-input').fill(structureUrl);
  await page.getByRole('button', { name: 'Convert URL' }).click();
  await page.getByText('Format notes').first().waitFor({ timeout: 60_000 });
  await page
    .getByText('This can look finished while tables lose shape.')
    .first()
    .waitFor({ timeout: 10_000 });
  await page
    .getByText('This can look finished while deeper heading levels flatten.')
    .first()
    .waitFor({ timeout: 10_000 });

  await page.getByRole('button', { name: 'New URL' }).first().click();

  await page.locator('#url-input').waitFor({ timeout: 10_000 });

  await page.locator('#url-input').fill(rscFallbackUrl);
  await page.getByRole('button', { name: 'Convert URL' }).click();
  await page.getByRole('heading', { name: 'Result trust' }).first().waitFor({ timeout: 60_000 });
  await page.getByText('Partial result').first().waitFor({ timeout: 10_000 });
  await page.getByText('Recovered from page data').first().waitFor({ timeout: 10_000 });
  await page.getByText('Dynamic page likely').first().waitFor({ timeout: 10_000 });
  await page.getByText('Browser attempted').first().waitFor({ timeout: 10_000 });

  await page.getByRole('button', { name: 'New URL' }).first().click();

  await page.locator('#url-input').waitFor({ timeout: 10_000 });

  await page.locator('#url-input').fill(degradedArticleUrl);
  await page.getByRole('button', { name: 'Convert URL' }).click();
  await page.getByRole('heading', { name: 'Result trust' }).first().waitFor({ timeout: 60_000 });
  await page.getByText('Browser rendering required').first().waitFor({ timeout: 10_000 });
  await page
    .getByText('Check tables, embeds, and layout before you export.')
    .first()
    .waitFor({ timeout: 10_000 });

  await page.getByRole('button', { name: 'New URL' }).first().click();

  await page.locator('#url-input').waitFor({ timeout: 10_000 });

  await page.locator('#url-input').fill(dynamicShellUrl);
  await page.getByRole('button', { name: 'Convert URL' }).click();

  await page.getByRole('heading', { name: "We couldn't extract this page" }).waitFor({ timeout: 60_000 });
  await page.getByText('Attempted path').first().waitFor({ timeout: 10_000 });
  await page.getByText('Browser fallback').first().waitFor({ timeout: 10_000 });
  await page.getByText('Page signal').first().waitFor({ timeout: 10_000 });
  await page.getByText('Dynamic page likely').first().waitFor({ timeout: 10_000 });
  await page.getByText('Browser attempted').first().waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Close' }).click();

  console.log('e2e-ui passed');
} finally {
  await page.close();
  await browser.close();
}
