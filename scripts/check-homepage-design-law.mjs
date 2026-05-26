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
const expectedModeSwitchMarker = 'data-homepage-mode-switch';
const forbiddenZeroProof = '0 files converted';

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

if (!homepageProofSource.includes('proof?.value') || !homepageProofSource.includes('return null')) {
  failures.push('Homepage public proof must hide itself when the proof count is missing or zero.');
}

if (homepageProofSource.includes('Usage proof')) {
  failures.push('Homepage public proof must stay minimal and must not render a Usage proof eyebrow.');
}

if (homepageProofSource.includes('Updated weekly.')) {
  failures.push('Homepage public proof must stay minimal and must not render an Updated weekly support line.');
}

if (!appPageSource.includes('heroMode')) {
  failures.push('Homepage must hold an explicit heroMode state.');
}

if (!appPageSource.includes("setHeroMode('file')")) {
  failures.push('Homepage must be able to switch into File mode.');
}

if (!appPageSource.includes("setHeroMode('url')")) {
  failures.push('Homepage must be able to switch into URL mode.');
}

if (!appPageSource.includes('showFileWorkspace={heroMode === \'file\'}')) {
  failures.push('Homepage must replace the hero with the file workspace only in File mode.');
}

if (!appPageSource.includes('showAdvancedDisclosure={showAuthDisclosure}')) {
  failures.push('Homepage must pass the advanced-disclosure state into UrlInput.');
}

if (!appPageSource.includes('advancedContent={')) {
  failures.push('Homepage must pass one shared advancedContent block into UrlInput.');
}

if (appPageSource.includes('secondaryContent={')) {
  failures.push('Homepage must not use the old secondaryContent homepage slot.');
}

if (!urlInputSource.includes('data-homepage-hero="primary"')) {
  failures.push('Homepage hero must expose a stable data-homepage-hero marker.');
}

if (!urlInputSource.includes(expectedModeSwitchMarker)) {
  failures.push('Homepage hero must expose a stable data-homepage-mode-switch marker.');
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

if (urlInputSource.includes('Attach files')) {
  failures.push('Homepage hero must not render Attach files as a top-level peer action in the active URL row.');
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

if (urlInputSource.includes(forbiddenZeroProof)) {
  failures.push('Homepage hero must not hard-render a zero-value proof line.');
}

if (!urlInputSource.includes('Advanced options')) {
  failures.push('Homepage hero must expose an Advanced options drawer.');
}

if (!urlInputSource.includes('Use authenticated session')) {
  failures.push('Homepage hero must keep the authenticated-session control inside the advanced drawer.');
}

if (!urlInputSource.includes('showFileWorkspace?: boolean')) {
  failures.push('Homepage hero component must accept a showFileWorkspace mode flag.');
}

if (!urlInputSource.includes('advancedContent?: ReactNode')) {
  failures.push('Homepage hero component must accept one advancedContent slot.');
}

if (urlInputSource.includes('secondaryContent?: ReactNode')) {
  failures.push('Homepage hero component must not expose the old secondaryContent slot.');
}

if (urlInputSource.includes('proofContent?: ReactNode')) {
  failures.push('Homepage hero component must not expose the old proofContent slot.');
}

if (failures.length > 0) {
  console.error('Homepage design-law check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Homepage design-law check passed');
