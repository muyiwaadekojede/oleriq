import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildConversionSource, inferFileKind } from '@/lib/documentConversion';

const fixturePath = path.join(
  process.cwd(),
  'tests documents',
  'RecSysOps - Best Practices for Operating a Large-Scale Recommender System.pdf',
);

test('buildConversionSource routes eligible PDF markdown exports through the fast text lane', async () => {
  const bytes = fs.readFileSync(fixturePath);
  const source = await buildConversionSource({
    fileKind: inferFileKind({
      contentType: 'application/pdf',
      filename: path.basename(fixturePath),
      bytes,
    }),
    bytes,
    contentType: 'application/pdf',
    rawFilename: path.basename(fixturePath),
    targetFormat: 'md',
    imagesMode: 'off',
  });

  assert.ok(source);
  assert.ok(source.htmlContent.length > 1000);
  assert.ok(!source.htmlContent.includes('data:image/'));
});
