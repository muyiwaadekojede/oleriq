const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';

function fail(message) {
  throw new Error(message);
}

async function extract(url, images) {
  const response = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, images }),
  });

  const json = await response.json();
  if (!response.ok) {
    fail(`Extract failed for ${url}: ${response.status} ${JSON.stringify(json)}`);
  }

  if (!json.success) {
    fail(`Extract returned unsuccessful payload for ${url}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  const bbcUrl = 'https://www.bbc.com/sport/football/articles/cd0py2x2gx0o';
  const hashicorpUrl =
    'https://www.hashicorp.com/blog/terraform-adds-pre-written-sentinel-policies-for-iso-27001';

  const bbc = await extract(bbcUrl, 'on');
  if (bbc.imageCount < 1) {
    fail(`Expected BBC live article to preserve at least one image, got ${bbc.imageCount}: ${JSON.stringify(bbc)}`);
  }

  if (!/<img\b/i.test(String(bbc.content || ''))) {
    fail('Expected BBC live article output to contain at least one rendered image tag.');
  }

  const hashicorp = await extract(hashicorpUrl, 'on');
  if (hashicorp.resultState !== 'degraded' || hashicorp.extractionPath !== 'browser_fallback') {
    fail(`Expected HashiCorp live article to stay degraded via browser_fallback: ${JSON.stringify(hashicorp)}`);
  }

  if (
    !Array.isArray(hashicorp.diagnosticReasons) ||
    !hashicorp.diagnosticReasons.includes('extract_browser_fallback_used')
  ) {
    fail(`Expected HashiCorp live article to expose extract_browser_fallback_used: ${JSON.stringify(hashicorp)}`);
  }

  console.log('e2e-homepage-live-corpus passed');
}

await main();
