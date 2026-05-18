# Stage 3 Comparison Thread Demand Notes

## Scope

- [Verified] Research date: `2026-05-16`.
- [Verified] This is a checkpoint pass, not a full corpus pass.
- [Verified] This pass prioritizes concrete switching language, distrust signals, and "overhyped versus underdelivered" complaints across direct comparison surfaces.
- [Verified] Source types captured in the paired CSV are `buyer_evaluation_article`, `reddit_comparison`, `hacker_news_comparison`, and `issue_thread`.
- [Verified] Evidence rows captured in the paired CSV: `12`.
- [Verified] Comparison clusters covered in this pass are `firecrawl_vs_crawl4ai_vs_jina_reader`, `firecrawl_vs_webclaw_crw`, and `browser_agents_browser_use_vs_playwright_mcp`.

## Main Readout

- [Verified] The loudest switching axis is still managed convenience versus self-hosted control.
- [Verified] The loudest distrust axis is the gap between a good first demo and what happens on protected pages, in Docker, or across multi-step browser sessions.
- [Verified] The loudest "overhyped versus underdelivered" signal in the browser-agent lane is not that the tools never work. It is that they often need too many tool calls, too much context, or too much hidden setup before they become dependable.
- [Inference] Clearpage should read this category as a trust-and-boundary market, not only a markdown-quality market.

## Strongest Signals

- [Verified] `Ops burden and setup drag` is the densest cluster in this checkpoint with `4` rows. Firecrawl wins when buyers do not want to own browser orchestration, while Crawl4AI and CRW-style options appeal when buyers want lower recurring cost and more local control.
- [Verified] `Protected-page and browser-limit distrust` is the next strongest cluster with `4` rows. Public comparison threads repeatedly center on TLS fingerprinting, headless detection, JS-heavy pages, login/state limits, and the difference between a hosted claim and a self-hosted reality.
- [Verified] `Token or tool-sprawl friction` appears in `3` rows. Browser-agent evaluators keep pushing back when Playwright MCP or similar stacks need too many steps, lose session state, or burn context faster than direct scripts.
- [Verified] `Pricing predictability` appears in `1` direct row, but it is concrete. Firecrawl's non-rollover credits are explicit comparison friction even among users who otherwise prefer its reliability.

## Comparison Readout

### Firecrawl vs Crawl4AI vs Jina Reader

- [Verified] Buyer-evaluation articles split these tools by workload, not by a single winner.
- [Verified] Firecrawl is repeatedly chosen for managed crawling, browser handling, and lower operator overhead.
- [Verified] Crawl4AI is repeatedly chosen for local control and lower variable cost, but the checkpoint sources also show distrust around Docker, infra babysitting, and long-run stability.
- [Verified] Jina Reader is repeatedly framed as the easiest one-page read path, but it is also framed as out of scope once the workflow needs auth, multi-step browsing, or site-scale crawling.

### Firecrawl vs Webclaw and CRW

- [Verified] The public switching wedge against Firecrawl is mostly about protected-page coverage and the cost of escalating into Chrome-style browser work.
- [Verified] Webclaw comparison threads push a very specific migration story: keep a Firecrawl-like API shape, switch the base URL, and get better anti-bot behavior through TLS fingerprinting before browser escalation.
- [Verified] CRW's visible wedge in this checkpoint is narrower and more tactical: lightweight local deployment and lower memory usage than full Chrome-first stacks.
- [Inference] The practical comparison here is not "which markdown is prettier." It is "which path reaches protected pages without forcing expensive browser infrastructure too early."

### Browser Use and Playwright MCP

- [Verified] Comparison threads keep separating exploration from repeatable automation.
- [Verified] Playwright MCP is still treated as the more repeatable and debuggable path, but it is criticized for session loss, onboarding friction, and context-heavy tool use.
- [Verified] Browser Use and adjacent real-browser approaches attract interest when users need logged-in state or exploratory flows, but HN security pushback shows that CDP-based control over a real browser is a serious trust boundary, not a minor implementation detail.
- [Inference] Clearpage should treat any future browser-agent surface as an explicitly bounded fallback with visible state, not as a magical default mode.

## Clearpage-Relevant Implications

- [Inference] Clearpage should expose which path produced the result: static fetch, browser fallback, auth-required, blocked, or partial.
- [Inference] Clearpage should treat first-session trust as product surface. Public comparison threads repeatedly punish tools that look good in a demo and then become opaque under real workload pressure.
- [Inference] Clearpage should avoid broad "works on everything" language. The public demand signals in this checkpoint reward narrower but more legible claims.
- [Inference] Clearpage should keep operational burden low for the user while still surfacing enough evidence that failures are not silent.

## Source Gap

- [Inference] `WebPeel` remains thin in this checkpoint. I found much weaker independent comparison-thread evidence for it than for Firecrawl, Crawl4AI, Webclaw, CRW, Browser Use, or Playwright MCP, so I left it out of the normalized CSV instead of padding the file with vendor-led claims.
