import { Worker, type Processor } from 'bullmq';
import type Redis from 'ioredis';

import {
  MANAGED_DOCUMENT_BATCH_QUEUE_NAMES,
  type ManagedDocumentBatchJobPayload,
} from '@/lib/documentBatchManaged';

export type ManagedDocumentBatchWorkerHandlers = {
  classify: Processor<ManagedDocumentBatchJobPayload>;
  convertFast: Processor<ManagedDocumentBatchJobPayload>;
  convertDeep: Processor<ManagedDocumentBatchJobPayload>;
  assemble: Processor<ManagedDocumentBatchJobPayload>;
  finalize: Processor<ManagedDocumentBatchJobPayload>;
};

export type ManagedDocumentBatchWorkerSet = {
  classify: Worker<ManagedDocumentBatchJobPayload>;
  convertFast: Worker<ManagedDocumentBatchJobPayload>;
  convertDeep: Worker<ManagedDocumentBatchJobPayload>;
  assemble: Worker<ManagedDocumentBatchJobPayload>;
  finalize: Worker<ManagedDocumentBatchJobPayload>;
};

export function startManagedDocumentBatchWorkers(input: {
  connection: Redis;
  handlers: ManagedDocumentBatchWorkerHandlers;
}): ManagedDocumentBatchWorkerSet {
  return {
    classify: new Worker(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.classify, input.handlers.classify, {
      connection: input.connection,
      concurrency: 4,
    }),
    convertFast: new Worker(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.convertFast, input.handlers.convertFast, {
      connection: input.connection,
      concurrency: 8,
    }),
    convertDeep: new Worker(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.convertDeep, input.handlers.convertDeep, {
      connection: input.connection,
      concurrency: 2,
    }),
    assemble: new Worker(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.assemble, input.handlers.assemble, {
      connection: input.connection,
      concurrency: 4,
    }),
    finalize: new Worker(MANAGED_DOCUMENT_BATCH_QUEUE_NAMES.finalize, input.handlers.finalize, {
      connection: input.connection,
      concurrency: 4,
    }),
  };
}

export async function closeManagedDocumentBatchWorkers(workers: ManagedDocumentBatchWorkerSet): Promise<void> {
  await Promise.all([
    workers.classify.close(),
    workers.convertFast.close(),
    workers.convertDeep.close(),
    workers.assemble.close(),
    workers.finalize.close(),
  ]);
}
