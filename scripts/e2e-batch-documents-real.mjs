import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { readUploadPayload } from './batch-document-fixtures.mjs';
import { resolveActiveBatchLiveCorpus } from './batch-live-corpus.mjs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const tempDir = path.join(process.cwd(), '.tmp-e2e-batch-documents-real');
const firstPassFormats = ['pdf', 'md', 'txt', 'docx'];
const secondPassFormats = ['pdf', 'md', 'txt', 'docx'];
const batchSurfaceSelector = '[data-batch-surface="primary"]';

function fail(message) {
  throw new Error(message);
}

function isTransientFetchFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes('fetch failed') || lowered.includes('econnreset') || lowered.includes('socket hang up');
}

const liveCorpusOrder = [
  '.pdf',
  '.docx',
  '.epub',
  '.html',
  '.htm',
  '.txt',
  '.md',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.rst',
];

async function waitForUploadSummary(page, selectedCount, uploadedCount) {
  const expectedLine = `${selectedCount.toLocaleString()} selected`;
  await page.waitForFunction(
    ({ expectedLine, uploadedCount, batchSurfaceSelector }) => {
      const panel = document.querySelector(batchSurfaceSelector);
      const text = panel instanceof HTMLElement ? panel.innerText : '';
      return (
        text.includes(expectedLine) &&
        (text.includes(`${uploadedCount.toLocaleString()} uploaded`) ||
          text.includes('Unsupported file type.') ||
          text.includes('failed'))
      );
    },
    { expectedLine, uploadedCount, batchSurfaceSelector },
    { timeout: 120_000 },
  );
}

async function validateDownloadedOutput(outputPath, targetFormat) {
  const bytes = await fs.readFile(outputPath);
  if (bytes.length === 0) {
    fail(`Downloaded ${targetFormat} output was empty: ${outputPath}`);
  }

  if (targetFormat === 'pdf') {
    const header = bytes.subarray(0, 4).toString('utf8');
    if (header !== '%PDF') {
      fail(`Downloaded PDF did not start with %PDF: ${outputPath}`);
    }
    return;
  }

  if (targetFormat === 'docx') {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      fail(`Downloaded DOCX did not start with PK zip bytes: ${outputPath}`);
    }
    return;
  }

  const text = bytes.toString('utf8').trim();
  if (!text) {
    fail(`Downloaded ${targetFormat} output did not contain text: ${outputPath}`);
  }
}

async function documentFileInput(page) {
  const locator = page.locator('input[type="file"][multiple]').first();
  try {
    await locator.waitFor({ state: 'attached', timeout: 10_000 });
    return locator;
  } catch {
    const bodyText = await page.locator('body').innerText();
    fail(`Document uploader did not render after switching to Documents: ${bodyText}`);
  }
}

async function openDocumentsMode(page) {
  const button = page.getByRole('button', { name: 'Documents' });
  await button.waitFor({ state: 'visible', timeout: 20_000 });
  await button.click();
  await page.locator(`${batchSurfaceSelector}[data-batch-mode="document"]`).waitFor({ timeout: 60_000 });
  await page.getByText('Drop documents here or choose files.').waitFor({ timeout: 60_000 });
}

async function openMoreOptions(page) {
  await page.getByRole('button', { name: 'More options' }).click();
  await page.locator('[data-batch-more-options][data-batch-more-options-open="true"]').waitFor({
    timeout: 60_000,
  });
}

