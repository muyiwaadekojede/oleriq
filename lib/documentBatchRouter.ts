import type { ExportFormat, ImageMode } from '@/lib/types';

export type DocumentFileFamily = 'pdf' | 'structured_text' | 'unknown';
export type DocumentProcessingLane = 'fast_text' | 'deep_layout' | 'ocr_layout' | 'structured_text';

export type DocumentFingerprint = {
  fileFamily: DocumentFileFamily;
  outputFormat: ExportFormat;
  imagesMode: ImageMode;
  pageCount: number;
  sampledPages: number;
  scannedLikelihood: number;
  imageDominance: number;
  tableLikelihood: number;
  headingLikelihood: number;
  textDensity: number;
  mixedPageSignals: Array<{
    pageNumber: number;
    scannedLikelihood: number;
    tableLikelihood: number;
    textDensity: number;
  }>;
};

export type DocumentLaneDecision = {
  lane: DocumentProcessingLane;
  escalated: boolean;
  confidenceScore: number;
  reasons: string[];
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function chooseDocumentProcessingLane(fingerprint: DocumentFingerprint): DocumentLaneDecision {
  if (fingerprint.fileFamily === 'structured_text') {
    return {
      lane: 'structured_text',
      escalated: false,
      confidenceScore: 0.94,
      reasons: ['structured-source'],
    };
  }

  const scannedLikelihood = clamp01(fingerprint.scannedLikelihood);
  const imageDominance = clamp01(fingerprint.imageDominance);
  const tableLikelihood = clamp01(fingerprint.tableLikelihood);
  const headingLikelihood = clamp01(fingerprint.headingLikelihood);
  const textDensity = clamp01(fingerprint.textDensity);
  const wantsImages = fingerprint.imagesMode !== 'off';
  const fastTextEligible = fingerprint.outputFormat !== 'docx' && fingerprint.outputFormat !== 'pdf' && !wantsImages;

  if (scannedLikelihood >= 0.75 || (imageDominance >= 0.8 && textDensity <= 0.2)) {
    return {
      lane: 'ocr_layout',
      escalated: true,
      confidenceScore: Math.max(scannedLikelihood, imageDominance),
      reasons: ['scan-heavy'],
    };
  }

  if (!fastTextEligible) {
    return {
      lane: 'deep_layout',
      escalated: true,
      confidenceScore: 0.82,
      reasons: ['rich-output-or-images-required'],
    };
  }

  const headingRisk = headingLikelihood <= 0.2 && textDensity <= 0.7;
  const sparseTextLayoutRisk =
    textDensity <= 0.2 && (imageDominance >= 0.25 || headingLikelihood <= 0.35 || scannedLikelihood >= 0.35);
  const mixedDensityLayoutRisk = textDensity <= 0.45 && imageDominance >= 0.45;

  if (tableLikelihood >= 0.7 || headingRisk || sparseTextLayoutRisk || mixedDensityLayoutRisk) {
    return {
      lane: 'deep_layout',
      escalated: true,
      confidenceScore: Math.max(0.55, tableLikelihood, 1 - textDensity),
      reasons: ['layout-risk'],
    };
  }

  return {
    lane: 'fast_text',
    escalated: false,
    confidenceScore: Math.min(0.98, Math.max(0.6, textDensity + headingLikelihood / 4)),
    reasons: ['text-native'],
  };
}

export function summarizeLaneCounts(decisions: Array<Pick<DocumentLaneDecision, 'lane'>>): Record<DocumentProcessingLane, number> {
  const summary: Record<DocumentProcessingLane, number> = {
    fast_text: 0,
    deep_layout: 0,
    ocr_layout: 0,
    structured_text: 0,
  };

  for (const decision of decisions) {
    summary[decision.lane] += 1;
  }

  return summary;
}
