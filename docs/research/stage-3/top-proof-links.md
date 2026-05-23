# Top Proof Links

- [Verified] This file pulls representative evidence from the `259`-row Stage 3 corpus.
- [Inference] The selections below are manually curated for representativeness, based on observed patterns, not confirmed mechanism.

## Document Fidelity And Structure

- [Verified] Recommended horizon: `solve_now`
- [Verified] Why this cluster matters: Oleriq already promises clean, exportable documents and batch document conversion, so fidelity failures hit the current product promise directly.
- [Verified] `crawl4ai` via `github_issue`: A user reported that Crawl4AI markdown export loses heading hierarchy and table structure. Source: https://github.com/unclecode/crawl4ai/issues/1964
- [Verified] `trafilatura` via `github_issue`: The issue tracker includes an open report that structured heading tags such as `h2` and `h3` fail to extract correctly. Source: https://github.com/adbar/trafilatura/issues/777
- [Verified] `mozilla-readability` via `github_issue`: The issue tracker includes an open report that GitHub issue pages are not processed properly by Readability. Source: https://github.com/mozilla/readability/issues/977
- [Verified] `jina-reader` via `github_issue`: Some PDF links fail to parse correctly in Reader. Source: https://github.com/jina-ai/reader/issues/1170

## Onboarding And Honeymoon Gap

- [Verified] Recommended horizon: `solve_now`
- [Verified] Why this cluster matters: Oleriq competes in a fast-first-success category where trust can collapse on the first real edge case.
- [Verified] `firecrawl` via `github_issue`: A self-hosted user reported that `/scrape` worked but `/extract` failed under the Docker-based local setup. Source: https://github.com/firecrawl/firecrawl/issues/1294
- [Verified] `firecrawl` via `github_issue`: A user reported crawl jobs returning `completed` with an empty `data` array and no visible error. Source: https://github.com/firecrawl/firecrawl/issues/1309
- [Verified] `jina-reader` via `github_issue`: A GitHub user said the docs are lacking, the interactive builder is buggy, and the response shape is hard to understand. Source: https://github.com/jina-ai/reader/issues/1224
- [Verified] `crawl4ai` via `reddit`: A Reddit user said Docker setup took about an hour, needs meaningful RAM, and turns into infrastructure debugging when things break. Source: https://www.reddit.com/r/AgentsOfAI/comments/1t3pe4e/firecrawl_vs_crawl4ai_i_tried_both_and_heres_what/

## Dynamic Pages And Renderer Visibility

- [Verified] Recommended horizon: `solve_now`
- [Verified] Why this cluster matters: Dynamic-page truth is adjacent to the current URL extraction promise and will matter quickly as users test harder pages.
- [Verified] `crawl4ai` via `github_issue`: A user reported that Crawl4AI MCP scrape tools do not expose the same SPA wait controls available in REST API and CLI flows. Source: https://github.com/unclecode/crawl4ai/issues/1963
- [Verified] `jina-reader` via `github_issue`: Users report coverage gaps on JS-heavy pages. Source: https://github.com/jina-ai/reader/issues/1148
- [Verified] `webclaw` via `github_discussion`: A user asked Webclaw to expose `__NEXT_DATA__` or hydration-state data because important fields live in page state on SPA or Next.js pages. Source: https://github.com/0xMassi/webclaw/discussions/13
- [Verified] `scrapegraphai` via `github_discussion`: User asks how to extract all items when products load through AJAX and the base URL never changes. Source: https://github.com/orgs/ScrapeGraphAI/discussions/998

## Reliability Truthfulness

- [Verified] Recommended horizon: `solve_now`
- [Verified] Why this cluster matters: Oleriq already exposes extraction failures and batch jobs, so honest status and non-empty output are immediate trust requirements.
- [Verified] `firecrawl` via `github_issue`: A crawl can report `completed` and successful while returning an empty data array. Source: https://github.com/firecrawl/firecrawl/issues/1309
- [Verified] `firecrawl` via `github_issue`: Self-hosted Firecrawl can become unresponsive in an anti-bot fallback loop instead of timing out cleanly. Source: https://github.com/firecrawl/firecrawl/issues/2350
- [Verified] `browser-use` via `github_issue`: Browser Use can enter an infinite loop when a CDP connection is lost and the browser closes. Source: https://github.com/browser-use/browser-use/issues/1275
- [Verified] `crawl4ai` via `reddit`: A commenter said Crawl4AI Docker setups broke on updates and started dropping requests randomly after weeks of use. Source: https://www.reddit.com/r/AgentsOfAI/comments/1t3pe4e/firecrawl_vs_crawl4ai_i_tried_both_and_heres_what/

## Debugging And Replay Visibility

- [Verified] Recommended horizon: `solve_now`
- [Verified] Why this cluster matters: Oleriq already has extraction and batch flows, so better failure explanation can improve trust without changing product category.
- [Verified] `scrapegraphai` via `github_issue`: User says verbose mode is not enough to diagnose poor results on simple pages and asks for DEBUG-level visibility into model context and malformed JSON responses. Source: https://github.com/ScrapeGraphAI/Scrapegraph-ai/issues/1045
- [Verified] `playwright-mcp` via `github_issue`: Users ask for a visible highlighter during tracing and clicking so they can see what the agent is targeting. Source: https://github.com/microsoft/playwright-mcp/issues/492
- [Verified] `browser-use` via `github_issue`: History replay can fail because initial actions are missing and serialized data is incomplete. Source: https://github.com/browser-use/browser-use/issues/3044
- [Verified] `apify-crawlee` via `github_discussion`: A user asked for a way to move queued requests back into an unprocessed state. Source: https://github.com/apify/crawlee/discussions/1232

