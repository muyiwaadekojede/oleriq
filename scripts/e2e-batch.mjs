const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const sessionId = `e2e-batch-${Date.now()}`;
const articleUrl = `${baseUrl}/test-fixtures/article-source.html`;
const emptyUrl = `${baseUrl}/test-fixtures/empty-source.html`;
const structureUrl = `${baseUrl}/test-fixtures/structure-source.html`;
const rscFallbackUrl = `${baseUrl}/test-fixtures/rsc-fallback-source.html`;

const urls = [
  `${articleUrl}?variant=1`,
  structureUrl,
  rscFallbackUrl,
  emptyUrl,
  'https://example.invalid',
];

const createResponse = await fetch(`${baseUrl}/api/batch-jobs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-clearpage-session': sessionId,
  },
  body: JSON.stringify({
    urls,
    format: 'txt',
    images: 'off',
    settings: {
      fontFace: 'serif',
      fontSize: 16,
      lineSpacing: 1.6,
      colorTheme: 'light',
    },
  }),
});

const created = await createResponse.json();

if (!createResponse.ok || !created.success || !created.job?.jobId) {
  throw new Error(`Batch create failed: ${createResponse.status} ${JSON.stringify(created)}`);
}

const jobId = created.job.jobId;
const timeoutAt = Date.now() + 180_000;
let detail = null;

while (Date.now() < timeoutAt) {
  const response = await fetch(`${baseUrl}/api/batch-jobs?jobId=${encodeURIComponent(jobId)}&limit=50&offset=0`, {
    headers: {
      'x-clearpage-session': sessionId,
    },
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Batch status failed: ${response.status} ${raw}`);
  }

  const json = await response.json();
  if (!json.success || !json.job) {
    throw new Error(`Batch status payload invalid: ${JSON.stringify(json)}`);
  }

  detail = json;

  if (json.job.status === 'completed' || json.job.status === 'failed') {
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));
}

if (!detail?.job) {
  throw new Error('Batch status polling timed out without job detail.');
}

const job = detail.job;
if (job.processedUrls !== job.totalUrls) {
  throw new Error(`Batch did not process all URLs: ${job.processedUrls}/${job.totalUrls}`);
}

if (job.successCount + job.failureCount !== job.totalUrls) {
  throw new Error('Batch success/failure counts do not match total URLs.');
}

if (job.successCount < 1) {
  throw new Error('Batch expected at least one successful extraction.');
}

if (typeof job.degradedCount !== 'number') {
  throw new Error(`Batch detail is missing degradedCount: ${JSON.stringify(job)}`);
}

if (typeof job.usableCount !== 'number') {
  throw new Error(`Batch detail is missing usableCount: ${JSON.stringify(job)}`);
}

if (typeof job.emptyOutputCount !== 'number') {
  throw new Error(`Batch detail is missing emptyOutputCount: ${JSON.stringify(job)}`);
}

if (typeof job.partialOutputCount !== 'number') {
  throw new Error(`Batch detail is missing partialOutputCount: ${JSON.stringify(job)}`);
}

if (!Array.isArray(detail.items)) {
  throw new Error('Batch detail is missing items array.');
}

const successfulRow = detail.items.find((item) => item.status === 'success');
if (!successfulRow) {
  throw new Error('Batch detail is missing a successful row.');
}

if (!Array.isArray(successfulRow.warnings)) {
  throw new Error(`Successful batch rows must include warnings arrays: ${JSON.stringify(successfulRow)}`);
}

if (!Array.isArray(successfulRow.diagnosticReasons)) {
  throw new Error(`Successful batch rows must include diagnosticReasons arrays: ${JSON.stringify(successfulRow)}`);
}

const structureRow = detail.items.find((item) => item.sourceUrl === structureUrl);
if (!structureRow) {
  throw new Error(`Batch detail is missing the structure-rich URL row: ${JSON.stringify(detail.items)}`);
}

if (structureRow.status !== 'success') {
  throw new Error(`Structure-rich URL row should succeed before trust analysis: ${JSON.stringify(structureRow)}`);
}

if (structureRow.qualityState !== 'degraded') {
  throw new Error(`Structure-rich URL row should be degraded when TXT export flattens tables: ${JSON.stringify(structureRow)}`);
}

if (!Array.isArray(structureRow.diagnosticReasons) || !structureRow.diagnosticReasons.includes('structure_table_loss_risk')) {
  throw new Error(`Structure-rich URL row must expose structure_table_loss_risk: ${JSON.stringify(structureRow)}`);
}

for (const reason of ['structure_heading_loss_risk', 'structure_list_loss_risk', 'structure_code_block_loss_risk']) {
  if (!structureRow.diagnosticReasons.includes(reason)) {
    throw new Error(`Structure-rich URL row must expose ${reason}: ${JSON.stringify(structureRow)}`);
  }
}

const rscRow = detail.items.find((item) => item.sourceUrl === rscFallbackUrl);
if (!rscRow) {
  throw new Error(`Batch detail is missing the RSC fallback row: ${JSON.stringify(detail.items)}`);
}

if (rscRow.status !== 'success' || rscRow.qualityState !== 'partial') {
  throw new Error(`RSC fallback row should succeed with partial qualityState: ${JSON.stringify(rscRow)}`);
}

if (!Array.isArray(rscRow.diagnosticReasons) || !rscRow.diagnosticReasons.includes('extract_rsc_fallback_used')) {
  throw new Error(`RSC fallback row must expose extract_rsc_fallback_used: ${JSON.stringify(rscRow)}`);
}

if (job.partialOutputCount < 1) {
  throw new Error(`Expected partialOutputCount to reflect partial-success rows: ${JSON.stringify(job)}`);
}

const emptyRow = detail.items.find((item) => item.errorCode === 'EMPTY_CONTENT');
if (!emptyRow) {
  throw new Error(`Batch detail is missing an EMPTY_CONTENT row: ${JSON.stringify(detail.items)}`);
}

if (!Array.isArray(emptyRow.diagnosticReasons) || !emptyRow.diagnosticReasons.includes('extract_empty_content')) {
  throw new Error(`EMPTY_CONTENT rows must expose extract_empty_content diagnosticReasons: ${JSON.stringify(emptyRow)}`);
}

if (job.emptyOutputCount < 1) {
  throw new Error(`Expected emptyOutputCount to reflect EMPTY_CONTENT rows: ${JSON.stringify(job)}`);
}

console.log('e2e-batch passed');
