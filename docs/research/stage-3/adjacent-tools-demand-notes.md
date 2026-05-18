# Stage 3 Demand Mining - Adjacent Tools

- [Verified] Run date: `2026-05-16`.
- [Verified] Competitor group: `playwright-mcp`, `trafilatura`, `mozilla-readability`, `webustler`, `crawl4ai-mcp-server`, `teracrawl`, `browserpilot`.
- [Verified] Source priority used in this pass: GitHub issues and discussions, Reddit, Hacker News, public docs, and public community pages.
- [Verified] This note tracks public demand signals only: feature requests, complaints, praise, workaround signals, and explicit source gaps.

## Main Readout

- [Verified] `playwright-mcp` has the strongest pain-point surface in this pass, and the loudest complaints are token or context overhead, setup friction, missing operator visibility, and snapshot-security concerns.
- [Verified] `trafilatura` and `mozilla-readability` show a mature but persistent extraction-quality pattern: users praise clean article extraction, then file bugs when markdown structure, headings, images, or full article bodies are lost.
- [Verified] `crawl4ai-mcp-server` and `teracrawl` cluster around integration reality rather than pure extraction quality: MCP transport stability, SPA waiting behavior, local-hosting expectations, dependency sprawl, and browser-backed deployment tradeoffs.
- [Verified] `browserpilot` demand is feature-led rather than complaint-led in the public surface I found: pagination, full-site crawling, proxies, and broader model support dominate.
- [Verified] `webustler` has the weakest public evidence surface in this pass.
- [Inference] For Clearpage, the adjacent-tool lesson is not just “extract better markdown.” It is “reduce setup burden, preserve structure, expose failure evidence, and offer an honest browser-backed path for dynamic or protected pages.”

## Competitor Notes

### playwright-mcp

- [Verified] GitHub issue `#1040` says large pages can push MCP responses to roughly `50k` tokens and fill the client context quickly.
- [Verified] A Reddit thread titled `Playwright MCP performance issue` repeats the same complaint in user language: it "consumes lots of token" and can hit rate limits because too much page structure is sent back to the model.
- [Verified] The official README now says coding agents may benefit more from `Playwright CLI + SKILLS` because it is more token-efficient than MCP.
- [Verified] GitHub issue `#1113` says the getting-started docs skip prerequisite browser-install steps, which leaves new users with setup failures even when the config looks correct.
- [Verified] GitHub issue `#492` asks for a visual highlighter during tracing and clicking because the operator otherwise cannot easily see what the agent is acting on.
- [Verified] GitHub issue `#1479` flags indirect prompt-injection risk through accessibility snapshots, which matters because MCP returns page structure directly into the LLM context.
- [Verified] A Reddit thread titled `If you haven't already, learn Playwright MCP` is strongly positive about test generation and page-aware debugging, so the pain is not lack of value; it is cost, reliability, and control.
- [Inference] Clearpage should treat browser-backed automation as valuable but expensive, and should keep the browser path narrow, observable, and optional rather than the default for every extraction job.

### trafilatura

- [Verified] GitHub issue `#846` asks `Is this project dead?` and cites release stagnation, dependency drift, and unresolved security handling as the core concern.
- [Verified] GitHub issue `#845` reports malformed markdown where spaces disappear around inline formatting inside list items.
- [Verified] GitHub issue `#840` reports intermittent segmentation faults during concurrent `extract()` calls, which raises trust concerns for batch or threaded workloads.
- [Verified] GitHub issue `#842` says keeping images enabled can break parsing and produce unstable markdown output.
- [Verified] A Hacker News thread about `Defuddle` includes a direct comparison that says the Python `trafilatura` library gave the `best quality content` with `accurate meta data` for that user.
- [Inference] Clearpage can use this pattern directly: users reward extraction quality, but they stop trusting a parser when concurrency, markdown fidelity, or media-preservation edge cases break in production.

### mozilla-readability

- [Verified] GitHub issue `#1005` reports that some BBC articles lose large sections of the article body in reader extraction.
- [Verified] Pull request `#1006` asks for an option to keep original title headers because current reader-mode normalization can reduce extraction accuracy for downstream uses.
- [Verified] GitHub issue `#1002` asks for a way to disable or raise the maximum title-length trimming.
- [Verified] A Hacker News thread about `Rdrview` praises `mozilla/readability` for consistent primary-content extraction and minimal semantic mangling versus several alternatives.
- [Verified] A Hacker News thread about `2markdown` says `Readability` works well on article or blog pages but fails badly on structured pages such as API documentation.
- [Inference] Clearpage should not assume one parser can cover both article-style pages and structured documentation equally well.

### webustler

