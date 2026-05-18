# Stage 3 Demand Mining - Browser Agents And Dynamic Web Extraction

- [Verified] Run date: `2026-05-16`.
- [Verified] Output files in this pass: `browser-agent-demand-notes.md` and `browser-agent-demand-evidence.csv`.
- [Verified] Covered products and repos: `browser-use`, `playwright-mcp`, `crawl4ai`, `crawl4ai-mcp-server`, `firecrawl`, `browserpilot`, `teracrawl`, `webclaw`.
- [Verified] Source types used: GitHub issues, GitHub discussions, public docs/README pages, Reddit threads, and Hacker News threads.
- [Verified] Evidence rows captured in the CSV: `39`.

## Main Readout

- [Verified] The loudest repeated pain is not plain extraction quality. It is control failure once the target page needs browser state: auth, waits, anti-bot handling, session persistence, or human-visible debugging.
- [Verified] MCP and browser-agent wrappers repeatedly surface transport and context costs: token blowups, session resets, missing setup steps, stdout pollution, and self-host startup failures.
- [Verified] Authenticated scraping is still mostly solved through browser-state reuse rather than elegant first-class flows. Users keep reaching for cookies, storage-state files, existing browser profiles, or local real-browser sessions.
- [Verified] SPA timing remains a practical failure mode. Users ask for explicit `wait_until`-style controls, higher-quality waits, or deeper browser fallbacks when default extraction returns blank, partial, or unstable output.
- [Verified] Anti-bot pressure keeps splitting products into two tiers: cheap local/static paths and more expensive browser-backed or cloud-backed fallback paths for protected pages.
- [Verified] Replay and debug visibility matter because users do not trust a browser agent that fails silently, clicks the wrong thing invisibly, or cannot replay the run afterward.

## Strongest Signals

- [Verified] Scope counts from the CSV are: `mcp-agent-control=13`, `bot-blocking=10`, `browser-automation=6`, `replay-debug-visibility=4`, `authenticated-scraping=3`, and `spa-timing=3`.
- [Verified] `mcp-agent-control` is the densest scope in this pass. The repeated complaints are token overhead, fragile session lifecycle, setup friction, transport breakage, and weaker MCP control surfaces than the underlying browser stack.
- [Verified] `bot-blocking` is the next strongest scope. Users repeatedly describe headless detection, browser fingerprinting, proxy requirements, and forced escalation from local or self-hosted paths into managed browser infrastructure.
- [Verified] `browser-automation` is the third-largest scope and mostly shows up as loop behavior, blank-page behavior, multi-page crawl demand, and the broader push to route easy pages away from full browser agents.
- [Verified] `replay-debug-visibility` shows up as an adoption gate, not a nice-to-have. Missing highlighters, broken history replay, screenshot ambiguity, and unclear local-versus-cloud boundaries all reduce trust.
- [Verified] `authenticated-scraping` and `spa-timing` have fewer rows, but both themes recur across multiple products: users keep reaching for cookies or saved browser state for auth and explicit waits or better controls for SPAs.

## Product Notes

### playwright-mcp

- [Verified] Users repeatedly call out context and token overhead on large pages.
- [Verified] Session persistence is still an active pain point through storage-state requests and browser sessions that can die between tool calls.
- [Verified] Operators also ask for better visibility and safer defaults because accessibility snapshots expose both debugging value and prompt-injection risk.

### browser-use

- [Verified] Public issues show real-browser value colliding with reliability problems: infinite loops, blank-page failures, broken replay history, and login-profile timeouts.
- [Verified] The authenticated-browser story is attractive, but persistence and browser-control edge cases still fail on real sites.

### crawl4ai and crawl4ai-mcp

- [Verified] The MCP layer amplifies transport discipline problems quickly. Stdout logging, weak SPA controls, and token-heavy escaping all become user-facing failures.
- [Verified] The exact `crawl4ai-mcp-server` repo is still visibly early, with production-readiness, client-compatibility, and local-hosting questions still open in public.

### firecrawl

- [Verified] Firecrawl clearly serves the "harder than static HTML" job, but the public evidence still shows manual cookie forwarding for auth, manual wait tuning for JS, anti-bot detection differences, and self-host operational drag.
- [Verified] Screenshot and session-debug UX still matter because browser-backed scraping without clear evidence makes failures hard to interpret.

### browserpilot, teracrawl, and webclaw

- [Verified] These products collectively show where user demand goes after static extraction fails: pagination, full-site crawling, proxy control, anti-bot bypass, and more explicit local-versus-cloud fallback stories.
- [Verified] They also show the tradeoff clearly: better protected-site coverage usually adds dependencies, remote browsers, or hosted infrastructure.

## Clearpage-Relevant Direction

- [Inference] Clearpage should not treat "browser mode" as a generic upgrade over static extraction. It should be an explicit escalation path with clear costs, clear limits, and evidence about why escalation happened.
- [Inference] Clearpage should expose state transitions plainly: static success, auth-required, wait-required, blocked, browser-escalated, partial, or failed.
- [Inference] Clearpage should preserve operator trust with replay-grade evidence such as screenshots, action traces, and failure reasons whenever browser control is involved.
- [Inference] Clearpage should separate cheap extraction from expensive browser work so users do not pay browser costs on pages that are still solvable through fast static methods.
- [Inference] Clearpage should make session handling first-class if it wants authenticated scraping to be credible: cookies, storage state, profile reuse, and safe renewal all matter.
