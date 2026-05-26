import type { NextApiRequest, NextApiResponse } from 'next';

import { primeDocumentBatchWorkers } from '@/lib/batchQueue';
import { completeBlobUploadedFile, registerCompletedUpload } from '@/lib/batchStorage';
import { persistDurableUploadRecord } from '@/lib/durableDocumentBatch';
import { LEGACY_SESSION_HEADER, SESSION_HEADER, readHeaderValue } from '@/lib/internalIdentifiers';

function sessionFromHeader(req: NextApiRequest): string | null {
  const header = readHeaderValue(req.headers, SESSION_HEADER, LEGACY_SESSION_HEADER);
  if (header) return header.slice(0, 128);
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  primeDocumentBatchWorkers();

  const sessionId = sessionFromHeader(req);
  const body = req.body as
    | {
        mode?: 'blob';
        pathname?: string;
        filename?: string;
      }
    | {
        mode?: 'filesystem';
        objectKey?: string;
        objectUrl?: string | null;
        downloadUrl?: string | null;
        filename?: string;
        contentType?: string;
        byteSize?: number;
      };

  try {
    if (body?.mode === 'blob') {
      const pathname = String(body.pathname || '').trim();
      const filename = String(body.filename || '').trim();
      if (!pathname || !filename) {
        return res.status(400).json({ success: false, error: 'Missing blob upload metadata.' });
      }

      const stored = await completeBlobUploadedFile({
        sessionId,
        pathname,
        filename,
      });

      const upload = registerCompletedUpload({
        sessionId,
        objectKey: stored.objectKey,
        objectUrl: stored.objectUrl,
        downloadUrl: stored.downloadUrl,
        originalFilename: stored.originalFilename,
        contentType: stored.contentType,
        byteSize: stored.byteSize,
      });
      await persistDurableUploadRecord({
        uploadId: upload.uploadId,
        sessionId,
        objectKey: stored.objectKey,
        objectUrl: stored.objectUrl,
        downloadUrl: stored.downloadUrl,
        originalFilename: stored.originalFilename,
        contentType: stored.contentType,
        byteSize: stored.byteSize,
        createdAt: stored.createdAt,
      });

      return res.status(200).json({ success: true, file: upload });
    }

    const localBody = body as {
      objectKey?: string;
      objectUrl?: string | null;
      downloadUrl?: string | null;
      filename?: string;
      contentType?: string;
      byteSize?: number;
    };
    const objectKey = String(localBody.objectKey || '').trim();
    const filename = String(localBody.filename || '').trim();
    const contentType = String(localBody.contentType || 'application/octet-stream').trim() || 'application/octet-stream';
    const byteSize = Number(localBody.byteSize || 0);

    if (!objectKey || !filename || !Number.isFinite(byteSize) || byteSize <= 0) {
      return res.status(400).json({ success: false, error: 'Missing local upload metadata.' });
    }

    const upload = registerCompletedUpload({
      sessionId,
      objectKey,
      objectUrl: typeof localBody.objectUrl === 'string' ? localBody.objectUrl : null,
      downloadUrl: typeof localBody.downloadUrl === 'string' ? localBody.downloadUrl : null,
      originalFilename: filename,
      contentType,
      byteSize,
    });
    await persistDurableUploadRecord({
      uploadId: upload.uploadId,
      sessionId,
      objectKey,
      objectUrl: typeof localBody.objectUrl === 'string' ? localBody.objectUrl : null,
      downloadUrl: typeof localBody.downloadUrl === 'string' ? localBody.downloadUrl : null,
      originalFilename: filename,
      contentType,
      byteSize,
      createdAt: upload.createdAt,
    });

    return res.status(200).json({ success: true, file: upload });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete upload.',
    });
  }
}
