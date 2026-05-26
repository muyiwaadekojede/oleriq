import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildPdfDocumentFingerprint } from '@/lib/pdfDocumentFingerprint';

const fixturePath = path.join(
  process.cwd(),
  'tests documents',
  'RecSysOps - Best Practices for Operating a Large-Scale Recommender System.pdf',
);

test('buildPdfDocumentFingerprint identifies sampled PDF pages and text density', async () => {
  const bytes = fs.readFileSync(fixturePath);
  const fingerprint = await buildPdfDocumentFingerprint({
    bytes,
    outputFormat: 'md',
    imagesMode: 'off',
  });

  assert.equal(fingerprint.fileFamily, 'pdf');
  assert.ok(fingerprint.pageCount >= fingerprint.sampledPages);
  assert.ok(fingerprint.sampledPages >= 1);
  assert.ok(fingerprint.textDensity > 0.2);
  assert.ok(fingerprint.scannedLikelihood < 0.75);
});
