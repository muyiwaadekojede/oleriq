import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
import { buildPdfConversionSource } from '@/lib/pdfConversion';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const sessionId = `e2e-batch-throughput-${Date.now()}`;
const fixturePath = path.join(process.cwd(), '.tmp-e2e-batch-throughput', 'throughput-image-heavy-v2.pdf');
const batchSize = 6;

function fail(message: string): never {
  throw new Error(message);
}

function isTransientFetchFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes('fetch failed') || lowered.includes('econnreset') || lowered.includes('socket hang up');
}

function headers(): HeadersInit {
  return {
    'x-oleriq-session': sessionId,
  };
}

async function readJson(response: Response): Promise<any> {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { raw };
  }
}

async function measureLegacyHeavyBaseline(bytes: Buffer): Promise<number> {
  const startedAt = Date.now();
  for (let index = 0; index < batchSize; index += 1) {
    const source = await buildPdfConversionSource({
      bytes,
      title: `baseline-${index + 1}`,
      maxPages: 120,
    });
    if (!source) {
      fail(`Legacy PDF conversion baseline failed for fixture copy ${index + 1}.`);
    }
  }
  return Date.now() - startedAt;
}

async function ensureThroughputFixture(): Promise<Buffer> {
  try {
    return await fs.readFile(fixturePath);
  } catch {
    await fs.mkdir(path.dirname(fixturePath), { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 1280 } });

    try {
      const imageDataUrl = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1400;
        canvas.height = 900;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas context is unavailable for throughput fixture generation.');
        }

        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f766e');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#111827');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(255,255,255,0.92)';
        context.font = 'bold 76px Georgia';
        context.fillText('Oleriq Throughput Fixture', 70, 160);
        context.font = '36px Georgia';
        context.fillText('Image-heavy text-native benchmark page', 70, 240);
        context.strokeStyle = 'rgba(255,255,255,0.35)';
        context.lineWidth = 12;
        context.strokeRect(60, 70, canvas.width - 120, canvas.height - 140);
        return canvas.toDataURL('image/png');
      });

      const sections = Array.from({ length: 24 }, (_, index) => {
        const pageNumber = index + 1;
        return `
          <section class="sheet">
            <h1>Throughput Fixture Page ${pageNumber}</h1>
            <img src="${imageDataUrl}" alt="Throughput fixture figure ${pageNumber}" />
            <p>This page exists to benchmark image-heavy text-native PDF conversion throughput for Markdown output.</p>
            <p>Each page keeps long-form paragraph structure so the fast text lane can prove a real advantage over the old render-first path while images stay disabled.</p>
            <p>Page ${pageNumber} repeats stable copy for deterministic benchmarking. Oleriq should preserve headings and paragraphs without paying image-rendering cost.</p>
            <p>The worker lane should stay on fast_text for this document family because the content is still text-native and the run requests Markdown with images off.</p>
          </section>
        `;
      }).join('\n');

      await page.setContent(
        `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Georgia, 'Times New Roman', serif; color: #111827; margin: 0; }
              .sheet {
                min-height: 9.2in;
                padding: 0.55in 0.6in;
                box-sizing: border-box;
                page-break-after: always;
              }
              .sheet:last-child { page-break-after: auto; }
              h1 { font-size: 26px; margin: 0 0 14px; }
              img {
                display: block;
                width: 100%;
                max-width: 6.9in;
                margin: 0 0 16px;
                border-radius: 18px;
              }
              p { font-size: 14px; line-height: 1.5; margin: 0 0 10px; }
            </style>
          </head>
          <body>${sections}</body>
        </html>`,
        { waitUntil: 'load' },
      );

      await page.pdf({
        path: fixturePath,
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.35in',
          right: '0.35in',
          bottom: '0.35in',
          left: '0.35in',
        },
      });
    } finally {
      await page.close();
      await browser.close();
    }

    return await fs.readFile(fixturePath);
  }
}

