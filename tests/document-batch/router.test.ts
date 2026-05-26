import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseDocumentProcessingLane, summarizeLaneCounts, type DocumentFingerprint } from '@/lib/documentBatchRouter';

const baseFingerprint: DocumentFingerprint = {
  fileFamily: 'pdf',
  outputFormat: 'md',
  imagesMode: 'off',
  pageCount: 12,
  sampledPages: 3,
  scannedLikelihood: 0.02,
  imageDominance: 0.08,
  tableLikelihood: 0.1,
  headingLikelihood: 0.7,
  textDensity: 0.84,
  mixedPageSignals: [],
};

test('router chooses fast_text lane for text-native markdown PDFs with images off', () => {
  const lane = chooseDocumentProcessingLane(baseFingerprint);
  assert.equal(lane.lane, 'fast_text');
  assert.equal(lane.escalated, false);
});

test('router keeps sparse but text-native markdown PDFs on fast_text lane when scan and layout risk stay low', () => {
  const lane = chooseDocumentProcessingLane({
    ...baseFingerprint,
    pageCount: 24,
    scannedLikelihood: 0,
    imageDominance: 0.1111111111111111,
    tableLikelihood: 0,
    headingLikelihood: 0.8888888888888888,
    textDensity: 0.19111111111111112,
  });
  assert.equal(lane.lane, 'fast_text');
  assert.equal(lane.escalated, false);
});

test('router chooses deep_layout lane for layout-heavy text PDFs', () => {
  const lane = chooseDocumentProcessingLane({
    ...baseFingerprint,
    tableLikelihood: 0.91,
    headingLikelihood: 0.31,
    textDensity: 0.62,
  });
  assert.equal(lane.lane, 'deep_layout');
  assert.equal(lane.escalated, true);
});

test('router chooses ocr_layout lane for scan-heavy PDFs', () => {
  const lane = chooseDocumentProcessingLane({
    ...baseFingerprint,
    scannedLikelihood: 0.95,
    imageDominance: 0.94,
    textDensity: 0.06,
  });
  assert.equal(lane.lane, 'ocr_layout');
  assert.equal(lane.escalated, true);
});

test('router chooses structured_text lane for non-PDF structured files', () => {
  const lane = chooseDocumentProcessingLane({
    ...baseFingerprint,
    fileFamily: 'structured_text',
    outputFormat: 'docx',
  });
  assert.equal(lane.lane, 'structured_text');
});

test('lane summary counts each lane correctly', () => {
  assert.deepEqual(
    summarizeLaneCounts([
      { lane: 'fast_text' },
      { lane: 'fast_text' },
      { lane: 'deep_layout' },
      { lane: 'ocr_layout' },
      { lane: 'structured_text' },
    ]),
    {
      fast_text: 2,
      deep_layout: 1,
      ocr_layout: 1,
      structured_text: 1,
    },
  );
});
