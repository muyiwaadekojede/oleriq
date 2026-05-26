import assert from 'node:assert/strict';
import test from 'node:test';

import { newDb } from 'pg-mem';

import { ensureManagedDocumentBatchSchema } from '@/lib/documentBatchManaged';

test('ensureManagedDocumentBatchSchema creates the managed document batch tables', async () => {
  const db = newDb();
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();

  try {
    await ensureManagedDocumentBatchSchema({
      query: async (text: string, params?: unknown[]) => {
        const result = await client.query(text, params as any[]);
        return { rows: result.rows as Record<string, unknown>[] };
      },
    });

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'managed_document_batch_%'
      ORDER BY table_name
    `);

    assert.deepEqual(
      result.rows.map((row: { table_name: string }) => row.table_name),
      [
        'managed_document_batch_attempts',
        'managed_document_batch_items',
        'managed_document_batch_jobs',
        'managed_document_batch_phase_metrics',
        'managed_document_batch_worker_heartbeats',
      ],
    );
  } finally {
    await client.end();
  }
});