async function assertDocumentUploaderAvailable(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle', timeout: 120_000 });
    await openDocumentsMode(page);
    await documentFileInput(page);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function waitForBatchDetail(sessionId, jobId) {
  const timeoutAt = Date.now() + 240_000;

  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': sessionId,
        },
      },
    );

    if (!response.ok) {
      fail(`Batch detail request failed for ${jobId}: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    if (!json.success || !json.job) {
      fail(`Batch detail payload invalid for ${jobId}: ${JSON.stringify(json)}`);
    }

    if (json.job.status === 'completed' || json.job.status === 'failed') {
      return json;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  fail(`Batch detail polling timed out for ${jobId}.`);
}

async function runSingleConversion(browser, inputFixture, targetFormat) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const inputName = inputFixture.filename;

  try {
    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle', timeout: 120_000 });
    await openDocumentsMode(page);
    await (await documentFileInput(page)).setInputFiles([await readUploadPayload(inputFixture)]);
    await page.getByText(inputName).waitFor({ timeout: 120_000 });
    await waitForUploadSummary(page, 1, 1);

    const bodyAfterUpload = await page.locator(batchSurfaceSelector).first().innerText();
    if (!bodyAfterUpload.includes('1 uploaded')) {
      fail(`${inputName} did not finish uploading cleanly: ${bodyAfterUpload}`);
    }

    if (bodyAfterUpload.includes('Unsupported file type.')) {
      fail(`${inputName} upload was rejected before conversion: Unsupported file type.`);
    }

    if (inputFixture.imageCapable) {
      await openMoreOptions(page);
      await page.getByText('Document images').waitFor({ timeout: 60_000 });
      const imageModeOn = page.getByRole('button', { name: 'On', exact: true });
      await imageModeOn.click();
      if ((await imageModeOn.getAttribute('aria-pressed')) !== 'true') {
        fail(`${inputName} did not keep the image mode toggle on.`);
      }
    }

    await page.locator('select').first().selectOption(targetFormat);
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/batch-jobs') &&
        response.request().method() === 'POST' &&
        response.status() === 202,
      { timeout: 120_000 },
    );
    await page.getByRole('button', { name: 'Start Batch' }).click();
    const createResponse = await createResponsePromise;
    const createJson = await createResponse.json();
    const jobId = createJson?.job?.jobId;
    if (!jobId) {
      fail(`${inputName} -> ${targetFormat} did not return a batch job id: ${JSON.stringify(createJson)}`);
    }
    const sessionId = await page.evaluate(() => window.localStorage.getItem('oleriq_session_id') || '');
    if (!sessionId) {
      fail(`${inputName} -> ${targetFormat} did not expose a browser session id.`);
    }

    await page.locator(`${batchSurfaceSelector}[data-batch-stage="review"]`).waitFor({ timeout: 240_000 });
    await page.waitForFunction(
      ({ batchSurfaceSelector }) => {
        const panel = document.querySelector(batchSurfaceSelector);
        const text = panel instanceof HTMLElement ? panel.innerText : '';
        return (
          text.includes('Expand') ||
          text.includes('Show clean rows') ||
          text.includes('DOCUMENT_CONVERSION_FAILED') ||
          text.includes('Unsupported file type.')
        );
      },
      { batchSurfaceSelector },
      { timeout: 240_000 },
    );

    if (targetFormat === 'txt' && inputFixture.imageCapable) {
      await page.locator('[data-batch-row]').first().getByRole('button').first().click();
      await page.waitForFunction(
        ({ batchSurfaceSelector }) => {
          const panel = document.querySelector(batchSurfaceSelector);
          const text = panel instanceof HTMLElement ? panel.innerText : '';
          return text.toLowerCase().includes('degraded') && text.includes('Images become captions instead of embedded images in TXT output.');
        },
        { batchSurfaceSelector },
        { timeout: 240_000 },
      );
    }

    const bodyText = await page.locator(batchSurfaceSelector).first().innerText();
    const failureLine = bodyText
      .split('\n')
      .find((line) => line.includes('DOCUMENT_CONVERSION_FAILED') || line.includes('Unsupported file type.'));

    if (failureLine) {
      fail(`${inputName} -> ${targetFormat} failed: ${failureLine.trim()}`);
    }

    if (targetFormat === 'txt' && inputFixture.imageCapable) {
      if (!bodyText.toLowerCase().includes('degraded')) {
        fail(`${inputName} -> ${targetFormat} did not expose a degraded result state.`);
      }

      if (!bodyText.includes('Images become captions instead of embedded images in TXT output.')) {
        fail(`${inputName} -> ${targetFormat} did not expose the deterministic TXT image warning.`);
      }
    }

    const detail = await waitForBatchDetail(sessionId, jobId);
    const successfulItem = Array.isArray(detail.items)
      ? detail.items.find((item) => item.status === 'success' && item.outputFilename)
      : null;

    if (!successfulItem?.id) {
      fail(`${inputName} -> ${targetFormat} did not expose a downloadable batch item: ${JSON.stringify(detail)}`);
    }

    const downloadResponse = await fetch(
      `${baseUrl}/api/batch-jobs/download?jobId=${encodeURIComponent(jobId)}&itemId=${encodeURIComponent(String(successfulItem.id))}`,
      {
        headers: {
          'x-oleriq-session': sessionId,
        },
      },
    );

    if (!downloadResponse.ok) {
      fail(
        `${inputName} -> ${targetFormat} batch download failed: ${downloadResponse.status} ${await downloadResponse.text()}`,
      );
    }

    const contentDisposition = downloadResponse.headers.get('content-disposition') || '';
    const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
    const outputName = match?.[1] || successfulItem.outputFilename;
    const outputPath = path.join(tempDir, outputName);
    const outputBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    await fs.writeFile(outputPath, outputBuffer);

    if (!outputName.toLowerCase().endsWith(`.${targetFormat}`)) {
      fail(`Unexpected output extension for ${inputName} -> ${targetFormat}: ${outputName}`);
    }

    await validateDownloadedOutput(outputPath, targetFormat);

    return {
      inputName,
      inputExt: inputFixture.inputExt,
      targetFormat,
      outputName,
      outputPath,
      imageMode: inputFixture.imageCapable ? 'on' : 'off',
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function runSingleConversionWithRetry(browser, inputFixture, targetFormat) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await runSingleConversion(browser, inputFixture, targetFormat);
    } catch (error) {
      lastError = error;
      if (!isTransientFetchFailure(error) || attempt >= 2) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw lastError;
}

async function main() {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const liveCorpus = await resolveActiveBatchLiveCorpus();
  const firstPassInputs = [...liveCorpus.documents]
    .sort((left, right) => {
      const leftIndex = liveCorpusOrder.indexOf(left.inputExt);
      const rightIndex = liveCorpusOrder.indexOf(right.inputExt);
      return leftIndex - rightIndex;
    })
    .map((fixture) => ({
      filename: fixture.filename,
      localPath: fixture.localPath,
      contentType: fixture.contentType,
      inputExt: fixture.inputExt.replace(/^\./, ''),
      imageCapable: fixture.imageCapable,
    }));

  if (firstPassInputs.length !== liveCorpusOrder.length) {
    fail(`Expected one downloaded live-corpus document per supported format, got ${firstPassInputs.length}.`);
  }

  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    try {
      await assertDocumentUploaderAvailable(browser);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`document uploader preflight: ${message}`);
      fail(`e2e-batch-documents-real failed\n- ${failures.join('\n- ')}`);
    }

    const firstPass = [];
    for (const inputFixture of firstPassInputs) {
      for (const format of firstPassFormats) {
        try {
          const result = await runSingleConversionWithRetry(browser, inputFixture, format);
          firstPass.push(result);
          console.log(`pass1 ${result.inputExt}->${format} ok (${result.outputName}) [images=${result.imageMode}]`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`pass1 ${inputFixture.inputExt}->${format}: ${message}`);
          console.error(`FAIL pass1 ${inputFixture.inputExt}->${format}: ${message}`);
        }
      }
    }

    const representative = new Map();
    for (const row of firstPass) {
      if (!representative.has(row.targetFormat)) {
        representative.set(row.targetFormat, row.outputPath);
      }
    }

    const secondPass = [];

    for (const [sourceExt, inputPath] of representative.entries()) {
      for (const format of secondPassFormats) {
        try {
          const result = await runSingleConversionWithRetry(
            browser,
            {
              filename: path.basename(inputPath),
              localPath: inputPath,
              contentType:
                sourceExt === 'pdf'
                  ? 'application/pdf'
                  : sourceExt === 'docx'
                    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    : 'text/plain; charset=utf-8',
              inputExt: sourceExt,
              imageCapable: sourceExt === 'pdf' || sourceExt === 'docx',
            },
            format,
          );
          secondPass.push(result);
          console.log(`pass2 ${sourceExt}->${format} ok (${result.outputName})`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`pass2 ${sourceExt}->${format}: ${message}`);
          console.error(`FAIL pass2 ${sourceExt}->${format}: ${message}`);
        }
      }
    }

    if (representative.size !== secondPassFormats.length) {
      failures.push(
        `representative outputs incomplete: expected ${secondPassFormats.length}, got ${representative.size}`,
      );
    }

    if (failures.length > 0) {
      fail(`e2e-batch-documents-real failed\n- ${failures.join('\n- ')}`);
    }

    console.log('e2e-batch-documents-real passed');
  } finally {
    await browser.close();
  }
}

await main();
