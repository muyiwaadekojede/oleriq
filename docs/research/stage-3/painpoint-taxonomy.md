# Stage 3 Pain-Point Taxonomy

## Purpose

- [Verified] This file groups the Stage 3 evidence corpus into product-relevant pain-point clusters.
- [Verified] The purpose is to make the `251`-row corpus easier to use for later prioritization.
- [Verified] The labels `today`, `soon`, and `later` below are relevance buckets for Oleriq, not final roadmap commitments.

## Today

### Reliability Truthfulness

- [Verified] Evidence cluster: jobs reported as successful while returning empty data, anti-bot loops, Docker instability, concurrency crashes, brittle browser actions, and truncated extraction outputs.
- [Inference] Relevance: `today`
- [Inference] Why: Oleriq already has extraction and `/batch` job surfaces, so trust in status, result completeness, and bounded failure is immediately relevant.

### Renderer Visibility And Dynamic-Page Truth

- [Verified] Evidence cluster: JS-heavy page failures, SPA wait-control requests, page-state extraction requests, Cloudflare limits, and browser-path token bloat.
- [Inference] Relevance: `today`
- [Inference] Why: users want to know what the renderer saw, whether the browser path ran, and why a page still failed.

### Structure And Markdown Fidelity

- [Verified] Evidence cluster: damaged tables, flattened code blocks, malformed academic PDF markdown, list-format bugs, missing article bodies, and title/header normalization complaints.
- [Inference] Relevance: `today`
- [Inference] Why: Oleriq already promises clean, exportable documents, so fidelity failures strike at the current product promise directly.

### Debuggability And Failure Explanation

- [Verified] Evidence cluster: queue observability, retry clarity, raw extraction debug needs, selector capture, visual highlighters, and replay evidence.
- [Inference] Relevance: `today`
- [Inference] Why: users do not trust opaque failures once they move beyond one-off manual use.

### Low-Friction First Success

- [Verified] Evidence cluster: praise for one-line or one-command onboarding, frustration with missing prerequisite steps, wrapper-tool creation when the main path feels unclear, and thin-signal competitors using low-friction packaging as a conversion wedge.
- [Inference] Relevance: `today`
- [Inference] Why: the market repeatedly rewards tools that feel useful before setup becomes a project.

### Post-First-Use Trust Decay

- [Verified] Evidence cluster: demo-friendly first success followed by empty-success jobs, token shock, JS-heavy failure, browser loops, Docker friction, or anti-bot fallback loops on the first real workload.
- [Inference] Relevance: `today`
- [Inference] Why: the strongest current pain pattern is not "could not start." It is "started fast, then stopped feeling trustworthy."

## Soon

### Structured Extraction And Schema Control

- [Verified] Evidence cluster: requests for clearer table rebuilding, schema-driven export, multi-page research enrichment, and prompt-to-structure workflows.
- [Inference] Relevance: `soon`
- [Inference] Why: this is a strong next-step pressure once the base extraction and trust surfaces are solid.

### Predictable Batch Output And Job Controls

- [Verified] Evidence cluster: deterministic batch filenames, rerun controls, queue-state control, and cost-aware batch packing.
- [Inference] Relevance: `soon`
- [Inference] Why: Oleriq already has batch primitives and can extend them without changing product category.

### Token And Output-Size Predictability

- [Verified] Evidence cluster: token spikes, multilingual token overhead, and browser-context bloat in MCP or browser-assisted flows.
- [Inference] Relevance: `soon`
- [Inference] Why: this becomes more important as Oleriq adds more machine-facing and browser-assisted surfaces.

### Pricing And Spending Confidence

- [Verified] Evidence cluster: expiring credits, bursty-usage waste, unclear scaling cost, token shock, and early-user hesitation once cost shape becomes visible.
- [Inference] Relevance: `soon`
- [Inference] Why: Oleriq does not need billing complexity first, but it should not ignore the evidence that cost confidence shapes adoption very early.

### Agent-Readable Docs And Tool-Facing Packaging

- [Verified] Evidence cluster: `llms.txt` requests, local-hosting clarity, MCP client setup friction, and community-built unofficial setup guides.
- [Inference] Relevance: `soon`
- [Inference] Why: this is a leverage point if Oleriq wants stronger agent adoption without immediately expanding into a full platform.

## Later

### Authenticated Extraction

- [Verified] Evidence cluster: session reuse requests, login scraping fragility, cookie corruption, and auth-state export value.
- [Inference] Relevance: `later`
- [Inference] Why: important, but it expands scope and security responsibility beyond the current core product.

### Deterministic Replay And Automation Handoff

- [Verified] Evidence cluster: selector capture, replay failures, configurable selector strategies, and exploratory-to-deterministic workflow requests.
- [Inference] Relevance: `later`
- [Inference] Why: valuable if Oleriq becomes more browser-agent oriented, but not required for the current product promise.

### Deep Research And Multi-Source Enrichment

- [Verified] Evidence cluster: requests for multi-step search, related-source following, and research-style enrichment once the first scrape works.
- [Inference] Relevance: `later`
- [Inference] Why: this is a meaningful expansion path, but it should follow trust, fidelity, and observability rather than precede them.

### Protected-Site Escalation As A Product Line

- [Verified] Evidence cluster: Cloudflare complaints, browser-detection issues, proxy-pool questions, and hosted-browser dependency tradeoffs.
- [Inference] Relevance: `later`
- [Inference] Why: this can become a product line of its own and should not be treated as a cheap checkbox.

## Taxonomy Readout

- [Inference] The highest-value `today` themes are trust, fidelity, renderer visibility, failure explanation, first-run ease, and first-edge-case trust retention.
- [Inference] The highest-value `soon` themes are structured extraction, batch ergonomics, output-size predictability, pricing confidence, and tool-facing docs.
- [Inference] The highest-value `later` themes are authenticated extraction, deterministic replay, deep research, and full protected-site escalation.
