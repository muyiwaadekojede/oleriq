export type ImageMode = 'on' | 'off' | 'captions';
export type ExportFormat = 'pdf' | 'txt' | 'md' | 'docx';
export type BatchInputMode = 'url' | 'document';
export type ExtractResultState = 'usable' | 'partial' | 'degraded';
export type ExtractionPath =
  | 'readability'
  | 'browser_fallback'
  | 'authenticated_session'
  | 'rsc_fallback'
  | 'syndication_fallback';
export type PageComplexitySignal = 'standard' | 'dynamic_page_likely' | 'unknown';
export type BatchDiagnosticReason =
  | 'extract_authenticated_session_used'
  | 'extract_browser_fallback_used'
  | 'extract_rsc_fallback_used'
  | 'extract_rsc_structure_flattened'
  | 'extract_syndication_fallback_used'
  | 'extract_empty_content'
  | 'document_pdf_truncated_pages'
  | 'structure_heading_loss_risk'
  | 'structure_table_loss_risk'
  | 'structure_list_loss_risk'
  | 'structure_code_block_loss_risk'
  | 'document_txt_images_downgraded_to_captions';

export type ExtractErrorCode =
  | 'FETCH_FAILED'
  | 'EXTRACTION_FAILED'
  | 'AUTH_SESSION_INVALID'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_SESSION_DOMAIN_MISMATCH'
  | 'AUTH_SESSION_NOT_FOUND'
  | 'PAYWALL_DETECTED'
  | 'EMPTY_CONTENT'
  | 'TIMEOUT'
  | 'DIRECT_FILE_URL';

export interface ReaderSettings {
  fontFace: 'serif' | 'sans-serif' | 'monospace' | 'dyslexic';
  fontSize: number;
  lineSpacing: number;
  colorTheme: 'light' | 'dark' | 'sepia';
}

export interface ExtractSuccessResponse {
  success: true;
  resultState: ExtractResultState;
  extractionPath: ExtractionPath;
  browserAttempted: boolean;
  pageComplexitySignal: PageComplexitySignal;
  warnings: string[];
  diagnosticReasons: BatchDiagnosticReason[];
  exportDiagnosticReasonsByFormat: Partial<Record<ExportFormat, BatchDiagnosticReason[]>>;
  extractionId?: string;
  title: string;
  byline: string;
  siteName: string;
  publishedTime: string;
  excerpt: string;
  lang: string;
  content: string;
  contentVariants: Record<ImageMode, string>;
  textContent: string;
  wordCount: number;
  imageCount: number;
  sourceUrl: string;
}

export interface ExtractErrorResponse {
  success: false;
  errorCode: ExtractErrorCode;
  errorMessage: string;
  attemptedExtractionPath?: ExtractionPath;
  browserAttempted?: boolean;
  pageComplexitySignal?: PageComplexitySignal;
}

export type ExtractResponse = ExtractSuccessResponse | ExtractErrorResponse;

export interface BatchDocumentUploadInput {
  uploadId: string;
}
