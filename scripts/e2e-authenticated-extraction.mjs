import path from 'node:path';

import Database from 'better-sqlite3';
import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const fixtureUrl = `${baseUrl}/test-fixtures/auth-required`;
const publicArticleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const sessionId = `e2e-auth-${Date.now()}`;

function resolveDataDir() {
  const custom = process.env.OLERIQ_DATA_DIR?.trim() || process.env.CLEARPAGE_DATA_DIR?.trim();
  if (custom) return custom;
  if (process.env.VERCEL) return path.join('/tmp', 'oleriq-data');
  return path.join(process.cwd(), 'data');
}

function openDb() {
  return new Database(path.join(resolveDataDir(), 'oleriq.db'));
}

function authHeader(authSessionId) {
  return authSessionId ? { 'x-oleriq-auth-session': authSessionId } : {};
}

async function parseJson(response) {
  const json = await response.json();
  return json;
}

async function importSession(payloadJson, label = 'Fixture Session') {
  const response = await fetch(`${baseUrl}/api/auth-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
    },
    body: JSON.stringify({
      label,
      payloadJson,
    }),
  });

  const json = await parseJson(response);
  if (!response.ok) {
    throw new Error(`Session import failed: ${response.status} ${JSON.stringify(json)}`);
  }

  if (!json.success || !json.session?.id) {
    throw new Error(`Session import payload invalid: ${JSON.stringify(json)}`);
  }

  return json.session;
}

async function listSessions() {
  const response = await fetch(`${baseUrl}/api/auth-sessions`, {
    headers: {
      'x-oleriq-session': sessionId,
    },
  });
  const json = await parseJson(response);
  if (!response.ok) {
    throw new Error(`Session list failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function deleteSession(authSessionId) {
  const response = await fetch(`${baseUrl}/api/auth-sessions?id=${encodeURIComponent(authSessionId)}`, {
    method: 'DELETE',
    headers: {
      'x-oleriq-session': sessionId,
    },
  });
  const json = await parseJson(response);
  if (!response.ok || !json.success) {
    throw new Error(`Session delete failed: ${response.status} ${JSON.stringify(json)}`);
  }
}

async function extract(url, authSessionId) {
  const response = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
      ...authHeader(authSessionId),
    },
    body: JSON.stringify({
      url,
      images: 'off',
    }),
  });
  return {
    status: response.status,
    json: await parseJson(response),
  };
}

async function exportWithoutExtractionId(url, authSessionId) {
  const response = await fetch(`${baseUrl}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
      ...authHeader(authSessionId),
    },
    body: JSON.stringify({
      format: 'md',
      sourceUrl: url,
      settings: {
        fontFace: 'serif',
        fontSize: 16,
        lineSpacing: 1.6,
        colorTheme: 'light',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Authenticated export failed: ${response.status} ${await response.text()}`);
  }
}

