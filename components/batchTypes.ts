import type { BatchDiagnosticReason, ExtractResultState } from '@/lib/types';

export type BatchSurfaceStage = 'setup' | 'running' | 'review';

export type BatchItemResult = {
  id?: number;
  url: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  qualityState?: ExtractResultState;
  warnings?: string[];
  diagnosticReasons?: BatchDiagnosticReason[];
  durationMs: number;
  extractionId?: string;
  sourceUrl?: string;
  title?: string;
  originalFilename?: string;
  contentType?: string;
  byteSize?: number;
  sourceObjectKey?: string;
  processingLane?: 'fast_text' | 'deep_layout' | 'ocr_layout' | 'structured_text';
  confidenceScore?: number;
  escalated?: boolean;
  pageCount?: number;
  attemptCount?: number;
  outputObjectKey?: string;
  outputFilename?: string;
  outputFormat?: string;
  errorCode?: string;
  errorMessage?: string;
};
