import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DOCUMENT_UPLOAD_CONFIG,
  createDocumentUploadConfigGate,
  type DocumentUploadConfig,
} from '@/lib/documentUploadConfig';

function deferredConfig() {
  let resolve!: (value: DocumentUploadConfig) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<DocumentUploadConfig>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

test('upload config gate waits for the real config before leaving the fallback mode', async () => {
  const deferred = deferredConfig();
  const gate = createDocumentUploadConfigGate(() => deferred.promise);

  assert.equal(gate.isReady(), false);
  assert.equal(gate.getCurrent().mode, DEFAULT_DOCUMENT_UPLOAD_CONFIG.mode);

  let settled = false;
  const pending = gate.ensureReady().then((config) => {
    settled = true;
    return config;
  });

  await Promise.resolve();
  assert.equal(settled, false);

  deferred.resolve({
    ...DEFAULT_DOCUMENT_UPLOAD_CONFIG,
    mode: 'blob',
  });

  const resolved = await pending;
  assert.equal(resolved.mode, 'blob');
  assert.equal(gate.isReady(), true);
  assert.equal(gate.getCurrent().mode, 'blob');
});

test('upload config gate does not silently treat a failed load as ready', async () => {
  const deferred = deferredConfig();
  const gate = createDocumentUploadConfigGate(() => deferred.promise);

  const pending = gate.ensureReady();
  deferred.reject(new Error('config failed'));

  await assert.rejects(pending, /config failed/);
  assert.equal(gate.isReady(), false);
  assert.equal(gate.getCurrent().mode, DEFAULT_DOCUMENT_UPLOAD_CONFIG.mode);
});
