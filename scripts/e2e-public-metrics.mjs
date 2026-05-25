import fs from 'node:fs/promises';
import path from 'node:path';

import Database from 'better-sqlite3';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const articleFixtureUrl = `${baseUrl}/test-fixtures/article-source.html`;
const directPdfUrl = `${baseUrl}/test-fixtures/direct-source.pdf`;
const directFallbackUrl = `${baseUrl}/test-fixtures/fallback-sample.doc`;
const batchSurfaceSelector = '[data-batch-surface="primary"]';
const publicProofMetricKey = 'files_converted';
const settings = {
  fontFace: 'serif',
  fontSize: 16,
  lineSpacing: 1.6,
  colorTheme: 'light',
};
const testSessions = {
  homepageExport: 'e2e-public-proof-homepage-export',
  directConverted: 'e2e-public-proof-direct-converted',
  directFallback: 'e2e-public-proof-direct-fallback',
  directPassthrough: 'e2e-public-proof-direct-passthrough',
  batchDocument: 'e2e-public-proof-batch-document',
};

function resolveDataDir() {
  const custom = process.env.OLERIQ_DATA_DIR?.trim() || process.env.CLEARPAGE_DATA_DIR?.trim();
  if (custom) return custom;
  if (process.env.VERCEL) return path.join('/tmp', 'oleriq-data');
  return path.join(process.cwd(), 'data');
}

function openDb() {
  return new Database(path.join(resolveDataDir(), 'oleriq.db'));
}

function hasTable(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .get(tableName);
  return Boolean(row);
}

function requireTable(db, tableName) {
  if (!hasTable(db, tableName)) {
    throw new Error(`Expected SQLite table ${tableName} to exist.`);
  }
}

function cleanupTestRows(db) {
  if (!hasTable(db, 'public_conversion_events')) return;

  const deleteRows = db.prepare('DELETE FROM public_conversion_events WHERE session_id = ?');
  const tx = db.transaction(() => {
    for (const sessionId of Object.values(testSessions)) {
      deleteRows.run(sessionId);
    }
  });
  tx();
}

function deleteProofSnapshot(db) {
  if (!hasTable(db, 'public_proof_snapshots')) return;
  db.prepare('DELETE FROM public_proof_snapshots WHERE metric_key = ?').run(publicProofMetricKey);
}

function totalConvertedCount(db) {
  requireTable(db, 'public_conversion_events');
  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM public_conversion_events
      WHERE conversion_kind = 'converted'
      `,
    )
    .get();
  return Number(row?.count || 0);
}

function rowsForSession(db, sessionId) {
  requireTable(db, 'public_conversion_events');
  return db
    .prepare(
      `
      SELECT
        session_id AS sessionId,
        source_surface AS sourceSurface,
        conversion_kind AS conversionKind,
        export_format AS exportFormat
      FROM public_conversion_events
      WHERE session_id = ?
      ORDER BY id ASC
      `,
    )
    .all(sessionId);
}

function ageProofSnapshot(db, publishedAtIso, nextRefreshAtIso) {
  requireTable(db, 'public_proof_snapshots');
  db.prepare(
    `
    UPDATE public_proof_snapshots
    SET published_at = ?, next_refresh_at = ?
    WHERE metric_key = ?
    `,
  ).run(publishedAtIso, nextRefreshAtIso, publicProofMetricKey);
}

async function fetchPublicMetrics() {
  const response = await fetch(`${baseUrl}/api/public-metrics`);
  if (!response.ok) {
    throw new Error(`Public metrics endpoint failed: ${response.status}`);
  }

  const json = await response.json();
  if (!json.success || !json.metrics) {
    throw new Error(`Public metrics payload invalid: ${JSON.stringify(json)}`);
  }

  return json;
}

function assertPublicMetricsShape(metrics) {
  const requiredNumeric = [
    'totalUsers',
    'usersToday',
    'usersLast7Days',
    'pagesParsedTotal',
    'pagesParsedLast7Days',
    'docsExportedTotal',
    'docsExportedLast7Days',
    'totalTrackedSessions',
    'excludedBotSessions',
    'excludedLowQualitySessions',
  ];

  for (const key of requiredNumeric) {
    if (typeof metrics[key] !== 'number') {
      throw new Error(`Public metrics field ${key} is not numeric.`);
    }
  }

  if (typeof metrics.updatedAt !== 'string' || !metrics.updatedAt) {
    throw new Error('Public metrics updatedAt is missing.');
  }
}

function assertPublicProofShape(publicProof) {
  if (!publicProof || typeof publicProof !== 'object') {
    throw new Error('Public metrics payload missing publicProof.');
  }

  if (publicProof.primaryMetric !== publicProofMetricKey) {
    throw new Error(`Expected publicProof.primaryMetric=${publicProofMetricKey}, got ${publicProof.primaryMetric}`);
  }

  if (typeof publicProof.value !== 'number') {
    throw new Error('Public proof value is not numeric.');
  }

  if (typeof publicProof.label !== 'string' || !publicProof.label.includes('files converted')) {
    throw new Error(`Public proof label is invalid: ${publicProof.label}`);
  }

  if (typeof publicProof.publishedAt !== 'string' || !publicProof.publishedAt) {
    throw new Error('Public proof publishedAt is missing.');
  }

  if (typeof publicProof.nextRefreshAt !== 'string' || !publicProof.nextRefreshAt) {
    throw new Error('Public proof nextRefreshAt is missing.');
  }
}

async function runHomepageExportConversion() {
  const content = await fs.readFile(path.join(process.cwd(), 'public', 'test-fixtures', 'article-source.html'), 'utf8');
  const response = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': testSessions.homepageExport,
    },
    body: JSON.stringify({
      format: 'md',
      content,
      textContent: 'Fixture article body for public proof conversion counting.',
      title: 'Public Proof Export Fixture',
      byline: 'Oleriq',
      siteName: 'Oleriq',
      publishedTime: '2026-05-25T00:00:00.000Z',
      sourceUrl: articleFixtureUrl,
      settings,
    }),
  });

  if (!response.ok) {
    throw new Error(`Homepage export conversion failed: ${response.status} ${await response.text()}`);
  }
}

async function runDirectFileConverted() {
  const response = await fetch(`${baseUrl}/api/direct-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: articleFixtureUrl,
      format: 'md',
      sessionId: testSessions.directConverted,
    }),
  });

  if (!response.ok) {
    throw new Error(`Direct-file converted test failed: ${response.status} ${await response.text()}`);
  }
}