- [Verified] The public README positions `webustler` around a very specific pain point: Cloudflare-protected sites, self-hosting, and clean markdown without per-request API charges.
- [Verified] The public GitHub repo showed only `2` open items during this pass, and both were pull requests rather than user-reported issues.
- [Verified] I did not find a clear public Reddit thread, Hacker News thread, or active GitHub discussion surface with concrete user pain points for `webustler` in this pass.
- [Unverified] I cannot verify this. The thin public surface may mean the tool is early, the users are elsewhere, or the product has not yet attracted enough public troubleshooting volume.
- [Inference] `webustler` is currently more useful as a positioning comparator than as a reliable demand-mining comparator.

### crawl4ai-mcp-server

- [Verified] The standalone `crawl4ai-mcp-server` README says the MCP server is `under development` and `not ready for production use`.
- [Verified] Standalone GitHub issue `#19` asks how to use it with Claude Desktop, which signals adoption interest but also onboarding friction.
- [Verified] Standalone GitHub issue `#15` asks for a local `npx/Node` hosting option instead of remote-only deployment.
- [Verified] The exact `crawl4ai-mcp-server` public signal is thin, so I used the broader Crawl4AI MCP issue surface as adjacent evidence for the same user job.
- [Verified] Crawl4AI issue `#1968` says logger output on `stdout` breaks MCP stdio transport.
- [Verified] Crawl4AI issue `#1963` says MCP scrape tools lack the `wait_until` and SPA-friendly controls available in the REST API and CLI.
- [Verified] Crawl4AI issue `#1964` says markdown export can lose heading hierarchy and table structure.
- [Verified] Crawl4AI issue `#1962` says escaped non-ASCII output causes major token overhead for CJK content.
- [Inference] Clearpage should assume that MCP wrappers inherit core crawler pain points quickly, especially around transport discipline, dynamic-page waiting, and markdown fidelity.

### teracrawl

- [Verified] Teracrawl's README says `/crawl` requires a separate running `browser-serp` instance, and the product is powered by `Browser.cash` remote browsers.
- [Verified] GitHub issue `#1` asks whether an existing `SearXNG` instance can replace `browser-serp`, which is a direct request to reduce dependency lock-in.
- [Verified] A Reddit thread about Firecrawl being blocked by headlessness recommends `Teracrawl` specifically because it runs on top of a headful Chrome browser API.
- [Verified] A public analysis page on Starlog says you cannot run Teracrawl without a `Browser.cash API key`, which frames the main tradeoff as better scraping coverage versus external-service dependence.
- [Inference] Clearpage should expect users to value anti-bot success, but they will still push back if that success requires too many moving parts or a mandatory hosted dependency.

### browserpilot

- [Verified] The public `BrowserPilot` signal is fragmented across an older `handrew/browserpilot` project and a newer `ai-naymul/BrowserPilot` repo, so I treated this as brand-level adjacent demand rather than one continuous backlog.
- [Verified] The newer GitHub repo has open feature requests for `pagination + full-site crawling` in issue `#25` and `universal proxy support` in issue `#24`.
- [Verified] The same repo has open requests for broader model compatibility through `OpenRouter/multi model support` in issue `#22` and `local model support` in issue `#16`.
- [Verified] The older `handrew/browserpilot` repo also has demand for broader model support in issue `#16` and browser compatibility in issue `#19`.
- [Verified] The older repo has a public code-injection vulnerability report in issue `#21`, which adds a security-trust concern to the automation story.
- [Verified] The Hacker News launch thread for `BrowserPilot: Natural language browser automation` is positive about the plain-English automation idea, which confirms baseline appeal even if the recent public surface is more feature-led than review-led.
- [Inference] Clearpage should read BrowserPilot demand as a sign that users want one tool to span search, browsing, extraction, and export, but those users quickly ask for crawling depth, proxy control, model choice, and safer execution.

## Cross-Competitor Signals That Matter

- [Verified] Token and context efficiency matter whenever a browser or MCP loop is in the path.
- [Verified] Users care about setup friction more than marketing copy suggests: browser binaries, local hosting, client compatibility, and transport correctness show up repeatedly.
- [Verified] Markdown quality is still a live pain point even in mature extractors.
- [Verified] Structured pages, SPAs, authenticated pages, and protected sites remain the practical edge cases that separate demos from production tools.
- [Verified] Users want better observability: visual feedback, debug detail, raw evidence, and explicit failure reasons.
- [Verified] Dependency sprawl and lock-in become demand signals when a tool needs extra services, remote browsers, or tightly coupled deployment paths.

## Source Gaps

- [Verified] `webustler` had the largest source gap in this pass.
- [Verified] `crawl4ai-mcp-server` had a thin exact-repo signal, so some evidence came from the broader Crawl4AI MCP issue surface.
- [Verified] `teracrawl` had useful docs and one direct GitHub issue, but relatively little independent public troubleshooting volume.
- [Verified] `browserpilot` public demand is fragmented across separate repos and launches rather than one mature issue surface.
- [Verified] `trafilatura` and `mozilla-readability` had strong GitHub evidence but comparatively less recent Reddit discussion in the prioritized sources used here.
