import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPdfFastTextConversionSource } from '@/lib/pdfFastTextConversion';

const fixturePath = path.join(process.cwd(), 'tests documents', 'RecSysOps - Best Practices for Operating a Large-Scale Recommender System.pdf');

test('fast PDF text conversion builds text-native markdown source without inline image payloads', async () => {
  const bytes = await fs.readFile(fixturePath);
  const source = await buildPdfFastTextConversionSource({
    bytes,
    title: 'RecSysOps',
    maxPages: 40,
  });

  assert.ok(source);
  assert.equal(source?.title, 'RecSysOps');
  assert.ok((source?.textContent.length || 0) > 1000);
  assert.ok((source?.htmlContent.length || 0) > 1000);
  assert.equal(source?.htmlContent.includes('data:image/'), false);
  assert.equal(source?.diagnosticReasons?.includes('document_pdf_truncated_pages') || false, false);
});
