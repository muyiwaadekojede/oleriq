# Stage 3 Demand Mining - Group C

- [Verified] Run date: `2026-05-16`.
- [Verified] Competitor group: `webpeel`, `scrapegraphai`, `browser-use`.
- [Verified] Source priority used in this pass: GitHub issues, GitHub discussions, Reddit, Hacker News.
- [Verified] This note tracks public demand signals only: feature requests, complaints, praise, and workaround signals.

## Main Readout

- [Verified] `browser-use` has the strongest visible public demand surface in this group.
- [Verified] Its highest-signal requests are about reliability on messy real UIs, deterministic replay after an exploratory agent run, infinite-loop control, and dependency friction inside larger Python stacks.
- [Verified] `scrapegraphai` demand is concentrated on hard web realities: bot protection, AJAX pagination, authenticated scraping, better debugging, and direct markdown-style export.
- [Verified] `webpeel` has a source gap in this pass rather than a visible public request backlog.
- [Inference] For Clearpage, Group C matters less as a pure "better markdown output" benchmark and more as a benchmark for control, observability, and browser-backed fallback when pages are dynamic or protected.

## Competitor Notes

### browser-use

- [Verified] GitHub issue `#4801` reports that the agent fails on an icon-only button when the visible label exists only in a tooltip, and the user says the agent can click the wrong nearby control instead.
- [Verified] GitHub issue `#4824` asks for looser dependency version ranges because exact pins create conflicts in larger Python projects and slow security or bug-fix upgrades.
- [Verified] GitHub discussion `#3856` asks for a way to capture stable selectors from an LLM-guided run so the expensive exploratory phase can be turned into deterministic Playwright automation.
- [Verified] The same discussion contains a user workaround: capture `selector_map`, parse Playwright traces, and then synthesize candidate selectors in a second pass because raw agent actions are not clean reusable locators.
- [Verified] GitHub discussion `#94` shows a looping failure mode and a request for prompt-level domain avoidance controls.
- [Verified] A Reddit thread about `browser-use` includes complaints that runs can get stuck on `about:blank`, take too long on basic tasks, and feel unclear to operate; one commenter says they built a Chrome extension plus REST server to make it "just work."
- [Inference] Clearpage should treat replayability, guardrails, and failure introspection as product expectations, not extras, when users move beyond one-off extraction.

### scrapegraphai

- [Verified] GitHub discussion `#1035` asks how to handle HTTP 503 bot-detection failures on sites like Amazon and Zillow.
- [Verified] GitHub discussion `#998` asks how to extract all products from AJAX-loaded pagination when the URL does not change.
- [Verified] GitHub discussion `#997` asks how to scrape a site that requires sign-in first; the documented workaround is to log in with Playwright and pass saved session state into ScrapeGraphAI.
- [Verified] GitHub issue `#1045` says verbose mode is not useful enough for diagnosing poor extraction and malformed JSON responses, and asks for a real debug-level view of LLM context and raw output.
- [Verified] GitHub discussion `#807` asks for direct markdown export from crawler output because the current path is not obvious.
- [Verified] GitHub org discussions also show recurring model-support and runtime-integration questions such as `deepseek support`, `Azure AI models`, and `asyncio.run() cannot be called from a running event loop`.
- [Inference] Clearpage should assume demand for dynamic-page handling, authenticated-session handoff, and debuggable extraction traces is real and ongoing.

### webpeel

- [Verified] The public GitHub repo showed `0` open issues during this pass.
- [Verified] The public GitHub discussions surface was empty during this pass.
- [Verified] I did not find a clear Reddit thread, Hacker News thread, or public review page with concrete user demand signals for `webpeel` in this pass.
- [Unverified] I cannot verify this. The lack of visible public demand signals may mean the product is early, the user community is elsewhere, or the public feedback surface is simply thin.
- [Inference] For Clearpage, `webpeel` is currently a weak demand-mining comparator because the public evidence surface is sparse.

## Cross-Competitor Signals That Matter

- [Verified] Reliability remains the loudest demand signal: loops, brittle targeting, anti-bot barriers, and dynamic-page edge cases show up more often than output-format praise.
- [Verified] Users want a bridge from agentic exploration to deterministic production automation.
- [Verified] Users care about authenticated and JavaScript-heavy pages, not only public static pages.
- [Verified] Debuggability matters: users ask for traceability into selectors, model context, raw model output, and failure reasons.
- [Verified] Workarounds often involve Playwright, browser state reuse, trace parsing, or wrapper tooling around the core product.

## Source Gaps

- [Verified] `webpeel` had the largest source gap in this pass.
- [Verified] `scrapegraphai` had usable GitHub demand signals, but few independent third-party user reviews were publicly visible in the prioritized sources used here.
- [Verified] `browser-use` had enough GitHub and Reddit surface to extract concrete demand themes without relying on marketing copy.
- [Inference] A later pass could expand into Discord, X, or Product Hunt only if those surfaces are publicly readable and can be captured concretely.