async function runDirectFileFallback() {
  const response = await fetch(`${baseUrl}/api/direct-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: directFallbackUrl,
      format: 'md',
      sessionId: testSessions.directFallback,
    }),
  });

  if (!response.ok) {
    throw new Error(`Direct-file fallback test failed: ${response.status} ${await response.text()}`);
  }

  const fallbackHeader = response.headers.get('x-oleriq-fallback-format') || '';
  if (fallbackHeader !== 'original') {
    throw new Error(`Expected x-oleriq-fallback-format=original, got ${fallbackHeader || '(missing)'}`);
  }
}

async function runDirectFilePassthrough() {
  const response = await fetch(`${baseUrl}/api/direct-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: directPdfUrl,
      format: 'pdf',
      sessionId: testSessions.directPassthrough,
    }),
  });

  if (!response.ok) {
    throw new Error(`Direct-file PDF passthrough test failed: ${response.status} ${await response.text()}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Expected passthrough PDF response to stream.');
  }

  const firstChunk = await reader.read();
  await reader.cancel();
  if (firstChunk.done || !firstChunk.value || firstChunk.value.byteLength <= 0) {
    throw new Error('Direct-file PDF passthrough returned no readable bytes.');
  }
}

async function runBatchDocumentConversion() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const tempDir = path.join(process.cwd(), '.tmp-e2e-public-metrics');
  const tempFile = path.join(tempDir, 'public-proof-batch-note.txt');

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(tempFile, 'Oleriq public proof batch test.\n\nThis file should convert successfully.');

  try {
    await page.addInitScript((sessionId) => {
      window.localStorage.setItem('oleriq_session_id', sessionId);
    }, testSessions.batchDocument);

    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Documents' }).click();
    await page.locator('input[type="file"][multiple]').first().setInputFiles(tempFile);
    await page.getByText('public-proof-batch-note.txt', { exact: true }).waitFor({ timeout: 60_000 });
    await page.locator('select').first().selectOption('md');
    await page.getByRole('button', { name: 'Start Batch' }).click();
    await page.locator(`${batchSurfaceSelector}[data-batch-stage="review"]`).waitFor({ timeout: 180_000 });
    await page.locator('[data-batch-review-summary]').getByText('1 usable', { exact: true }).waitFor({
      timeout: 180_000,
    });
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

function assertSessionKinds(db) {
  const homepageRows = rowsForSession(db, testSessions.homepageExport);
  const directConvertedRows = rowsForSession(db, testSessions.directConverted);
  const directFallbackRows = rowsForSession(db, testSessions.directFallback);
  const directPassthroughRows = rowsForSession(db, testSessions.directPassthrough);
  const batchRows = rowsForSession(db, testSessions.batchDocument);

  if (homepageRows.length !== 1 || homepageRows[0].conversionKind !== 'converted') {
    throw new Error(`Expected one converted homepage proof event, got: ${JSON.stringify(homepageRows)}`);
  }

  if (directConvertedRows.length !== 1 || directConvertedRows[0].conversionKind !== 'converted') {
    throw new Error(`Expected one converted direct-file proof event, got: ${JSON.stringify(directConvertedRows)}`);
  }

  if (directFallbackRows.length !== 1 || directFallbackRows[0].conversionKind !== 'original_fallback') {
    throw new Error(`Expected one original_fallback proof event, got: ${JSON.stringify(directFallbackRows)}`);
  }

  if (directPassthroughRows.length !== 1 || directPassthroughRows[0].conversionKind !== 'passthrough') {
    throw new Error(`Expected one passthrough proof event, got: ${JSON.stringify(directPassthroughRows)}`);
  }

  if (batchRows.length !== 1 || batchRows[0].conversionKind !== 'converted') {
    throw new Error(`Expected one converted batch-document proof event, got: ${JSON.stringify(batchRows)}`);
  }
}

function assertPublishedWindow(firstProof, secondProof) {
  if (secondProof.value !== firstProof.value) {
    throw new Error(
      `Expected fresh weekly snapshot to stay frozen. First=${firstProof.value}, second=${secondProof.value}`,
    );
  }

  if (secondProof.publishedAt !== firstProof.publishedAt) {
    throw new Error('Expected publishedAt to stay unchanged inside the 7-day snapshot window.');
  }

  if (secondProof.nextRefreshAt !== firstProof.nextRefreshAt) {
    throw new Error('Expected nextRefreshAt to stay unchanged inside the 7-day snapshot window.');
  }
}

function assertRefreshedProof(refreshedProof, previousProof, expectedValue) {
  if (refreshedProof.value !== expectedValue) {
    throw new Error(`Expected refreshed proof value ${expectedValue}, got ${refreshedProof.value}`);
  }

  if (refreshedProof.publishedAt === previousProof.publishedAt) {
    throw new Error('Expected stale proof snapshot to republish with a new publishedAt.');
  }

  if (Date.parse(refreshedProof.nextRefreshAt) <= Date.parse(refreshedProof.publishedAt)) {
    throw new Error(
      `Expected nextRefreshAt to be after publishedAt, got ${refreshedProof.publishedAt} -> ${refreshedProof.nextRefreshAt}`,
    );
  }
}

async function main() {
  const initial = await fetchPublicMetrics();
  assertPublicMetricsShape(initial.metrics);
  assertPublicProofShape(initial.publicProof);

  const db = openDb();

  try {
    cleanupTestRows(db);
    deleteProofSnapshot(db);

    requireTable(db, 'public_conversion_events');
    requireTable(db, 'public_proof_snapshots');

    const baselineConverted = totalConvertedCount(db);

    const baselinePayload = await fetchPublicMetrics();
    assertPublicMetricsShape(baselinePayload.metrics);
    assertPublicProofShape(baselinePayload.publicProof);

    if (baselinePayload.publicProof.value !== baselineConverted) {
      throw new Error(
        `Expected baseline public proof value ${baselineConverted}, got ${baselinePayload.publicProof.value}`,
      );
    }

    await runHomepageExportConversion();
    await runDirectFileConverted();
    await runDirectFileFallback();
    await runDirectFilePassthrough();
    await runBatchDocumentConversion();

    assertSessionKinds(db);

    const frozenPayload = await fetchPublicMetrics();
    assertPublicProofShape(frozenPayload.publicProof);
    assertPublishedWindow(baselinePayload.publicProof, frozenPayload.publicProof);

    const agedPublishedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const agedNextRefreshAt = new Date(Date.now() - 60 * 1000).toISOString();
    ageProofSnapshot(db, agedPublishedAt, agedNextRefreshAt);

    const refreshedPayload = await fetchPublicMetrics();
    assertPublicProofShape(refreshedPayload.publicProof);
    assertRefreshedProof(refreshedPayload.publicProof, frozenPayload.publicProof, baselineConverted + 3);
  } finally {
    db.close();
  }

  console.log('e2e-public-metrics passed');
}

await main();
