import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const appPagePath = path.join(repoRoot, 'app', 'page.tsx');
const appLayoutPath = path.join(repoRoot, 'app', 'layout.tsx');
const homepageProofPath = path.join(repoRoot, 'components', 'HomepagePublicProof.tsx');
const urlInputPath = path.join(repoRoot, 'components', 'UrlInput.tsx');

const [appPageSource, appLayoutSource, homepageProofSource, urlInputSource] = await Promise.all([
  readFile(appPagePath, 'utf8'),
  readFile(appLayoutPath, 'utf8'),
  readFile(homepageProofPath, 'utf8'),
  readFile(urlInputPath, 'utf8'),
]);

const failures = [];
const expectedBrand = 'Oleriq';
const retiredBrand = ['Clear', 'page'].join('');
const expectedSubtitle = 'Turn any URL or file into a clean, readable document in Markdown, TXT, DOCX, or PDF.';
const expectedCta = "{loading ? 'Converting...' : 'Convert URL'}";
const expectedAttachCta = "{fileActionLoading ? 'Preparing files...' : 'Attach files'}";

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

if (!appPageSource.includes('HomepagePublicProof')) {
  failures.push('Homepage must render the dedicated public proof component.');
}

if (!homepageProofSource.includes('data-homepage-public-proof')) {
  failures.push('Homepage public proof component must expose a stable data-homepage-public-proof marker.');
}

if (!homepageProofSource.includes('files converted')) {
  failures.push('Homepage public proof copy must reference files converted.');
}

if (homepageProofSource.includes('Usage proof')) {
  failures.push('Homepage public proof must stay minimal and must not render a Usage proof eyebrow.');
}

if (homepageProofSource.includes('Updated weekly.')) {
  failures.push('Homepage public proof must stay minimal and must not render an Updated weekly support line.');
}

if (!appPageSource.includes('proofContent={<HomepagePublicProof />}')) {
  failures.push('Homepage must pass the public proof component into UrlInput for inline placement.');
}

if (!urlInputSource.includes('proofContent?: ReactNode')) {
  failures.push('Homepage input component must define an inline proofContent slot.');
}

if (!urlInputSource.includes('!loading && proofContent')) {
  failures.push('Homepage input component must render inline proof content in the idle state.');
}

if (!urlInputSource.includes('secondaryContent?: ReactNode')) {
  failures.push('Homepage input component must define an inline secondaryContent slot for authenticated extraction.');
}

if (!urlInputSource.includes('!loading && secondaryContent')) {
  failures.push('Homepage input component must render inline secondary content in the idle state.');
}

if (!appPageSource.includes('data-auth-disclosure="homepage"')) {
  failures.push('Homepage must render the authenticated-session disclosure directly below the proof line.');
}

if (!appPageSource.includes('Use authenticated session')) {
  failures.push('Homepage must expose a Use authenticated session disclosure label.');
}

if (!urlInputSource.includes('data-homepage-hero="primary"')) {
  failures.push('Homepage hero must expose a stable data-homepage-hero marker.');
}

if (!appPageSource.includes(`subtitle="${expectedSubtitle}"`)) {
  failures.push('Homepage subtitle must match the approved trust-first copy.');
}

if (!appLayoutSource.includes(`title: '${expectedBrand}'`)) {
  failures.push('Root layout metadata title must use the approved Oleriq brand.');
}

if (!urlInputSource.includes(`>${expectedBrand}<`)) {
  failures.push('Homepage hero must render the approved Oleriq brand.');
}

if (urlInputSource.includes(retiredBrand)) {
  failures.push('Homepage surface must not leak the retired legacy brand.');
}

if (!urlInputSource.includes(expectedCta)) {
  failures.push('Homepage CTA must use Convert URL / Converting... copy.');
}

if (!urlInputSource.includes(expectedAttachCta)) {
  failures.push('Homepage hero must expose an Attach files / Preparing files... CTA.');
}

if (!urlInputSource.includes('Conversion progress')) {
  failures.push('Homepage must render a visible conversion progress surface while loading.');
}

if (!urlInputSource.includes('role="progressbar"')) {
  failures.push('Homepage loading surface must expose a progressbar role.');
}

if (!appLayoutSource.includes('data-font-system="newsreader-geist"')) {
  failures.push('Root layout must expose the Newsreader + Geist font-system contract.');
}

if (failures.length > 0) {
  console.error('Homepage design-law check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Homepage design-law check passed');