async function createBatch(urls, authSessionId) {
  const response = await fetch(`${baseUrl}/api/batch-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-oleriq-session': sessionId,
      'x-oleriq-batch': '1',
      ...authHeader(authSessionId),
    },
    body: JSON.stringify({
      inputMode: 'url',
      urls,
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

  const json = await parseJson(response);
  if (!response.ok || !json.success || !json.job?.jobId) {
    throw new Error(`Batch create failed: ${response.status} ${JSON.stringify(json)}`);
  }

  return json.job.jobId;
}

async function waitForBatch(jobId) {
  const timeoutAt = Date.now() + 120_000;
  while (Date.now() < timeoutAt) {
    const response = await fetch(
      `${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`,
      {
        headers: {
          'x-oleriq-session': sessionId,
        },
      },
    );
    const json = await parseJson(response);
    if (!response.ok || !json.success) {
      throw new Error(`Batch detail failed: ${response.status} ${JSON.stringify(json)}`);
    }
    if (json.job?.status === 'completed' || json.job?.status === 'failed') {
      return json;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Timed out waiting for authenticated batch job.');
}

function expireSession(authSessionId) {
  const db = openDb();
  try {
    db.prepare("UPDATE authenticated_sessions SET expires_at = ? WHERE id = ?").run(
      new Date(Date.now() - 60_000).toISOString(),
      authSessionId,
    );
  } finally {
    db.close();
  }
}

function buildStorageStatePayload(hostname) {
  return JSON.stringify({
    cookies: [
      {
        name: 'oleriq_fixture_auth',
        value: 'granted',
        domain: hostname,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        expires: -1,
      },
    ],
    origins: [],
  });
}

async function assertUiPlacement() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const hero = page.locator('[data-homepage-hero="primary"]').first();
    await hero.waitFor({ timeout: 30_000 });

    const activeSurface = hero.locator('[data-homepage-active-surface="url"]').first();
    const disclosureButton = hero.getByRole('button', { name: 'Advanced options' });
    const disclosureState = await disclosureButton.getAttribute('aria-expanded');
    if (disclosureState !== 'false') {
      throw new Error(`Expected homepage advanced drawer to be closed by default, got ${disclosureState}`);
    }

    const proof = page.locator('[data-homepage-public-proof]');
    const activeSurfaceBox = await activeSurface.boundingBox();
    const disclosureButtonBox = await disclosureButton.boundingBox();

    if (!activeSurfaceBox || !disclosureButtonBox) {
      throw new Error('Could not measure homepage active surface or advanced drawer placement.');
    }

    const proofCount = await proof.count();
    if (proofCount > 0) {
      const proofBox = await proof.first().boundingBox();
      if (!proofBox) {
        throw new Error('Could not measure homepage public proof placement.');
      }
      if (proofBox.y <= activeSurfaceBox.y + activeSurfaceBox.height) {
        throw new Error('Homepage proof line should render below the active conversion surface.');
      }
      if (disclosureButtonBox.y <= proofBox.y + proofBox.height) {
        throw new Error('Homepage advanced drawer trigger should render below the public proof line.');
      }
    } else if (disclosureButtonBox.y <= activeSurfaceBox.y + activeSurfaceBox.height) {
      throw new Error('Homepage advanced drawer trigger should render below the active conversion surface.');
    }

    await disclosureButton.click();
    await page.getByText('Use authenticated session', { exact: true }).waitFor({ timeout: 30_000 });
    await page.locator('[data-auth-session-manager]').waitFor({ timeout: 30_000 });

    await page.goto(`${baseUrl}/batch`, { waitUntil: 'networkidle' });
    const batchAuthManager = page.locator('[data-batch-auth-session-manager]');
    if (await batchAuthManager.isVisible().catch(() => false)) {
      throw new Error('Batch auth manager should stay hidden until URL-mode More options is opened.');
    }

    await page.getByRole('button', { name: 'More options' }).click();
    await batchAuthManager.waitFor({ state: 'visible', timeout: 30_000 });

    await page.getByRole('button', { name: 'Documents' }).click();
    await page.getByRole('button', { name: 'More options' }).click();
    if (await page.locator('[data-batch-auth-session-manager]').isVisible().catch(() => false)) {
      throw new Error('Batch auth manager must not appear in document mode.');
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  const host = new URL(baseUrl).hostname;

  await assertUiPlacement();

  const unauthenticated = await extract(fixtureUrl, null);
  if (unauthenticated.status !== 400 || unauthenticated.json.errorCode !== 'PAYWALL_DETECTED') {
    throw new Error(`Expected unauthenticated extract to hit PAYWALL_DETECTED, got ${JSON.stringify(unauthenticated)}`);
  }

  const imported = await importSession(buildStorageStatePayload(host), 'Fixture auth');
  const listed = await listSessions();
  if (!listed.success || !Array.isArray(listed.sessions) || listed.sessions.length < 1) {
    throw new Error(`Expected listed sessions after import, got ${JSON.stringify(listed)}`);
  }

  const authenticated = await extract(fixtureUrl, imported.id);
  if (authenticated.status !== 200 || !authenticated.json.success) {
    throw new Error(`Expected authenticated extract success, got ${JSON.stringify(authenticated)}`);
  }

  if (authenticated.json.extractionPath !== 'authenticated_session') {
    throw new Error(`Expected authenticated_session extraction path, got ${authenticated.json.extractionPath}`);
  }

  await exportWithoutExtractionId(fixtureUrl, imported.id);

  const batchJobId = await createBatch([fixtureUrl, publicArticleUrl], imported.id);
  const batchDetail = await waitForBatch(batchJobId);
  if (batchDetail.job.successCount < 2) {
    throw new Error(`Expected authenticated batch job to succeed for both URLs, got ${JSON.stringify(batchDetail.job)}`);
  }

  const mismatched = await importSession(
    JSON.stringify({
      cookies: [
        {
          name: 'oleriq_fixture_auth',
          value: 'granted',
          domain: 'example.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
          expires: -1,
        },
      ],
      origins: [],
    }),
    'Wrong domain',
  );
  const mismatchExtract = await extract(fixtureUrl, mismatched.id);
  if (mismatchExtract.status !== 400 || mismatchExtract.json.errorCode !== 'AUTH_SESSION_DOMAIN_MISMATCH') {
    throw new Error(`Expected AUTH_SESSION_DOMAIN_MISMATCH, got ${JSON.stringify(mismatchExtract)}`);
  }

  expireSession(imported.id);
  const expiredExtract = await extract(fixtureUrl, imported.id);
  if (expiredExtract.status !== 400 || expiredExtract.json.errorCode !== 'AUTH_SESSION_EXPIRED') {
    throw new Error(`Expected AUTH_SESSION_EXPIRED, got ${JSON.stringify(expiredExtract)}`);
  }

  await deleteSession(imported.id);
  await deleteSession(mismatched.id);

  console.log('e2e-authenticated-extraction passed');
}

await main();
