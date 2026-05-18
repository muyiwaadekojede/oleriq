# Group B Demand Notes

## Scope
- [Verified] Competitors covered: `crawl4ai`, `webclaw`, and `crw`.
- [Verified] Source priority used: GitHub issues/discussions, Reddit, and Product Hunt comments where public and accessible.
- [Verified] The target `docs/research/stage-3` path did not exist in this checkout before this run, so it was created to hold the two requested files.

## Top Signals By Competitor

### Crawl4AI
- [Verified] Extraction fidelity is a repeated pain point. Public GitHub issues call out broken heading hierarchy, broken table structure, and missing SPA wait controls in MCP.
- [Verified] Deployment reliability is also a live concern. A recent Reddit comparison thread describes Docker-based instability over time, not just first-run setup friction.
- [Verified] Feature demand is still expanding around visible-only extraction and browserless support, which points to users wanting tighter control over noisy or dynamic pages.
- [Inference] Clearpage should treat Markdown fidelity, dynamic-page controls, and long-run stability as table stakes if it wants to win agent and RAG workloads away from Crawl4AI.

### Webclaw
- [Verified] The clearest public demand signals are concrete workflow asks, not abstract roadmap debate. Users asked for `__NEXT_DATA__` or hydration-state extraction and deterministic per-page batch file output, and the maintainer shipped both quickly.
- [Verified] Migration friction matters. Reddit questions focus on Firecrawl-compatible endpoints and third-party proxy pool support rather than greenfield adoption.
- [Verified] Early praise clusters around agent ergonomics: replacing weak default fetch behavior, avoiding raw HTML, and saving time in research or scraping projects.
- [Inference] Clearpage can pressure Webclaw by matching practical workflow wins while presenting them in a more explicit product surface instead of discussion-thread discovery.

### CRW
- [Verified] Public user-visible demand is thinner than for Crawl4AI. I did not find public GitHub issues or discussions for `us/crw` in this pass.
- [Verified] The available signals cluster around lightweight deployment, low RAM use, and use as a Firecrawl alternative inside agent stacks.
- [Verified] Reddit mentions also show a workaround-style demand pattern: people looking for free or low-friction web search and scraping options for agent setups are being pointed to fastCRW.
- [Unverified] I cannot verify this. The public complaint volume for CRW is probably underexposed rather than absent, because the visible feedback surface is mostly launch and community comments.

## Source Gaps
- [Verified] `crawl4ai` had the strongest public evidence base because GitHub issues and discussions were active and accessible.
- [Verified] `webclaw` had public GitHub discussions but no public GitHub issues in the accessible repo surface at capture time.
- [Verified] `crw` had no public GitHub issues or discussions discovered in this pass, so the evidence base is weaker and more community-comment driven.
- [Verified] Hacker News did not produce useful accessible signal for this group in this pass.
