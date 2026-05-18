import fs from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const sourceUrl = `${baseUrl}/test-fixtures/article-source.html`;

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

await fs.writeFile('.tmp-extract.json', JSON.stringify(json, null, 2), 'utf8');
console.log('e2e-extract passed');
