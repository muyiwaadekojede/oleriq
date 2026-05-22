import { refreshBatchLiveCorpus } from './batch-live-corpus.mjs';

function parseSnapshotId(argv) {
  for (const value of argv) {
    if (!value.startsWith('--snapshot=')) continue;
    const snapshotId = value.slice('--snapshot='.length).trim();
    if (snapshotId) return snapshotId;
  }

  return null;
}

async function main() {
  const snapshotId = parseSnapshotId(process.argv.slice(2));
  const result = await refreshBatchLiveCorpus({ snapshotId });

  console.log(`batch live corpus refreshed`);
  console.log(`snapshotId=${result.snapshotId}`);
  console.log(`snapshotDir=${result.snapshotDir}`);
  console.log(`manifestPath=${result.manifestPath}`);
  console.log(`documents=${result.manifest.documents.length}`);
  console.log(`urls=${result.manifest.urls.length}`);
}

await main();
