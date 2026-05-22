import { ensureActiveBatchLiveCorpusMaterialized } from './batch-live-corpus.mjs';

const requiredExtensions = [
  '.pdf',
  '.docx',
  '.epub',
  '.txt',
  '.md',
  '.html',
  '.htm',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.rst',
];

function fail(message) {
  throw new Error(message);
}

async function main() {
  const corpus = await ensureActiveBatchLiveCorpusMaterialized();
  const manifestPath = corpus.manifestPath;
  const manifest = {
    documents: corpus.documents,
    urls: corpus.urls,
  };

  if (!Array.isArray(manifest.documents)) {
    fail(`Active batch live corpus manifest is missing documents[]: ${manifestPath}`);
  }

  if (!Array.isArray(manifest.urls) || manifest.urls.length < 3) {
    fail(`Active batch live corpus manifest must contain at least three public URL fixtures: ${manifestPath}`);
  }

  const extensions = new Set();

  for (const documentFixture of manifest.documents) {
    const relativePath = String(documentFixture.relativePath || '').trim();
    const filename = String(documentFixture.filename || '').trim();
    const inputExt = String(documentFixture.inputExt || '').trim();
    if (!relativePath || !filename || !inputExt) {
      fail(`Batch live corpus document entry is incomplete: ${JSON.stringify(documentFixture)}`);
    }

    extensions.add(inputExt.toLowerCase());
  }

  for (const extension of requiredExtensions) {
    if (!extensions.has(extension)) {
      fail(`Active batch live corpus is missing required document format ${extension}: ${manifestPath}`);
    }
  }

  console.log('batch live corpus check passed');
}

await main();
