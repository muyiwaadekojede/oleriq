export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { shouldWarmLocalDocumentWorkersInWebProcess } = await import('@/lib/documentBatchRuntime');
  if (!shouldWarmLocalDocumentWorkersInWebProcess()) {
    return;
  }

  const { prepareDocumentBatchWorkers } = await import('@/lib/batchQueue');
  await prepareDocumentBatchWorkers();
}
