# Stage 3 Pain-Point Ledger

- [Verified] This ledger is generated from the `259`-row Stage 3 corpus in `painpoint-corpus-expanded.csv`.
- [Inference] The cluster labels below are evidence-organization buckets, based on observed patterns in the corpus, not confirmed mechanism.
- [Verified] The purpose is to make the corpus navigable by pain-point family instead of only by competitor or source file.

## Reliability Truthfulness

- [Verified] Relevance bucket: `today`
- [Verified] Evidence rows: `14`
- [Verified] Description: Jobs say they worked, but output is empty, partial, hanging, or brittle under normal pressure.
- [Verified] Top subjects: `scrapegraphai=3`, `crawl4ai=2`, `browser-use=2`, `webclaw=2`, `trafilatura=1`
- [Verified] Signal mix: `complaint=14`
- [Verified] Representative evidence:
- [Verified] `crawl4ai` via `reddit`: A commenter said Crawl4AI Docker setups broke on updates and started dropping requests randomly after weeks of use.
- [Verified] `browser-use` via `github_issue`: User reports that browser-use cannot reliably target an icon-only button and may click the wrong nearby control when the label is only exposed as a tooltip.
- [Verified] `scrapegraphai` via `github_discussion`: User asks how to bypass HTTP 503 bot-detection failures on sites like Amazon and Zillow.

## Dynamic Pages And Renderer Visibility

- [Verified] Relevance bucket: `today`
- [Verified] Evidence rows: `21`
- [Verified] Description: Users need clear behavior on JS-heavy pages, SPA waits, hydration, and browser-path truth.
- [Verified] Top subjects: `crawl4ai=5`, `browser-use=3`, `teracrawl=3`, `webclaw=2`, `firecrawl=2`
- [Verified] Signal mix: `complaint=13`, `feature_request=6`, `signal=1`, `workaround=1`
- [Verified] Representative evidence:
- [Verified] `jina-reader` via `github_issue`: Users report coverage gaps on JS-heavy pages.
- [Verified] `crawl4ai` via `github_issue`: A user reported that Crawl4AI MCP scrape tools do not expose the same SPA wait controls available in REST API and CLI flows.
- [Verified] `crawl4ai` via `github_discussion`: A user requested a visible-content-only extraction mode.

## Document Fidelity And Structure

- [Verified] Relevance bucket: `today`
- [Verified] Evidence rows: `51`
- [Verified] Description: Successful extraction still damages tables, headings, lists, code blocks, OCR layout, or document hierarchy.
- [Verified] Top subjects: `trafilatura=8`, `crawl4ai=7`, `mozilla-readability=6`, `jina-reader=5`, `firecrawl=4`
- [Verified] Signal mix: `complaint=33`, `feature_request=9`, `signal=6`, `praise=3`
- [Verified] Representative evidence:
- [Verified] `jina-reader` via `github_issue`: Some PDF links fail to parse correctly in Reader.
- [Verified] `jina-reader` via `hn_comment`: A Hacker News user praised the prefix-based workflow for quick Markdown conversion and noted the code can be self-hosted.
- [Verified] `crawl4ai` via `github_issue`: A user reported that Crawl4AI markdown export loses heading hierarchy and table structure.

## Debugging And Replay Visibility

- [Verified] Relevance bucket: `today`
- [Verified] Evidence rows: `15`
- [Verified] Description: Users want visible traces, queue truth, retry clarity, replay, selectors, and stronger debugging evidence.
- [Verified] Top subjects: `firecrawl=3`, `playwright-mcp=3`, `browser-use=2`, `batch_jobs_retries_and_observability=2`, `apify-crawlee=1`
- [Verified] Signal mix: `complaint=8`, `feature_request=5`, `praise=2`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `github_issue`: A crawl can report completed and successful while returning an empty data array.
- [Verified] `apify-crawlee` via `github_discussion`: A user asked for a way to move queued requests back into an unprocessed state.
- [Verified] `scrapegraphai` via `github_issue`: User says verbose mode is not enough to diagnose poor results on simple pages and asks for DEBUG-level visibility into model context and malformed JSON responses.

## Onboarding And Honeymoon Gap

