import fs from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const sourceUrl = `${baseUrl}/test-fixtures/article-source.html`;
const rscFallbackUrl = `${baseUrl}/test-fixtures/rsc-fallback-source.html`;
const dynamicShellUrl = `${baseUrl}/test-fixtures/dynamic-shell-source.html`;

const response = await fetch(`${baseUrl}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: sourceUrl, images: 'on' }),
});

const json = await response.json();

if (!response.ok) {
  throw new Error(`Extract API failed: ${response.status} ${JSON.stringify(json)}`);
}

if (!json.success) {
  throw new Error(`Extract API returned unsuccessful payload: ${JSON.stringify(json)}`);
}

if (!json.content || !json.textContent) {
  throw new Error('Extract API returned empty content/textContent.');
}

if (json.wordCount < 100) {
  throw new Error(`Unexpectedly low word count: ${json.wordCount}`);
}

if (json.resultState !== 'usable') {
  throw new Error(`Expected usable homepage extract result, got: ${json.resultState}`);
}

if (json.extractionPath !== 'readability') {
  throw new Error(`Expected readability extraction path for local fixture, got: ${json.extractionPath}`);
}

if (!Array.isArray(json.warnings) || json.warnings.length !== 0) {
  throw new Error(`Expected no warnings for local fixture extract, got: ${JSON.stringify(json.warnings)}`);
}

if (
  !json.exportDiagnosticReasonsByFormat ||
  !Array.isArray(json.exportDiagnosticReasonsByFormat.txt) ||
  !Array.isArray(json.exportDiagnosticReasonsByFormat.md)
) {
  throw new Error(
    `Expected extract payload to expose exportDiagnosticReasonsByFormat for txt and md, got: ${JSON.stringify(json.exportDiagnosticReasonsByFormat)}`,
  );
}

await fs.writeFile('.tmp-extract.json', JSON.stringify(json, null, 2), 'utf8');

const rscResponse = await fetch(`${baseUrl}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: rscFallbackUrl, images: 'on' }),
});

const rscJson = await rscResponse.json();

if (!rscResponse.ok) {
  throw new Error(`RSC extract API failed: ${rscResponse.status} ${JSON.stringify(rscJson)}`);
}

if (!rscJson.success) {
  throw new Error(`RSC extract returned unsuccessful payload: ${JSON.stringify(rscJson)}`);
}

if (rscJson.resultState !== 'partial') {
  throw new Error(`Expected partial resultState for RSC fallback fixture, got: ${JSON.stringify(rscJson)}`);
}

if (rscJson.extractionPath !== 'rsc_fallback') {
  throw new Error(`Expected rsc_fallback extraction path for RSC fixture, got: ${JSON.stringify(rscJson)}`);
}

if (!Array.isArray(rscJson.diagnosticReasons) || !rscJson.diagnosticReasons.includes('extract_rsc_fallback_used')) {
  throw new Error(`Expected RSC fixture to expose extract_rsc_fallback_used, got: ${JSON.stringify(rscJson)}`);
}

const dynamicFailureResponse = await fetch(`${baseUrl}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: dynamicShellUrl, images: 'on' }),
});

const dynamicFailureJson = await dynamicFailureResponse.json();

if (dynamicFailureResponse.ok || dynamicFailureJson.success) {
  throw new Error(
    `Expected dynamic shell fixture to fail extract, got: ${dynamicFailureResponse.status} ${JSON.stringify(dynamicFailureJson)}`,
  );
}

if (dynamicFailureJson.errorCode !== 'EMPTY_CONTENT') {
  throw new Error(`Expected EMPTY_CONTENT for dynamic shell fixture, got: ${JSON.stringify(dynamicFailureJson)}`);
}

if (dynamicFailureJson.attemptedExtractionPath !== 'browser_fallback') {
  throw new Error(
    `Expected attemptedExtractionPath=browser_fallback on dynamic shell failure, got: ${JSON.stringify(dynamicFailureJson)}`,
  );
}

if (dynamicFailureJson.browserAttempted !== true) {
  throw new Error(`Expected browserAttempted=true on dynamic shell failure, got: ${JSON.stringify(dynamicFailureJson)}`);
}

if (dynamicFailureJson.pageComplexitySignal !== 'dynamic_page_likely') {
  throw new Error(
    `Expected pageComplexitySignal=dynamic_page_likely on dynamic shell failure, got: ${JSON.stringify(dynamicFailureJson)}`,
  );
}

console.log('e2e-extract passed');
