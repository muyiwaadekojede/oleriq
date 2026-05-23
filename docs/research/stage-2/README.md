# Stage 2 Live Competitor Verification

## Scope

- [Verified] Verification date: `2026-05-16`.
- [Verified] This stage used primary sources only: official product sites, official pricing pages, official docs, and official GitHub repos.
- [Verified] This stage compares current live reality against the Stage 1 workbook extracts in `docs/research/stage-1/workbook/`.
- [Verified] This stage does not yet include public user complaints, requests, or sentiment mining.

## Main Finding

- [Verified] The Stage 1 workbook is directionally useful, but it is not current enough to use as a decision source without live verification.
- [Verified] The biggest live drift is in pricing shape, free-tier structure, product-surface breadth, and competitor category boundaries.

## Current Market Shape

- [Verified] `Firecrawl`, `Jina Reader`, `Apify`, `Webclaw`, `WebPeel`, `CRW`, and `ScrapeGraphAI` are active direct extraction or crawl products in Oleriq's problem space.
- [Verified] `Browser Use`, `BrowserPilot`, `Playwright MCP`, and `TeraCrawl` sit closer to browser automation, agent execution, or extraction infrastructure than to a narrow "clean page to exportable document" product.
- [Verified] `crawl4ai-mcp-server`, `Webustler`, `Trafilatura`, and `Mozilla Readability` are better treated as enabling tools, wrappers, or libraries than as like-for-like Oleriq commercial competitors.
- [Inference] Future prioritization should separate direct product competitors from enabling primitives, because mixing them hides who is competing for the same user job and who is simply part of the stack.

## Highest-Signal Workbook Drift

- [Verified] `Firecrawl` live pricing now shows `1,000 credits/month` on free and `Hobby` at `$16/month`, while Stage 1 recorded `500 one-time credits`.
- [Verified] `Browser Use` is materially stale in the workbook. The live commercial model is now centered on credit purchases, pay-as-you-go usage, and higher concurrency, not the older `10 agent tasks/mo` and `$29/mo Starter` framing.
- [Verified] `ScrapeGraphAI` now shows `500 API credits/month` on free and marks older v1 endpoint naming as deprecated.
- [Verified] `Webclaw` is no longer accurately described by the workbook as pure HTTP extraction only. Official sources now show browser actions, screenshots, hosted JavaScript rendering, document parsing, search, and watches.
- [Verified] `Crawl4AI` hosted cloud pricing is not cleanly visible from accessible official pages in this pass, while the workbook contains specific pricing anchors and sponsorship tiers. Those workbook lines are high stale-risk.
- [Verified] `Playwright MCP` and `Trafilatura` both have workbook license drift. Live official repos show `Apache-2.0`, not the Stage 1 workbook values.
- [Verified] `WebPeel` official sources conflict internally on extractor count, which means the workbook's extractor-count claims should not be treated as stable without source-by-source verification.

## Clear Competitor Clusters

### Direct Product Competitors

- [Verified] `Firecrawl`
- [Verified] `Jina Reader`
- [Verified] `Apify`
- [Verified] `Webclaw`
- [Verified] `WebPeel`
- [Verified] `CRW`
- [Verified] `ScrapeGraphAI`

### Hybrid / Adjacent Commercial Platforms

- [Verified] `Browser Use`
- [Verified] `Crawl4AI`
- [Verified] `TeraCrawl`
- [Verified] `BrowserPilot`

### Enabling Libraries / Wrappers / Infra

- [Verified] `crawl4ai-mcp-server`
- [Verified] `Webustler`
- [Verified] `Playwright MCP`
- [Verified] `Trafilatura`
- [Verified] `Mozilla Readability`

## What Matters For Later Stages

- [Verified] The direct-competitor set is broader than simple "URL to markdown" tools. Several competitors now bundle search, browser control, monitoring, screenshots, structured extraction, and MCP or agent integrations.
- [Verified] Low-friction onboarding is a repeated pattern: prefix-based usage for `Jina Reader`, cloud-first signup for `Browser Use`, in-under-a-minute docs for `Webclaw`, live demo plus no-card free start for `WebPeel`, and strong playground or quick-start paths across several tools.
- [Inference] Oleriq should be evaluated later not only against output quality, but also against onboarding speed, free-tier trust, browser-backed coverage, structured extraction depth, and how clearly each competitor frames its ideal user job.

## Unresolved Items

- [Unverified] I cannot verify this. `Jina Reader`'s currently exposed lowest paid bundle price was not visible in the official static Reader page captured in this pass.
- [Unverified] I cannot verify this. `Crawl4AI` hosted public pricing was not readable from the accessible official pages used in this pass, even though official terms indicate hosted plans exist.
- [Inference] `BrowserPilot` attribution needs care in future work because the repo-backed project and the `browserpilot.com` extension-branded presence create naming ambiguity.

## Stage 2 Artifacts

- [Verified] The normalized per-competitor verification table is in `docs/research/stage-2/live-competitor-verification.csv`.
- [Verified] The direct-cohort repo investigation summary is in `docs/research/stage-2/repo-investigation-direct-cohort.md`.
- [Verified] The durable per-repo lab notes are in `C:\Users\Godsgrace\Desktop\codez\Oleriq-competitor-lab\notes\<slug>\analysis.md`.

## Recommended Stage 3 Input

- [Inference] The strongest next stage is public demand and complaint mining against the verified direct-competitor set first, then against the adjacent tool set only where those tools materially shape user expectations.
