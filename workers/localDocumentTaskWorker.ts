import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import { analyzeDocumentConversion, convertDocumentBuffer, inferFileKind } from '@/lib/documentConversion';
import { readStoredObjectBuffer, storeOutputBuffer } from '@/lib/batchStorage';
import { getPdfJsRuntime } from '@/lib/pdfjsRuntime';
import type { ExportFormat, ImageMode, ReaderSettings } from '@/lib/types';

type WorkerPayload = {
  sourceObjectKey: string;
  originalFilename: string;
  contentType: string;
  exportFormat: ExportFormat;
  imagesMode: ImageMode;
  settings: ReaderSettings;
  sessionId: string | null;
};

type WarmupResult = {
  success: true;
  kind: 'warmup';
};

type WorkerResult =
  | WarmupResult
  | {
      success: true;
      title: string;
      resultState: string;
      warnings: string[];
      diagnosticReasons: string[];
      outputObjectKey: string;
      outputFilename: string;
      outputFormat: ExportFormat;
      processingLane: string;
      confidenceScore: number;
      escalated: boolean;
      pageCount: number | null;
      attemptCount: number;
    }
  | {
      success: false;
      errorCode: string;
      errorMessage: string;
      processingLane: string | null;
      confidenceScore: number | null;
      escalated: boolean;
      pageCount: number | null;
      attemptCount: number;
    };

type WorkerRequest =
  | {
      taskId: string;
      kind: 'warmup';
    }
  | {
      taskId: string;
      kind: 'convert';
      payload: WorkerPayload;
    };

type WorkerResponse = WorkerResult & {
  taskId: string;
};

let warmupPromise: Promise<void> | null = null;

async function execute(payload: WorkerPayload): Promise<WorkerResult> {
  const bytes = await readStoredObjectBuffer(payload.sourceObjectKey);
  const plan = await analyzeDocumentConversion({
    fileKind: inferFileKind({
      contentType: payload.contentType,
      filename: payload.originalFilename,
      bytes,
    }),
    bytes,
    rawFilename: payload.originalFilename,
    targetFormat: payload.exportFormat,
    imagesMode: payload.imagesMode,
  });

  const maxAttempts =
    plan.processingLane === 'deep_layout' || plan.processingLane === 'ocr_layout' ? 2 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const converted = await convertDocumentBuffer({
        bytes,
        rawFilename: payload.originalFilename,
        contentType: payload.contentType,
        format: payload.exportFormat,
        imagesMode: payload.imagesMode,
        sourceLabel: `upload://${payload.originalFilename}`,
        settings: payload.settings,
        plan,
      });

      if (!converted.success) {
        throw new Error('Uploaded file could not be converted to the selected format.');
      }

      const storedOutput = await storeOutputBuffer({
        sessionId: payload.sessionId,
        filename: converted.filename,
        contentType: converted.contentType,
        buffer: converted.buffer,
      });

      return {
        success: true,
        title: converted.title,
        resultState: converted.resultState,
        warnings: converted.warnings,
        diagnosticReasons: converted.diagnosticReasons,
        outputObjectKey: storedOutput.objectKey,
        outputFilename: converted.filename,
        outputFormat: payload.exportFormat,
        processingLane: converted.processingLane || plan.processingLane,
        confidenceScore: converted.confidenceScore ?? plan.confidenceScore,
        escalated: converted.escalated ?? plan.escalated,
        pageCount: converted.pageCount ?? plan.pageCount,
        attemptCount: attempt,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    success: false,
    errorCode: 'DOCUMENT_CONVERSION_FAILED',
    errorMessage: lastError instanceof Error ? lastError.message : 'Unexpected document conversion error.',
    processingLane: plan.processingLane,
    confidenceScore: plan.confidenceScore,
    escalated: plan.escalated,
    pageCount: plan.pageCount,
    attemptCount: maxAttempts,
  };
}

async function warmup(): Promise<void> {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      const samplePdfPath = path.join(process.cwd(), 'public', 'test-fixtures', 'direct-source.pdf');

      try {
        const bytes = await fs.readFile(samplePdfPath);
        const fileKind = inferFileKind({
          contentType: 'application/pdf',
          filename: 'direct-source.pdf',
          bytes,
        });
        const plan = await analyzeDocumentConversion({
          fileKind,
          bytes,
          rawFilename: 'direct-source.pdf',
          targetFormat: 'md',
          imagesMode: 'off',
        });

        await convertDocumentBuffer({
          bytes,
          rawFilename: 'direct-source.pdf',
          contentType: 'application/pdf',
          format: 'md',
          imagesMode: 'off',
          sourceLabel: 'warmup://direct-source.pdf',
          settings: {
            fontFace: 'serif',
            fontSize: 16,
            lineSpacing: 1.6,
            colorTheme: 'light',
          },
          plan,
        });
      } catch {
        await getPdfJsRuntime();
      }
    })();
  }

  await warmupPromise;
}

async function runSinglePayload(raw: string): Promise<void> {
  const payload = JSON.parse(raw) as WorkerPayload;
  const result = await execute(payload);
  process.stdout.write(JSON.stringify(result));
}

async function runServerMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    let request: WorkerRequest | null = null;
    try {
      request = JSON.parse(line) as WorkerRequest;
      const result =
        request.kind === 'warmup'
          ? ({
              success: true,
              kind: 'warmup',
            } satisfies WarmupResult)
          : await execute(request.payload);
      if (request.kind === 'warmup') {
        await warmup();
      }
      const response: WorkerResponse = {
        taskId: request.taskId,
        ...result,
      };
      process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      const response: WorkerResponse = {
        taskId: request?.taskId || 'unknown',
        success: false,
        errorCode: 'DOCUMENT_CONVERSION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unexpected local document worker error.',
        processingLane: null,
        confidenceScore: null,
        escalated: false,
        pageCount: null,
        attemptCount: 1,
      };
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  }
}

if (process.argv[2]) {
  void runSinglePayload(process.argv[2]).catch((error) => {
    process.stdout.write(
      JSON.stringify({
        success: false,
        errorCode: 'DOCUMENT_CONVERSION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unexpected local document worker error.',
        processingLane: null,
        confidenceScore: null,
        escalated: false,
        pageCount: null,
        attemptCount: 1,
      }),
    );
  });
} else {
  void runServerMode();
}
