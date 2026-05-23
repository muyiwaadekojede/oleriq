# Stage 3 Group A Demand Notes

## Scope

- [Verified] Research date: `2026-05-16`.
- [Verified] Competitor group covered in this pass: `firecrawl`, `jina-reader`, and `apify-crawlee`.
- [Verified] This pass collected public demand signals only: feature requests, complaints, praise, and workaround signals.
- [Verified] Source priority in this pass was GitHub issues and discussions first, then Hacker News and Reddit where they added direct user-language demand context.

## Firecrawl

- [Verified] The strongest repeated demand cluster is reliability under hard pages and self-hosted operation.
- [Verified] On `2025-11-01`, GitHub issue `firecrawl/firecrawl#2350` reported self-hosted Firecrawl becoming completely unresponsive in a loop after anti-bot fallback, which is a high-severity reliability complaint for production usage.
- [Verified] On `2025-03-07`, GitHub issue `firecrawl/firecrawl#1309` reported crawl jobs returning `status: completed` and `success: True` but no records in `data`, which is a high-severity trust problem because success signals do not match output reality.
- [Verified] On `2025-03-05`, GitHub issue `firecrawl/firecrawl#1294` reported `/extract` failing on self-host with local LLM-backed extraction, which shows demand for more robust self-host extraction paths.
- [Verified] On `2024-09-09`, GitHub issue `firecrawl/firecrawl#647` requested automatic cookie-banner suppression in screenshots because banners hide meaningful content and block validation or downstream image-classification use.
- [Verified] On `2026-01-19`, a Reddit post in `r/scrapingtheweb` described Firecrawl as effective against harder sites but too expensive for recurring price monitoring workloads, which adds a cost-sensitivity signal on top of the GitHub reliability signals.
- [Unverified] I cannot verify this. Community cost complaints were not independently benchmarked in this pass.
- [Inference] Oleriq should treat reliability transparency, browser-escalation clarity, and cost-shape clarity as product-level demand, not only implementation details.

## Jina Reader

- [Verified] The strongest repeated demand cluster is low-friction usage paired with coverage limits and output-control gaps.
- [Verified] On `2026-04-09`, the open issues list for `jina-ai/reader` showed `#1241 Extremely high token usage on s.jina.ai — spikes up to 1.9M tokens per single request`, which is a strong cost and predictability complaint.
- [Verified] On `2025-11-18`, the open issues list showed `#1224 Improve documentation / provide llms.txt file`, which signals demand for agent-readable discovery and clearer docs packaging.
- [Verified] On `2025-03-21`, the open issues list showed `#1170 Reader can't read certain pdf links`, which is a concrete coverage complaint in a document-relevant path.
- [Verified] On `2025-02-20`, the open issues list showed `#1148 Unable to crawl heavy Javascript based website`, which signals demand for stronger dynamic-page handling.
- [Verified] On `2024-09-02`, a Hacker News comment described Jina Reader as a neat, currently free prefix-based API that returns Markdown and can be self-hosted from open source, which is a direct praise signal for speed-to-first-success.
- [Verified] On `2024-11-09`, another Hacker News comment said Jina Reader does about `90%` of the job but struggles on some Cloudflare-protected sites, which reinforces the dynamic-site coverage gap while still confirming strong utility.
- [Inference] Oleriq should study Jina more as an onboarding and ergonomics benchmark than as a UI benchmark.

## Apify Crawlee

- [Verified] The strongest repeated demand cluster is operational control at scale: queue behavior, retry visibility, failure propagation, and proxy-debugging clarity.
- [Verified] On `2024-04-07`, GitHub issue `apify/crawlee#2406` reported that the request queue scans roughly `450k` requests each iteration near crawl completion, causing idle periods and heavy CPU use, which is a high-severity scale complaint.
- [Verified] On `2024-10-06` to `2024-10-07`, GitHub discussion `apify/crawlee-python#575` showed a user struggling to confirm whether proxies were actually in use, why 403s happened, and how retries, sessions, and user-agent behavior worked, which is a strong docs-and-observability complaint.
- [Verified] On `2023-11-08`, GitHub discussion `apify/crawlee#2175` asked for a way to propagate `failedRequestHandler` errors back to the main execution context, and the accepted answer required custom promise plumbing, which is a workaround signal and an ergonomics gap.
- [Verified] On `2021-11-06`, GitHub discussion `apify/crawlee#1232` asked how to mark queued requests as unprocessed and remained an explicit demand signal for queue-state control.
- [Verified] On `2024-10-06`, the same proxy discussion also described Reddit scraping as unexpectedly difficult even with residential proxies, showing that users care about anti-bot visibility and actionable diagnostics, not only raw proxy support.
- [Inference] Oleriq does not need Crawlee's full crawler breadth, but it should learn from this demand cluster if it adds long-running jobs, retries, or agent-facing batch controls.

## Cross-Competitor Readout

- [Verified] `Firecrawl` demand is concentrated around reliable extraction under adversarial pages, screenshot cleanliness, and cost sensitivity.
- [Verified] `Jina Reader` demand is concentrated around frictionless single-URL usage, token predictability, and better handling for PDFs and JS-heavy pages.
- [Verified] `Apify Crawlee` demand is concentrated around control-plane ergonomics for serious crawling workloads, especially queue semantics, retries, proxies, and debugging.
- [Inference] Oleriq's strongest near-term opportunity is not to imitate full crawler platforms. It is to combine low-friction extraction with stronger trust signals about what happened, why it failed, and what fallback path was used.

## Source Gaps

- [Verified] Public review pages were weak for this group in this pass. The most concrete signals came from GitHub and community threads instead.
- [Verified] `Apify Crawlee` community discussion often blends the library with the broader Apify platform, so some user pain is stack-level rather than library-only.
- [Verified] `Jina Reader` issue discovery was strongest from the public issues index and Hacker News mentions, not from broad forum coverage.
- [Unverified] I cannot verify this. There may be additional demand signals inside Discord or private support channels that are not publicly accessible.
