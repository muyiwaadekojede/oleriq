import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const BATCH_LIVE_CORPUS_ROOT = path.join(process.cwd(), 'tests documents', 'live-corpus');
export const BATCH_LIVE_CORPUS_SNAPSHOTS = path.join(BATCH_LIVE_CORPUS_ROOT, 'snapshots');
export const BATCH_LIVE_CORPUS_ACTIVE_POINTER = path.join(BATCH_LIVE_CORPUS_ROOT, 'ACTIVE.json');

export const BATCH_LIVE_DOCUMENT_SOURCES = [
  {
    id: 'pdf',
    inputExt: '.pdf',
    filename: 'handwritten-form-sample.pdf',
    label: 'Azure sample PDF',
    imageCapable: true,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/65af3b93cab5f45c76594f3265210646d4b3809e/ComputerVision/Images/MultiPageHandwrittenForm.pdf',
    contentType: 'application/pdf',
  },
  {
    id: 'docx',
    inputExt: '.docx',
    filename: 'field-trip-sample.docx',
    label: 'docx demo asset',
    imageCapable: true,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/dolanmiu/docx/9439c73871e3ac9af5a5889978b7fbea9f3b6a2f/demo/assets/field-trip.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'epub',
    inputExt: '.epub',
    filename: 'minimal-ebook.epub',
    label: 'minimal EPUB sample',
    imageCapable: true,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/thansen0/sample-epub-minimal/8e7d6cdd91030c991a0e637a3470f286d8735437/minimal.epub',
    contentType: 'application/epub+zip',
  },
  {
    id: 'txt',
    inputExt: '.txt',
    filename: 'rfc9110-reference.txt',
    label: 'RFC 9110 plain text',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://www.rfc-editor.org/rfc/rfc9110.txt',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    id: 'md',
    inputExt: '.md',
    filename: 'typescript-readme.md',
    label: 'TypeScript README',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/microsoft/TypeScript/e5509e211f5df999f54527daefaf47bc7bc1b1eb/README.md',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    id: 'html',
    inputExt: '.html',
    filename: 'mdn-article-element.html',
    label: 'MDN article element page',
    imageCapable: true,
    sourceKind: 'direct',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article',
    contentType: 'text/html; charset=utf-8',
  },
  {
    id: 'htm',
    inputExt: '.htm',
    filename: 'rfc9110-reference.htm',
    label: 'RFC 9110 HTML mirror',
    imageCapable: true,
    sourceKind: 'direct',
    url: 'https://www.rfc-editor.org/rfc/rfc9110.html',
    contentType: 'text/html; charset=utf-8',
  },
  {
    id: 'csv',
    inputExt: '.csv',
    filename: 'countries.csv',
    label: 'CS109 countries CSV',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/cs109/2014_data/6f0562016d4287185bb330c876b0cf117c4a3ab5/countries.csv',
    contentType: 'text/csv; charset=utf-8',
  },
  {
    id: 'tsv',
    inputExt: '.tsv',
    filename: 'sample.tsv',
    label: 'public TSV gist sample',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://gist.githubusercontent.com/cdroulers/1a919d7f9ce701a716b0/raw/77dbd5e7e3db7017ae64e3f420e53f7e8b90aca1/Sample.tsv',
    contentType: 'text/tab-separated-values; charset=utf-8',
  },
  {
    id: 'json',
    inputExt: '.json',
    filename: 'typicode-demo-db.json',
    label: 'Typicode demo JSON',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/typicode/demo/f0b44972443d306e32eed093910687d26cd9f3f1/db.json',
    contentType: 'application/json',
  },
  {
    id: 'xml',
    inputExt: '.xml',
    filename: 'apache-maven-pom.xml',
    label: 'Apache Maven pom.xml',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/apache/maven/da5bf8b5fef41d8613bfdfd9a847c721c306716f/pom.xml',
    contentType: 'application/xml',
  },
  {
    id: 'yaml',
    inputExt: '.yaml',
    filename: 'kubernetes-shell-demo.yaml',
    label: 'Kubernetes YAML example',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/kubernetes/website/58c31560177dc09e3a67eb62e664b65bb1fb4e59/content/en/examples/application/shell-demo.yaml',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    id: 'yml',
    inputExt: '.yml',
    filename: 'github-actions-nodejs.yml',
    label: 'GitHub Actions starter workflow',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/actions/starter-workflows/53d347c66d8b0618d2e4616e1b841b649349c6d7/ci/node.js.yml',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    id: 'log',
    inputExt: '.log',
    filename: 'apache-2k.log',
    label: 'LogHub Apache log sample',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/logpai/loghub/dd61d0952749ee7963bde24220d1be5ede023033/Apache/Apache_2k.log',
    contentType: 'text/plain; charset=utf-8',
  },
  {
    id: 'rst',
    inputExt: '.rst',
    filename: 'sqlobject-readme.rst',
    label: 'SQLObject README.rst',
    imageCapable: false,
    sourceKind: 'direct',
    url: 'https://raw.githubusercontent.com/sqlobject/sqlobject/847875ade0f1af75c95ed9f9f3546a49b23204cd/README.rst',
    contentType: 'text/plain; charset=utf-8',
  },
];

