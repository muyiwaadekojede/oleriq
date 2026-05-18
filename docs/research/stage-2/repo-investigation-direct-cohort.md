# Stage 2 Direct Cohort Repo Investigation

## Scope

- [Verified] Investigation date: `2026-05-16`.
- [Verified] This pass is limited to repo-level investigation of the direct-product clone set in `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\repos\direct-products\`.
- [Verified] The analyzed repos are `firecrawl`, `apify-crawlee`, `scrapegraphai`, `jina-reader`, `webclaw`, `webpeel`, `browser-use`, `crawl4ai`, and `crw`.
- [Verified] The durable per-repo notes are stored under `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\<slug>\analysis.md`.
- [Verified] This pass is grounded in cloned repo contents: README files, package manifests, entrypoints, route code, server code, CLI code, and visible storage or queue layers.

## Main Finding

- [Verified] Almost none of the serious repos in this cohort are just "URL in, markdown out."
- [Verified] The stronger repos usually combine at least two of these surfaces in one codebase: API, CLI, MCP, SDK, browser automation, crawl jobs, search, screenshotting, structured extraction, or local self-hosting.
- [Inference] Clearpage's current strength is still the end-user document workflow: readable export, direct-file handling, and document batch conversion.
- [Inference] Clearpage's current weakness is agent-native breadth: explicit crawl controls, structured extraction contracts, renderer selection, MCP or CLI surfaces, and browser-session tooling.

## Repo Archetypes

### Direct Extraction Platforms

- [Verified] `firecrawl`, `webclaw`, `webpeel`, and `crw` all package extraction as a broader platform rather than a single endpoint.
- [Verified] These repos expose multiple product jobs such as scrape, crawl, map, search, extract, screenshot, or agent integration from one shared core.
- [Inference] This is the clearest market signal in the direct cohort: users are being trained to expect more than plain article extraction.

### Read Or Read-Search APIs

- [Verified] `jina-reader` is the strongest example of a low-friction read surface backed by real repo depth.
- [Verified] Its OSS branch supports read and search flows, multiple output modes, browser or curl engine choice, token-budget controls, and direct file ingestion.
- [Inference] It is a stronger ergonomics reference than a UI reference for Clearpage.

### Crawler Libraries And Self-Hosted Extraction Kits

- [Verified] `crawl4ai` and `apify-crawlee` are more library-first than product-first in the cloned repos.
- [Verified] `crawl4ai` is still a strong direct comparator because it ships a real markdown pipeline, deep crawl strategies, local cache state, and an optional API wrapper.
- [Verified] `apify-crawlee` is more useful as infrastructure reference than as like-for-like product reference.

### Prompt-Orchestrated Extraction

- [Verified] `scrapegraphai` is the clearest prompt-first extraction repo in the set.
- [Verified] Its overlap with Clearpage is strongest on structured extraction across web and local documents, not on product surface or storage design.

### Browser-Control Adjacency

- [Verified] `browser-use` is valuable for browser session control, auth-state export, and inspect-before-act ergonomics.
- [Verified] It is not the strongest direct benchmark for Clearpage's core extraction job because the inspected CLI explicitly marks `extract` as not yet implemented.

## Highest-Signal Architecture Patterns

### One Core, Many Surfaces

- [Verified] `webclaw`, `webpeel`, `crw`, and `firecrawl` each expose one extraction core through several surfaces such as API, CLI, MCP, SDK, or hosted wrappers.
- [Inference] Clearpage currently exposes one strong user-facing web app, but not the same multi-surface reach.

### Browser Or Engine Escalation

- [Verified] `jina-reader` exposes curl-versus-browser choices.
- [Verified] `crawl4ai`, `webpeel`, `browser-use`, `firecrawl`, and `crw` all surface browser-backed or renderer-backed behavior in the repo.
- [Inference] Competitors are not treating browser escalation as a niche edge case. They are treating it as part of the normal extraction contract.

### Async Job Thinking

- [Verified] `firecrawl`, `webpeel`, and `crw` all expose queue-backed or job-backed multi-step flows in the inspected repo surfaces.
- [Verified] Clearpage already has job state for `/batch`.
- [Inference] Clearpage is closer to this pattern than it looks, but it does not expose the same breadth of crawl or extract job types yet.

### Broad Output Contracts

- [Verified] The direct cohort commonly exposes more than one output type: markdown, JSON, screenshots, links, metadata, structured extraction, or search results.
- [Verified] `crw` is especially explicit about response format contracts and renderer-decision metadata.
- [Inference] Clearpage's current export set is strong for documents, but narrow for machine-facing extraction contracts.

### Low-Friction Onboarding

- [Verified] `jina-reader` uses URL-prefix onboarding.
- [Verified] `webclaw` uses `npx create-webclaw`.
- [Verified] `crawl4ai` uses `pip install`, setup, and doctor commands.
- [Verified] `webpeel`, `firecrawl`, and `browser-use` all push playground, cloud, or quickstart flows directly from the repo.
- [Inference] The market standard is not only technical capability. It is speed-to-first-success.

## Clearpage Gap Map

### Current Strengths

- [Verified] Clearpage already has a strong user-facing export workflow with `pdf`, `txt`, `md`, and `docx`.
- [Verified] Clearpage already handles direct-file URLs and document batch uploads on `/batch`.
- [Verified] Clearpage already has queue-backed batch status, session-bound downloads, and durable storage options.

### Current Gaps

- [Inference] Clearpage lacks a narrow MCP surface or CLI surface that would let agents use it as a tool instead of only as a website.
- [Inference] Clearpage lacks an explicit structured-extraction contract comparable to schema-first or JSON-first competitors.
- [Inference] Clearpage lacks visible renderer or engine controls, renderer-decision metadata, and browser-escalation transparency.
- [Inference] Clearpage lacks crawl, map, and search surfaces that several competitors now bundle into the same product family.
- [Inference] Clearpage lacks low-friction developer onboarding primitives such as prefix-based usage, one-command installer setup, or self-host-first docs.

### Gaps That Matter Less Right Now

- [Inference] Full browser task automation like `browser-use` is not the best immediate target because it expands Clearpage into a different product category.
- [Inference] Replicating WebPeel-scale dashboard, extension, session, billing, and research breadth would be scope creep at this stage.

## Clean-Room Opportunity Ranking

### Highest Value

- [Inference] `Structured extraction mode`: Add a machine-facing extraction contract on top of Clearpage's current extract flow, instead of only export-oriented outputs.
- [Inference] `Renderer visibility and fallback`: Expose whether extraction used lightweight fetch or browser-backed recovery, and why.
- [Inference] `Narrow MCP or agent surface`: A focused tool layer for extract, export, and batch status would close a major competitiveness gap without requiring a full platform rewrite.
- [Inference] `Async extract or crawl jobs`: Extend Clearpage's existing job model beyond document batch where it materially improves large or slow extraction tasks.

### Medium Value

- [Inference] `Selector and token-budget controls`: `jina-reader` shows clear value here, especially for machine consumers.
- [Inference] `Local-first installer or self-host docs`: `webclaw` is the strongest packaging reference if Clearpage chooses to court agent users directly.

### Lower Value For Now

- [Inference] `Prompt-graph orchestration`: `scrapegraphai` is useful inspiration, but the dependency and LLM-coupling cost is high relative to Clearpage's current surface.
- [Inference] `Full crawl infrastructure`: `apify-crawlee` is strong engineering reference, but it can pull Clearpage into unnecessary crawler-generalization too early.

## Reuse Risk

- [Verified] High legal or product-gate risk repos in this cohort are `firecrawl`, `webclaw`, `webpeel`, and `crw`.
- [Verified] Lower legal-friction repos are `jina-reader`, `crawl4ai`, `apify-crawlee`, `browser-use`, and `scrapegraphai`.
- [Inference] Lower legal friction does not mean low adoption cost. `apify-crawlee` and `scrapegraphai` both carry scope or dependency risks even though their licenses are easier.

## Best References By Job

- [Verified] Best reference for low-friction read and output controls: `jina-reader`
- [Verified] Best reference for local-first agent packaging: `webclaw`
- [Verified] Best reference for broad hosted extraction platform shape: `firecrawl`
- [Verified] Best reference for response-contract clarity and renderer metadata: `crw`
- [Verified] Best reference for extraction pipeline depth in OSS: `crawl4ai`
- [Verified] Best reference for prompt-first structured extraction: `scrapegraphai`
- [Verified] Best reference for browser session control: `browser-use`
- [Verified] Best reference for crawl infrastructure patterns: `apify-crawlee`
- [Verified] Best reference for broad product packaging and migration aids: `webpeel`

## Artifact Index

- [Verified] Per-repo notes:
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\firecrawl\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\apify-crawlee\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\scrapegraphai\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\jina-reader\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\webclaw\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\webpeel\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\browser-use\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\crawl4ai\analysis.md`
- [Verified] `C:\Users\Godsgrace\Desktop\codez\clearpage-competitor-lab\notes\crw\analysis.md`

## Stage Gate

- [Verified] The direct-cohort repo investigation is complete.
- [Inference] The strongest next stage is public demand and complaint mining against the verified direct cohort, because the current repo work already clarifies what competitors built and how they package it.
