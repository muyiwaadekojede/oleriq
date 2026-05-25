import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const hero = page.locator('[data-homepage-hero="primary"]').first();
    const proof = hero.locator('[data-homepage-public-proof]').first();
    await proof.waitFor({ timeout: 60_000 });
    await proof.getByText(/files converted/i).waitFor({ timeout: 60_000 });

    const proofBox = await proof.boundingBox();
    const buttonBox = await page.getByRole('button', { name: 'Convert URL' }).boundingBox();
    if (!proofBox || !buttonBox) {
      throw new Error('Homepage public proof did not render a measurable box.');
    }

    const buttonBottom = buttonBox.y + buttonBox.height;
    if (proofBox.y <= buttonBottom) {
      throw new Error(`Homepage public proof must render below the action row. Got proof y=${proofBox.y}, button bottom=${buttonBottom}.`);
    }

    if (proofBox.y - buttonBottom > 80) {
      throw new Error(
        `Homepage public proof must stay immediately below the action row. Gap was ${proofBox.y - buttonBottom}px.`,
      );
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
