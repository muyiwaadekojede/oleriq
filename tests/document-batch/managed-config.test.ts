import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveManagedDocumentBatchConfig,
  isManagedDocumentBatchEnabled,
} from '@/lib/documentBatchManagedConfig';

test('managed document batch stays disabled when required infrastructure env vars are missing', () => {
  const originalEnv = { ...process.env };
  try {
    delete process.env.OLERIQ_DOCUMENT_BATCH_POSTGRES_URL;
    delete process.env.OLERIQ_DOCUMENT_BATCH_REDIS_URL;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.OLERIQ_DOCUMENT_INTELLIGENCE_KEY;

    const config = resolveManagedDocumentBatchConfig();

    assert.equal(config.enabled, false);
    assert.equal(isManagedDocumentBatchEnabled(), false);
    assert.deepEqual(config.missingRequirements.sort(), [
      'OLERIQ_DOCUMENT_BATCH_POSTGRES_URL',
      'OLERIQ_DOCUMENT_BATCH_REDIS_URL',
      'OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT',
      'OLERIQ_DOCUMENT_INTELLIGENCE_KEY',
    ]);
  } finally {
    process.env = originalEnv;
  }
});

test('managed document batch enables only when all required env vars are present', () => {
  const originalEnv = { ...process.env };
  try {
    process.env.OLERIQ_DOCUMENT_BATCH_POSTGRES_URL = 'postgres://example';
    process.env.OLERIQ_DOCUMENT_BATCH_REDIS_URL = 'redis://example';
    process.env.OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://example.cognitiveservices.azure.com';
    process.env.OLERIQ_DOCUMENT_INTELLIGENCE_KEY = 'secret';

    const config = resolveManagedDocumentBatchConfig();

    assert.equal(config.enabled, true);
    assert.equal(isManagedDocumentBatchEnabled(), true);
    assert.equal(config.postgresUrl, 'postgres://example');
    assert.equal(config.redisUrl, 'redis://example');
    assert.equal(config.documentIntelligence.endpoint, 'https://example.cognitiveservices.azure.com');
    assert.equal(config.documentIntelligence.key, 'secret');
    assert.deepEqual(config.missingRequirements, []);
  } finally {
    process.env = originalEnv;
  }
});