## Pricing And Token Predictability

- [Verified] Recommended horizon: `solve_soon`
- [Verified] Why this cluster matters: Important for packaging and economics, but not the first product truth gap in the current UI.
- [Verified] `jina-reader` via `github_issue`: A production user reported single `s.jina.ai` requests spiking to about `1.9M` tokens and averaging far above the expected floor. Source: https://github.com/jina-ai/reader/issues/1241
- [Verified] `firecrawl` via `reddit_post`: A user said Firecrawl handled harder sites but became too expensive for recurring product-price scraping. Source: https://www.reddit.com/r/scrapingtheweb/comments/1qh8oap/firecrawl_or_custom_web_scraping/
- [Verified] `firecrawl` via `reddit`: An `r/n8n` user said unused monthly credits vanish and the API key effectively feels like a retainer. Source: https://www.reddit.com/r/n8n/comments/1q4eccq/any_payasyougo_scrapers_that_dont_expire_credits/
- [Verified] `playwright-mcp` via `github_issue`: Large pages can produce roughly `50k`-token MCP responses and fill the client context quickly. Source: https://github.com/microsoft/playwright-mcp/issues/1040

## Agent Packaging And Mcp Setup

- [Verified] Recommended horizon: `later_if_agent_surface_expands`
- [Verified] Why this cluster matters: Important only if Oleriq deliberately expands into agent-native surfaces.
- [Verified] `playwright-mcp` via `github_issue`: User reports that large pages can produce roughly `50k`-token MCP responses and fill the client context quickly. Source: https://github.com/microsoft/playwright-mcp/issues/1040
- [Verified] `playwright-mcp` via `github_issue`: Getting-started docs were reported to miss prerequisite browser-install steps. Source: https://github.com/microsoft/playwright-mcp/issues/1113
- [Verified] `jina-reader` via `github_issue`: Users want better documentation packaging and an `llms.txt` entry point for agent discovery. Source: https://github.com/jina-ai/reader/issues/1224
- [Verified] `crawl4ai-mcp` via `github_issue`: A public issue asks how to use `crawl4ai-mcp-server` with Claude Desktop. Source: https://github.com/BjornMelin/crawl4ai-mcp-server/issues/19

## Anti Bot And Protected Site Pressure

- [Verified] Recommended horizon: `later_or_partnered`
- [Verified] Why this cluster matters: High demand exists, but this expands scope and infrastructure burden beyond the current core promise.
- [Verified] `firecrawl` via `github_issue`: Self-hosted Firecrawl can become unresponsive in an anti-bot fallback loop instead of timing out cleanly. Source: https://github.com/firecrawl/firecrawl/issues/2350
- [Verified] `apify-crawlee` via `github_discussion`: A user struggled to verify proxy usage, understand retries and sessions, and debug repeated `403`s despite proxy setup. Source: https://github.com/apify/crawlee-python/discussions/575
- [Verified] `webclaw` via `reddit`: A commenter asked whether Webclaw was a drop-in Firecrawl replacement and whether it supported third-party proxy pools. Source: https://www.reddit.com/r/mcp/comments/1s29yn8/webclaw_mcp_server_10_tools_for_web_extraction/
- [Verified] `jina-reader` via `hn_comment`: A Hacker News user said Jina Reader does most jobs well but still fails on some Cloudflare-protected sites. Source: https://news.ycombinator.com/item?id=42094064

## Batch And Job Control

- [Verified] Recommended horizon: `solve_soon`
- [Verified] Why this cluster matters: Oleriq already has a real batch surface, so deterministic job control is close to the current architecture.
- [Verified] `apify-crawlee` via `github_issue`: Large crawls can slow badly near completion because the queue keeps scanning massive numbers of already-done requests. Source: https://github.com/apify/crawlee/issues/2406
- [Verified] `apify-crawlee` via `github_discussion`: A user needed failedRequestHandler errors to reach the main execution flow, and the accepted path required custom promise rejection plumbing. Source: https://github.com/apify/crawlee/discussions/1233
- [Verified] `webclaw` via `github_discussion`: A user asked for deterministic per-page files in batch mode, including custom filenames. Source: https://github.com/0xMassi/webclaw/discussions/2
- [Verified] `trafilatura` via `github_issue`: Concurrent extract calls can intermittently crash the Python process with segmentation faults. Source: https://github.com/adbar/trafilatura/issues/840

## Structured Extraction And Schema Control

- [Verified] Recommended horizon: `solve_soon`
- [Verified] Why this cluster matters: This is a credible next-step expansion once core extraction trust is stronger.
- [Verified] `firecrawl` via `github_issue`: Self-hosted extract flows can fail when local-model schema output does not match expected object structure. Source: https://github.com/firecrawl/firecrawl/issues/1294
- [Verified] `scrapegraphai` via `product_hunt_comment`: Public launch questions focus on whether the tool can handle multiple pages, JavaScript-driven pagination, and schema control instead of only one-page prompt extraction. Source: https://www.producthunt.com/products/scrapegraphai
- [Verified] `jina-reader` via `github_readme`: Jina's MCP server exposes a dedicated `extract_pdf` tool for figures, tables, and equations beyond plain read-to-markdown. Source: https://github.com/jina-ai/MCP
- [Verified] `crawl4ai` via `github_discussion`: A user requested a visible-content-only extraction mode. Source: https://github.com/unclecode/crawl4ai/discussions/108