async function createUpload(bytes: Buffer, index: number): Promise<string> {
  const filename = `throughput-${index + 1}.pdf`;
  const uploadResponse = await fetch(
    `${baseUrl}/api/batch-upload-local?sessionId=${encodeURIComponent(sessionId)}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent('application/pdf')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: new Uint8Array(bytes),
    },
  );
  const uploadJson = await readJson(uploadResponse);
  if (!uploadResponse.ok || !uploadJson.success || !uploadJson.file?.objectKey) {
    fail(`Throughput upload failed for ${filename}: ${uploadResponse.status} ${JSON.stringify(uploadJson)}`);
  }

  const completeResponse = await fetch(`${baseUrl}/api/batch-upload-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers(),
    },
    body: JSON.stringify({
      mode: 'filesystem',
      objectKey: uploadJson.file.objectKey,
      objectUrl: uploadJson.file.objectUrl,
      downloadUrl: uploadJson.file.downloadUrl,
      filename: uploadJson.file.originalFilename,
      contentType: uploadJson.file.contentType,
      byteSize: uploadJson.file.byteSize,
    }),
  });
  const completeJson = await readJson(completeResponse);
  if (!completeResponse.ok || !completeJson.success || !completeJson.file?.uploadId) {
    fail(`Throughput upload finalization failed for ${filename}: ${completeResponse.status} ${JSON.stringify(completeJson)}`);
  }

  return completeJson.file.uploadId;
}

async function waitForJobCompletion(jobId: string): Promise<any> {
  const timeoutAt = Date.now() + 420_000;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(
        `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=400&offset=0`,
        { headers: headers() },
      );
      const json = await readJson(response);
      if (!response.ok) {
        fail(`Throughput batch detail failed: ${response.status} ${JSON.stringify(json)}`);
      }

      if (json.job?.status === 'completed' || json.job?.status === 'failed') {
        return json;
      }
    } catch (error) {
      if (!isTransientFetchFailure(error)) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  fail(`Throughput batch detail timed out for job ${jobId}.`);
}

async function main(): Promise<void> {
  const bytes = await ensureThroughputFixture();
  const heavyBaselineMs = await measureLegacyHeavyBaseline(bytes);

  const uploadIds: string[] = [];
  for (let index = 0; index < batchSize; index += 1) {
    uploadIds.push(await createUpload(bytes, index));
  }

  const startedAt = Date.now();
  const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers(),
    },
    body: JSON.stringify({
      inputMode: 'document',
      files: uploadIds.map((uploadId) => ({ uploadId })),
      format: 'md',
      images: 'off',
      settings: {
        fontFace: 'serif',
        fontSize: 16,
        lineSpacing: 1.6,
        colorTheme: 'light',
      },
    }),
  });
  const createJson = await readJson(createResponse);
  if (!createResponse.ok || !createJson.success || !createJson.job?.jobId) {
    fail(`Throughput batch creation failed: ${createResponse.status} ${JSON.stringify(createJson)}`);
  }

  const detail = await waitForJobCompletion(createJson.job.jobId);
  const batchWallClockMs = Date.now() - startedAt;

  if (detail.job?.status !== 'completed') {
    fail(`Throughput batch did not complete successfully: ${JSON.stringify(detail)}`);
  }

  if (Number(detail.job?.successCount || 0) !== batchSize || Number(detail.job?.failureCount || 0) !== 0) {
    fail(`Throughput batch had unexpected row counts: ${JSON.stringify(detail.job)}`);
  }

  const speedup = heavyBaselineMs / Math.max(1, batchWallClockMs);
  if (speedup < 5) {
    fail(
      `Expected at least 5x throughput improvement, got ${speedup.toFixed(2)}x (heavy=${heavyBaselineMs}ms, batch=${batchWallClockMs}ms).`,
    );
  }

  console.log(
    JSON.stringify(
      {
        heavyBaselineMs,
        batchWallClockMs,
        speedup,
        laneSummary: detail.job?.laneSummary || null,
        throughputPerMinute: detail.job?.throughputPerMinute || null,
        retryCount: detail.job?.retryCount || null,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
