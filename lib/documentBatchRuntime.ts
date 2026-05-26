import { shouldUseDurableDocumentBatchState } from '@/lib/durableDocumentBatch';
import { isManagedDocumentBatchEnabled } from '@/lib/documentBatchManagedConfig';

export function shouldWarmLocalDocumentWorkersInWebProcess(): boolean {
  if (shouldUseDurableDocumentBatchState()) {
    return false;
  }

  if (isManagedDocumentBatchEnabled()) {
    return false;
  }

  return true;
}
