import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const appPagePath = path.join(repoRoot, 'app', 'page.tsx');
const urlInputPath = path.join(repoRoot, 'components', 'UrlInput.tsx');

const [appPageSource, urlInputSource] = await Promise.all([
  readFile(appPagePath, 'utf8'),
  readFile(urlInputPath, 'utf8'),
]);

const failures = [];
const expectedSubtitle = 'Turn any URL into a clean, readable document in Markdown, TXT, DOCX, or PDF.';
const expectedCta = "{loading ? 'Converting...' : 'Convert URL'}";

if (appPageSource.includes('/api/public-metrics')) {
  failures.push('Homepage must not fetch public metrics.');
}

if (appPageSource.includes('usageMetrics={usageMetrics}')) {
  failures.push('Homepage must not pass usage metrics into UrlInput.');
}

if (urlInputSource.includes('Need bulk processing? Open Batch Workspace')) {
  failures.push('Homepage input component must not render the batch workspace prompt.');
}

if (urlInputSource.includes('usageMetrics?:') || urlInputSource.includes('hasUsageData && usageMetrics')) {
  failures.push('Homepage input component must not define or render usage metrics.');
}

if (!appPageSource.includes(`subtitle="${expectedSubtitle}"`)) {
  failures.push('Homepage subtitle must match the approved trust-first copy.');
}

if (!urlInputSource.includes(expectedCta)) {
  failures.push('Homepage CTA must use Convert URL / Converting... copy.');
}

if (!urlInputSource.includes('Conversion progress')) {
  failures.push('Homepage must render a visible conversion progress surface while loading.');
}

if (!urlInputSource.includes('role="progressbar"')) {
  failures.push('Homepage loading surface must expose a progressbar role.');
}

if (failures.length > 0) {
  console.error('Homepage design-law check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Homepage design-law check passed');
