import { resolveActiveBatchLiveCorpus } from './batch-live-corpus.mjs';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const sessionId = `e2e-batch-live-corpus-${Date.now()}`;

function fail(message) {
  throw new Error(message);
}

async function fetchBatchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      Connection: 'close',
      ...(options.headers || {}),
    },
  });

  return response;
}

async function runSingleUrlBatch(urls, format, suffix, attempt) {
  const createResponse = await fetchBatchJson(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': `${sessionId}-${suffix}-attempt-${attempt}`,
    },
    body: JSON.stringify({
      urls,
      format,
      images: 'off',
      settings: {
        fontFace: 'serif',
        fontSize: 16,
        lineSpacing: 1.6,
        colorTheme: 'light',
      },
    }),
  });

  const created = await createResponse.json();
  if (!createResponse.ok || !created.success || !created.job?.jobId) {
    fail(`Live corpus batch create failed for ${format}: ${createResponse.status} ${JSON.stringify(created)}`);
  }

  const jobId = created.job.jobId;
  const timeoutAt = Date.now() + 240_000;
  let detail = null;

  while (Date.now() < timeoutAt) {
    const response = await fetchBatchJson(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': `${sessionId}-${suffix}-attempt-${attempt}`,
        },
      },
    );

    if (!response.ok) {
      fail(`Live corpus batch status failed for ${format}: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    detail = json;
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  if (!detail?.job || detail.job.status !== 'completed') {
    fail(`Live corpus ${format} batch did not complete cleanly: ${JSON.stringify(detail)}`);
  }

  if (!Array.isArray(detail.items) || detail.items.length !== urls.length) {
    fail(`Live corpus ${format} batch item count mismatch: ${JSON.stringify(detail)}`);
  }

  if (detail.job.totalUrls !== urls.length) {
    fail(`Live corpus ${format} batch totalUrls mismatch: ${JSON.stringify(detail.job)}`);
  }

  return detail;
}

async function runUrlBatch(urls, format, suffix) {
  let detail = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      detail = await runSingleUrlBatch(urls, format, suffix, attempt);
      if (detail.job.failureCount === 0 && detail.job.successCount === urls.length) {
        break;
      }

      lastError = new Error(
        `Live corpus ${format} batch should not fail curated public URLs: ${JSON.stringify(detail.job)}`,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  if (!detail || detail.job.failureCount !== 0 || detail.job.successCount !== urls.length) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`Live corpus ${format} batch failed without an Error object.`);
  }

  if (detail.job.failureCount !== 0) {
    fail(`Live corpus ${format} batch should not fail curated public URLs: ${JSON.stringify(detail.job)}`);
  }

  if (detail.job.successCount !== urls.length) {
    fail(`Live corpus ${format} batch should succeed on all curated public URLs: ${JSON.stringify(detail.job)}`);
  }

  const usableItems = detail.items.filter((item) => item.status === 'success' && item.qualityState === 'usable');
  const trustIssueItems = detail.items.filter(
    (item) => item.status === 'success' && (item.qualityState === 'degraded' || item.qualityState === 'partial'),
  );
  if (usableItems.length === 0 || trustIssueItems.length === 0) {
    fail(`Live corpus ${format} batch should exercise both usable and non-usable trust states: ${JSON.stringify(detail.items)}`);
  }

  const firstSuccessfulItem = detail.items.find((item) => item.status === 'success');
  if (!firstSuccessfulItem || !Array.isArray(firstSuccessfulItem.diagnosticReasons) || !Array.isArray(firstSuccessfulItem.warnings)) {
    fail(`Live corpus ${format} batch did not return the trust surface arrays: ${JSON.stringify(firstSuccessfulItem)}`);
  }
}

async function main() {
  const liveCorpus = await resolveActiveBatchLiveCorpus();
  const urls = liveCorpus.urls.map((entry) => String(entry.url || '').trim()).filter(Boolean);

  if (urls.length < 3) {
    fail(`Active live corpus must contain at least three public URLs. Got ${urls.length}.`);
  }

  await runUrlBatch(urls, 'md', 'md');
  await runUrlBatch(urls, 'txt', 'txt');

  console.log('e2e-batch-live-corpus passed');
}

await main();
