import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldWarmLocalDocumentWorkersInWebProcess } from '@/lib/documentBatchRuntime';

function restoreEnv(snapshot: NodeJS.ProcessEnv): void {
  process.env = snapshot;
}

test('web process warms local document workers when running the local document executor path', () => {
  const originalEnv = { ...process.env };
  try {
    delete process.env.VERCEL;
    delete process.env.OLERIQ_DOCUMENT_BATCH_POSTGRES_URL;
    delete process.env.OLERIQ_DOCUMENT_BATCH_REDIS_URL;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_KEY;

    assert.equal(shouldWarmLocalDocumentWorkersInWebProcess(), true);
  } finally {
    restoreEnv(originalEnv);
  }
});

test('web process skips local document worker warmup on Vercel durable document batches', () => {
  const originalEnv = { ...process.env };
  try {
    process.env.VERCEL = '1';
    delete process.env.OLERIQ_DOCUMENT_BATCH_POSTGRES_URL;
    delete process.env.OLERIQ_DOCUMENT_BATCH_REDIS_URL;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_KEY;

    assert.equal(shouldWarmLocalDocumentWorkersInWebProcess(), false);
  } finally {
    restoreEnv(originalEnv);
  }
});

test('web process skips local document worker warmup when managed document batch infrastructure is enabled', () => {
  const originalEnv = { ...process.env };
  try {
    delete process.env.VERCEL;
    process.env.OLERIQ_DOCUMENT_BATCH_POSTGRES_URL = 'postgres://example';
    process.env.OLERIQ_DOCUMENT_BATCH_REDIS_URL = 'redis://example';
    process.env.OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://example.cognitiveservices.azure.com';
    process.env.OLERIQ_DOCUMENT_INTELLIGENCE_KEY = 'secret';

    assert.equal(shouldWarmLocalDocumentWorkersInWebProcess(), false);
  } finally {
    restoreEnv(originalEnv);
  }
});
