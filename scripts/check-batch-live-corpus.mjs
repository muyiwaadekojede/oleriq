import fs from 'node:fs/promises';
import path from 'node:path';

const corpusRoot = path.join(process.cwd(), 'tests documents', 'live-corpus');
const activePointerPath = path.join(corpusRoot, 'ACTIVE.json');
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

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  let active;
  try {
    active = await readJson(activePointerPath);
  } catch {
    fail(`Missing active batch live corpus pointer: ${activePointerPath}`);
  }

  const manifestRelativePath = String(active.manifestRelativePath || '').trim();
  if (!manifestRelativePath) {
    fail(`Active batch live corpus pointer is missing manifestRelativePath: ${JSON.stringify(active)}`);
  }

  const manifestPath = path.join(corpusRoot, manifestRelativePath);
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch {
    fail(`Missing active batch live corpus manifest: ${manifestPath}`);
  }

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

    const absolutePath = path.join(path.dirname(manifestPath), relativePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat || stat.size === 0) {
      fail(`Batch live corpus fixture is missing or empty: ${absolutePath}`);
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
