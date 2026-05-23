# Stage 1 Product Truth Baseline

## Scope

- [Verified] Stage 1 is limited to current codebase truth and the in-repo competitor workbook.
- [Verified] Stage 1 does not include live web verification of competitor pricing, positioning, onboarding, or user sentiment.
- [Verified] The workbook extracts for this stage are in `docs/research/stage-1/workbook/`.

## Oleriq Product Truth

### Core Promise

- [Verified] The homepage promise is "Paste any URL. Get a clean, exportable document." Source: `app/page.tsx`, `components/UrlInput.tsx`.
- [Verified] The design rule says the homepage is for one URL only and that new capabilities should live on their own route. Source: `DESIGN.md`.

### Homepage Surface

- [Verified] The homepage supports one main flow: submit one URL, extract readable content, preview it, tune reader settings, and export it.
- [Verified] Supported export formats for extracted page content are `pdf`, `txt`, `md`, and `docx`.
- [Verified] The homepage has a second path for direct-file links. When extraction returns a direct-file result, the UI switches from article preview to file download handling.
- [Verified] Direct-file handling attempts conversion for non-`pdf` output and falls back to the original file when conversion fails.
- [Verified] The homepage records telemetry for page view, extraction, export, reader-setting changes, direct-file actions, and feedback submission.
- [Verified] The homepage displays public usage counters from `/api/public-metrics`.
- [Verified] The homepage links to `/batch` with a plain text link.
- [Verified] There is a current design mismatch: `DESIGN.md` says the homepage should stay single-purpose with no extra links or counters, but the current UI includes both counters and a `/batch` link.

### Homepage Failure and Constraint Signals

- [Verified] User-visible extraction failure modes include `FETCH_FAILED`, `EXTRACTION_FAILED`, `PAYWALL_DETECTED`, `EMPTY_CONTENT`, `TIMEOUT`, and `DIRECT_FILE_URL`.
- [Verified] The homepage extract path is rate-limited and returns `429` when the limit is exceeded.
- [Verified] Direct-file handling has a `60 MB` size cap and separate timeout paths for conversion and original-file passthrough.

### Batch Surface

- [Verified] `/batch` has two modes: `url` and `document`.
- [Verified] `/batch` defaults to `url` mode.
- [Verified] URL batches default to `md` output.
- [Verified] Document batches default to `pdf` output.
- [Verified] URL batches cap at `50,000` URLs.
- [Verified] Document batches cap at `500` files, `60 MB` per file, `2 GB` total uploaded bytes, and `24` hours of retention.
- [Verified] Document uploads support `.pdf`, `.docx`, `.txt`, `.md`, `.html`, `.htm`, `.csv`, `.tsv`, `.json`, `.xml`, `.yaml`, `.yml`, `.log`, and `.rst`.
- [Verified] Document outputs support `pdf`, `txt`, `md`, and `docx`.
- [Verified] `/batch` returns individual downloads, not ZIP output.

### Conversion and Runtime Behavior

- [Verified] PDF text extraction uses `pdf-parse`.
- [Verified] DOCX extraction uses `mammoth`.
- [Verified] Text-like files are decoded and normalized before export.
- [Verified] HTML-like files are reduced to plain text before export.
- [Verified] If a document input is already a PDF and the requested output is `pdf`, the original bytes are passed through instead of being re-rendered.
- [Verified] Local batch runtime uses an in-process queue with concurrency `3`.
- [Verified] Batch ETA logic uses `9,000 ms` per item until real averages exist.
- [Verified] Document-batch runtime has two storage and state backends: local filesystem or SQLite by default, and Vercel Blob plus durable manifest state when the deployed environment enables it.

### Storage and Session Model

- [Verified] Storage mode depends on `BLOB_READ_WRITE_TOKEN`.
- [Verified] When the token exists, uploads and outputs use private Vercel Blob.
- [Verified] When the token does not exist, uploads and outputs use the local filesystem under `data/batch-storage`.
- [Verified] Uploaded document records are session-bound and later reads are filtered by the same `sessionId`.
- [Verified] Document-batch downloads also enforce the matching session header before streaming the stored output.

## Competitor Workbook Baseline

### Extracted Artifacts

- [Verified] Extracted workbook CSV files:
- [Verified] `docs/research/stage-1/workbook/feature-pricing-matrix.csv`
- [Verified] `docs/research/stage-1/workbook/summary-comparison.csv`
- [Verified] `docs/research/stage-1/workbook/pricing-tiers.csv`
- [Verified] `docs/research/stage-1/workbook/github-repo-index.csv`

### Current Workbook Coverage

- [Verified] The workbook currently tracks products in the Oleriq problem space rather than generic AI products.
- [Verified] The tracked set includes Firecrawl, Jina Reader, Apify, Browser Use, ScrapeGraphAI, Webclaw, WebPeel, CRW, Crawl4AI, TeraCrawl, BrowserPilot, Webustler, `crawl4ai-mcp-server`, Playwright MCP, Trafilatura, and Mozilla Readability.
- [Verified] The workbook categories cover SaaS, API, library, early-access cloud tools, and mixed open-source plus hosted models.
- [Verified] The workbook is centered on scraping, crawling, extraction, browser automation, pricing, free-tier structure, licensing, and stack choices.

### Workbook Data Quality Findings

- [Verified] `Feature-Pricing Matrix` contains inline metadata rows that break the table shape.
- [Verified] Entity naming is inconsistent across sheets, especially for Apify.
- [Verified] Sheet coverage is uneven: the repo index has more entities than the comparison and pricing sheets.
- [Verified] The workbook mixes `N/A`, unknown, and not-applicable states without a clean distinction.
- [Verified] Several entries are explicitly time-sensitive, including launch pricing and early-access labels.
- [Verified] The workbook has no in-sheet freshness marker such as capture date, source date, or last-verified date.
- [Verified] The workbook filename contains a typo: `scrpaing`.

## Stage 2 Unknowns

- [Verified] The workbook does not confirm whether current competitor pricing still matches live source pages.
- [Verified] The workbook does not confirm whether current competitor onboarding still matches live product flows.
- [Verified] The workbook does not include direct source URLs for every pricing or feature claim.
- [Verified] Stage 1 does not yet answer what users currently complain about, ask for, or praise in public channels.
- [Verified] Stage 1 does not yet separate strong competitors from adjacent substitutes by actual user job-to-be-done.

## Stage 1 Deliverable Status

- [Verified] Current product truth has been grounded in the codebase.
- [Verified] The in-repo competitor workbook has been extracted into readable CSV artifacts.
- [Verified] Existing workbook weaknesses have been identified for Stage 2 verification.
- [Inference] The strongest Stage 2 next move is live competitor verification first, because the workbook already contains useful structure but not trustworthy freshness.