- [Verified] Relevance bucket: `today`
- [Verified] Evidence rows: `22`
- [Verified] Description: The first demo is easy, but the first real workflow exposes setup friction or trust decay.
- [Verified] Top subjects: `firecrawl=4`, `jina-reader=3`, `crawl4ai=3`, `browser-use=3`, `scrapegraphai=3`
- [Verified] Signal mix: `complaint=13`, `praise=8`, `feature_request=1`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `product_hunt`: [Verified] Product Hunt presents Firecrawl as a one-call way to turn a URL into markdown or structured data, which explains its strong quick-trial appeal.
- [Verified] `firecrawl` via `github_issue`: [Verified] A self-hosted user reported that `/scrape` worked but `/extract` failed under the Docker-based local setup.
- [Verified] `firecrawl` via `github_issue`: [Verified] A user reported crawl jobs returning `completed` with an empty `data` array and no visible error.

## Structured Extraction And Schema Control

- [Verified] Relevance bucket: `soon`
- [Verified] Evidence rows: `7`
- [Verified] Description: Users want schema-safe JSON, visible-only extraction, table-aware parsing, and richer structured outputs.
- [Verified] Top subjects: `firecrawl=4`, `scrapegraphai=1`, `jina-reader=1`, `multilingual_docs=1`
- [Verified] Signal mix: `complaint=4`, `feature_request=2`, `praise=1`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `github_issue`: Self-hosted extract flows can fail when local-model schema output does not match expected object structure.
- [Verified] `firecrawl` via `product_hunt_review`: Reviewers say Firecrawl reliably turns messy web pages into useful structured data and saves hours that would otherwise go into manual research or brittle scraping.
- [Verified] `scrapegraphai` via `product_hunt_comment`: Public launch questions focus on whether the tool can handle multiple pages, JavaScript-driven pagination, and schema control instead of only one-page prompt extraction.

## Pricing And Token Predictability

- [Verified] Relevance bucket: `soon`
- [Verified] Evidence rows: `15`
- [Verified] Description: Credit shape, token spikes, and unclear recurring cost weaken buying confidence.
- [Verified] Top subjects: `firecrawl=4`, `jina-reader=2`, `browser-use=2`, `webclaw=2`, `browserpilot=1`
- [Verified] Signal mix: `complaint=10`, `praise=4`, `feature_request=1`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `reddit_post`: A user said Firecrawl handled harder sites but became too expensive for recurring product-price scraping.
- [Verified] `jina-reader` via `github_issue`: Users are reporting unexpectedly large token consumption on Jina Reader requests.
- [Verified] `browser-use` via `github_discussion`: User reports repeated loops and also asks how to prevent visits to unwanted domains such as Yelp.

## Batch And Job Control

- [Verified] Relevance bucket: `soon`
- [Verified] Evidence rows: `4`
- [Verified] Description: Users need deterministic filenames, reruns, queue state, and predictable long-job control.
- [Verified] Top subjects: `apify-crawlee=2`, `trafilatura=1`, `firecrawl_vs_crawl4ai=1`
- [Verified] Signal mix: `complaint=3`, `workaround_signal=1`
- [Verified] Representative evidence:
- [Verified] `apify-crawlee` via `github_issue`: Large crawls can slow badly near completion because the queue keeps scanning massive numbers of already-done requests.
- [Verified] `apify-crawlee` via `github_discussion`: A user needed failedRequestHandler errors to reach the main execution flow, and the accepted path required custom promise rejection plumbing.
- [Verified] `trafilatura` via `github_issue`: Concurrent extract calls can intermittently crash the Python process with segmentation faults.

## Agent Packaging And Mcp Setup

- [Verified] Relevance bucket: `soon`
- [Verified] Evidence rows: `21`
- [Verified] Description: Local-hosting clarity, MCP transport stability, setup completeness, and agent-readable packaging matter.
- [Verified] Top subjects: `playwright-mcp=8`, `crawl4ai-mcp=5`, `crawl4ai-mcp-server=3`, `webclaw=2`, `jina-reader=1`
- [Verified] Signal mix: `complaint=18`, `feature_request=2`, `praise=1`
- [Verified] Representative evidence:
- [Verified] `jina-reader` via `github_issue`: Users want better documentation packaging and an llms.txt entry point for agent discovery.
- [Verified] `crawl4ai` via `github_issue`: A user reported extra escaping in MCP output that inflates token usage for CJK content.
- [Verified] `webclaw` via `reddit`: A commenter said Webclaw fixes Claude's weak fetch and is worth testing for autonomous research bots.

## Authenticated Extraction And Session State

