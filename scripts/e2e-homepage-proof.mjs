import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const proof = page.locator('[data-homepage-public-proof]').first();
    await proof.waitFor({ timeout: 60_000 });
    await proof.getByText(/files converted/i).waitFor({ timeout: 60_000 });

    const box = await proof.boundingBox();
    if (!box) {
      throw new Error('Homepage public proof did not render a measurable box.');
    }

    if (box.y < 700) {
      throw new Error(`Homepage public proof must stay below the hero fold. Got y=${box.y}.`);
    }

    await page.locator('#url-input').fill(articleUrl);
    await page.getByRole('button', { name: 'Convert URL' }).click();
    await page.getByRole('button', { name: 'Download PDF' }).first().waitFor({ timeout: 60_000 });

    if ((await page.locator('[data-homepage-public-proof]').count()) !== 0) {
      throw new Error('Homepage public proof must not remain inside the extracted preview workspace.');
    }
  } finally {
    await page.close();
    await browser.close();
  }

  console.log('e2e-homepage-proof passed');
}

await main();