export const BATCH_LIVE_URL_SOURCES = [
  {
    id: 'rfc9110-html',
    label: 'RFC 9110 HTTP Semantics',
    url: 'https://www.rfc-editor.org/rfc/rfc9110.html',
  },
  {
    id: 'mdn-article-element',
    label: 'MDN HTML article element',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article',
  },
  {
    id: 'iana-example-domains',
    label: 'IANA example domains explainer',
    url: 'https://www.iana.org/help/example-domains',
  },
];

function fail(message) {
  throw new Error(message);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function sanitizeSnapshotId(input) {
  return input.replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function defaultSnapshotId() {
  const iso = new Date().toISOString().replace(/[:.]/g, '-');
  return `external-${iso}`;
}

async function downloadBytes(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    fail(`Corpus download failed: ${response.status} ${url}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  return {
    contentType,
    buffer: Buffer.from(arrayBuffer),
  };
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function statOrNull(filePath) {
  return fs.stat(filePath).catch(() => null);
}

async function resolveDirectDocument(source) {
  const bytes = await downloadBytes(source.url);
  return {
    sourceUrl: source.url,
    contentType: source.contentType || bytes.contentType,
    buffer: bytes.buffer,
  };
}

async function materializeDocumentSnapshot(source, documentsDir) {
  const resolved = await resolveDirectDocument(source);

  if (resolved.buffer.length === 0) {
    fail(`Downloaded live corpus fixture is empty: ${source.filename}`);
  }

  const absolutePath = path.join(documentsDir, source.filename);
  await fs.writeFile(absolutePath, resolved.buffer);

  return {
    id: source.id,
    label: source.label,
    filename: source.filename,
    inputExt: source.inputExt,
    imageCapable: source.imageCapable,
    sourceKind: source.sourceKind,
    sourceUrl: resolved.sourceUrl,
    contentType: resolved.contentType,
    relativePath: path.relative(path.dirname(path.join(documentsDir, '..', 'manifest.json')), absolutePath).replace(/\\/g, '/'),
    byteSize: resolved.buffer.length,
    sha256: sha256(resolved.buffer),
  };
}

async function verifyUrlSource(source) {
  const response = await fetch(source.url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    fail(`URL corpus verification failed: ${response.status} ${source.url}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) {
    fail(`URL corpus fixture is not an HTML page: ${source.url} (${contentType || 'unknown content-type'})`);
  }

  const body = await response.text();
  if (!body.trim()) {
    fail(`URL corpus fixture returned an empty HTML body: ${source.url}`);
  }

  return {
    id: source.id,
    label: source.label,
    url: source.url,
    contentType,
    verificationMethod: 'clearpage-html-fetch-signature',
    verifiedAt: new Date().toISOString(),
  };
}

export async function refreshBatchLiveCorpus(options = {}) {
  const snapshotId = sanitizeSnapshotId(options.snapshotId || defaultSnapshotId());
  const snapshotDir = path.join(BATCH_LIVE_CORPUS_SNAPSHOTS, snapshotId);
  const documentsDir = path.join(snapshotDir, 'documents');
  await ensureDir(documentsDir);

  const documents = [];
  for (const source of BATCH_LIVE_DOCUMENT_SOURCES) {
    documents.push(await materializeDocumentSnapshot(source, documentsDir));
  }

  const urls = [];
  for (const source of BATCH_LIVE_URL_SOURCES) {
    urls.push(await verifyUrlSource(source));
  }

  const manifest = {
    version: 1,
    snapshotId,
    generatedAt: new Date().toISOString(),
    documents,
    urls,
  };

  const manifestPath = path.join(snapshotDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await fs.writeFile(
    BATCH_LIVE_CORPUS_ACTIVE_POINTER,
    JSON.stringify(
      {
        snapshotId,
        manifestRelativePath: path.relative(BATCH_LIVE_CORPUS_ROOT, manifestPath).replace(/\\/g, '/'),
        activatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return {
    snapshotId,
    snapshotDir,
    manifestPath,
    manifest,
  };
}

async function ensureDocumentFixtureMaterialized(documentFixture, manifestPath) {
  const absolutePath = path.join(path.dirname(manifestPath), String(documentFixture.relativePath));
  const sourceUrl = String(documentFixture.sourceUrl || '').trim();
  const expectedSha = String(documentFixture.sha256 || '').trim().toLowerCase();
  const expectedByteSize = Number(documentFixture.byteSize);

  const existingStat = await statOrNull(absolutePath);
  if (existingStat?.isFile() && existingStat.size > 0) {
    const existingBytes = await fs.readFile(absolutePath);
    const existingSha = sha256(existingBytes).toLowerCase();
    if (
      (!Number.isFinite(expectedByteSize) || existingBytes.length === expectedByteSize) &&
      (!expectedSha || existingSha === expectedSha)
    ) {
      return absolutePath;
    }
  }

  if (!sourceUrl) {
    fail(`Batch live corpus fixture is missing sourceUrl and cannot be re-materialized: ${JSON.stringify(documentFixture)}`);
  }

  await ensureDir(path.dirname(absolutePath));
  const downloaded = await downloadBytes(sourceUrl);
  const downloadedSha = sha256(downloaded.buffer).toLowerCase();

  if (Number.isFinite(expectedByteSize) && downloaded.buffer.length !== expectedByteSize) {
    fail(
      `Batch live corpus fixture byte size drifted for ${sourceUrl}: expected ${expectedByteSize}, got ${downloaded.buffer.length}`,
    );
  }

  if (expectedSha && downloadedSha !== expectedSha) {
    fail(`Batch live corpus fixture hash drifted for ${sourceUrl}: expected ${expectedSha}, got ${downloadedSha}`);
  }

  await fs.writeFile(absolutePath, downloaded.buffer);
  return absolutePath;
}

export async function ensureActiveBatchLiveCorpusMaterialized() {
  const active = await readJsonFile(BATCH_LIVE_CORPUS_ACTIVE_POINTER).catch(() => null);
  if (!active || typeof active !== 'object') {
    fail(`Missing active batch live corpus pointer: ${BATCH_LIVE_CORPUS_ACTIVE_POINTER}`);
  }

  const manifestRelativePath = String(active.manifestRelativePath || '').trim();
  if (!manifestRelativePath) {
    fail(`Active batch live corpus pointer is missing manifestRelativePath: ${JSON.stringify(active)}`);
  }

  const manifestPath = path.join(BATCH_LIVE_CORPUS_ROOT, manifestRelativePath);
  const manifest = await readJsonFile(manifestPath).catch(() => null);
  if (!manifest || typeof manifest !== 'object') {
    fail(`Missing active batch live corpus manifest: ${manifestPath}`);
  }

  const documents = Array.isArray(manifest.documents)
    ? await Promise.all(
        manifest.documents.map(async (documentFixture) => {
          const localPath = await ensureDocumentFixtureMaterialized(documentFixture, manifestPath);
          return {
            ...documentFixture,
            localPath,
            contentType: String(documentFixture.contentType || ''),
            inputExt: String(documentFixture.inputExt || ''),
            imageCapable: Boolean(documentFixture.imageCapable),
          };
        }),
      )
    : [];
  const urls = Array.isArray(manifest.urls) ? manifest.urls : [];

  return {
    active,
    manifestPath,
    snapshotDir: path.dirname(manifestPath),
    documents,
    urls,
  };
}

export async function resolveActiveBatchLiveCorpus() {
  return ensureActiveBatchLiveCorpusMaterialized();
}