- [Verified] Relevance bucket: `later`
- [Verified] Evidence rows: `13`
- [Verified] Description: Login flows, cookies, profiles, and persisted browser state remain fragile.
- [Verified] Top subjects: `authenticated_pages_and_session_reuse=3`, `firecrawl=2`, `browser-use=2`, `playwright-mcp=2`, `scrapegraphai=1`
- [Verified] Signal mix: `complaint=6`, `feature_request=3`, `signal=2`, `workaround=1`, `praise=1`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `github_issue`: Users want screenshot output without cookie banners or privacy popups covering key content.
- [Verified] `scrapegraphai` via `github_discussion`: User asks how to scrape pages behind login; the recommended workaround is to log in with Playwright and pass saved session state into ScrapeGraphAI.
- [Verified] `browser-use` via `product_hunt_review`: A reviewer says Browser Use was easy to integrate for login-required browsing through the user's real browser.

## Anti Bot And Protected Site Pressure

- [Verified] Relevance bucket: `later`
- [Verified] Evidence rows: `22`
- [Verified] Description: Cloudflare, fingerprinting, proxies, and hostile pages push tools into failure or expensive fallback.
- [Verified] Top subjects: `firecrawl=4`, `webclaw=3`, `teracrawl=3`, `jina-reader=2`, `browserpilot=2`
- [Verified] Signal mix: `complaint=16`, `feature_request=3`, `praise=2`, `signal=1`
- [Verified] Representative evidence:
- [Verified] `firecrawl` via `github_issue`: Self-hosted Firecrawl can become unresponsive in an anti-bot fallback loop instead of timing out cleanly.
- [Verified] `jina-reader` via `hn_comment`: A Hacker News user said Jina Reader does most jobs well but still fails on some Cloudflare-protected sites.
- [Verified] `apify-crawlee` via `github_discussion`: A user struggled to verify proxy usage, understand retries and sessions, and debug repeated 403s despite proxy setup.

## Deep Research And Enrichment

- [Verified] Relevance bucket: `later`
- [Verified] Evidence rows: `1`
- [Verified] Description: Users want multi-step search, map, browse, and enrichment after the first scrape works.
- [Verified] Top subjects: `scrapegraphai=1`
- [Verified] Signal mix: `praise=1`
- [Verified] Representative evidence:
- [Verified] `scrapegraphai` via `product_hunt_review`: The Product Hunt page shows a positive review footprint and frames ScrapeGraphAI as fast enough for structured extraction use cases like lead enrichment and KYB automation.

## Thin Signal Market Uncertainty

- [Verified] Relevance bucket: `market_watch`
- [Verified] Evidence rows: `34`
- [Verified] Description: Some competitors show polished official surfaces but weak public complaint depth, creating uncertainty.
- [Verified] Top subjects: `webclaw=9`, `webpeel=8`, `crw=8`, `webustler=2`, `crawl4ai-mcp-server=1`
- [Verified] Signal mix: `source_gap=18`, `signal=16`
- [Verified] Representative evidence:
- [Verified] `webpeel` via `github_issues_index`: No concrete public issue backlog was visible for WebPeel in the prioritized public sources used in this pass.
- [Verified] `webustler` via `github_repo`: The public repo showed only two open items during this pass, and both were pull requests rather than user-reported issues.
- [Verified] `webustler` via `public_web`: No clear Reddit thread, Hacker News thread, or active public discussion surface with concrete user pain points was visible in this pass.

## Other

- [Verified] Relevance bucket: `unbucketed`
- [Verified] Evidence rows: `19`
- [Verified] Description: Signals that do not fit the main buckets cleanly.
- [Verified] Top subjects: `crw=6`, `browserpilot=3`, `browser-use=2`, `mozilla-readability=2`, `teracrawl=2`
- [Verified] Signal mix: `praise=9`, `feature_request=5`, `workaround=3`, `signal=2`
- [Verified] Representative evidence:
- [Verified] `crw` via `reddit`: In a thread complaining that Tavily plus Firecrawl results were vague, unreliable, and noisy, a commenter recommended fastCRW as the fastest and lightest open-source scraper.
- [Verified] `crw` via `reddit`: In a thread asking for free or low-friction web search, a commenter recommended fastCRW for scraping because of its 6 MB binary and cloud search support.
- [Verified] `crw` via `product_hunt_comment`: A Product Hunt commenter said they were deploying fastCRW alongside Docker instances because it was lightweight and easy to deploy.
