# Buyer Trust Readout

- [Verified] This readout is derived from the `259`-row Stage 3 corpus.
- [Inference] The profiles below are buyer-facing interpretations of the evidence mix, based on observed patterns, not confirmed mechanism.

## Cross-Market Pattern

- [Verified] The recurring buyer story is not just feature comparison. It is a trust journey: easy first demo, then a proof test on hard pages, hard docs, dynamic pages, or real budget limits.
- [Inference] Products win the first minute with simplicity and lose the second week with brittle truth, silent damage, or cost shock.

## Strongest Buyer Trust Risks

### firecrawl

- [Verified] Evidence rows: `29`
- [Verified] Buyer-trust profile: fast pitch but fragile second step, output-trust risk, cost-confidence risk
- [Verified] Cluster weights: `onboarding=4`, `pricing=4`, `output_trust=6`, `public_proof_risk=1`, `agent_setup=0`
- [Verified] Representative evidence: Self-hosted Firecrawl can become unresponsive in an anti-bot fallback loop instead of timing out cleanly.

### webclaw

- [Verified] Evidence rows: `23`
- [Verified] Buyer-trust profile: cost-confidence risk, low independent proof
- [Verified] Cluster weights: `onboarding=1`, `pricing=2`, `output_trust=5`, `public_proof_risk=9`, `agent_setup=2`
- [Verified] Representative evidence: A user asked Webclaw to expose `__NEXT_DATA__` or hydration-state data because important fields live in page state on SPA or Next.js pages.

### browser-use

- [Verified] Evidence rows: `20`
- [Verified] Buyer-trust profile: fast pitch but fragile second step, output-trust risk, cost-confidence risk
- [Verified] Cluster weights: `onboarding=3`, `pricing=2`, `output_trust=6`, `public_proof_risk=1`, `agent_setup=0`
- [Verified] Representative evidence: User reports that browser-use cannot reliably target an icon-only button and may click the wrong nearby control when the label is only exposed as a tooltip.

### crawl4ai

- [Verified] Evidence rows: `20`
- [Verified] Buyer-trust profile: fast pitch but fragile second step, output-trust risk
- [Verified] Cluster weights: `onboarding=3`, `pricing=0`, `output_trust=14`, `public_proof_risk=1`, `agent_setup=1`
- [Verified] Representative evidence: A user reported that Crawl4AI markdown export loses heading hierarchy and table structure.

### crw

- [Verified] Evidence rows: `17`
- [Verified] Buyer-trust profile: low independent proof
- [Verified] Cluster weights: `onboarding=1`, `pricing=1`, `output_trust=1`, `public_proof_risk=8`, `agent_setup=0`
- [Verified] Representative evidence: In a thread complaining that Tavily plus Firecrawl results were vague, unreliable, and noisy, a commenter recommended fastCRW as the fastest and lightest open-source scraper.

### jina-reader

- [Verified] Evidence rows: `17`
- [Verified] Buyer-trust profile: fast pitch but fragile second step, output-trust risk, cost-confidence risk
- [Verified] Cluster weights: `onboarding=3`, `pricing=2`, `output_trust=7`, `public_proof_risk=1`, `agent_setup=1`
- [Verified] Representative evidence: Users are reporting unexpectedly large token consumption on Jina Reader requests.

### scrapegraphai

- [Verified] Evidence rows: `14`
- [Verified] Buyer-trust profile: fast pitch but fragile second step
- [Verified] Cluster weights: `onboarding=3`, `pricing=0`, `output_trust=5`, `public_proof_risk=1`, `agent_setup=0`
- [Verified] Representative evidence: User asks how to bypass HTTP 503 bot-detection failures on sites like Amazon and Zillow.

### playwright-mcp

- [Verified] Evidence rows: `13`
- [Verified] Buyer-trust profile: agent-setup burden
- [Verified] Cluster weights: `onboarding=0`, `pricing=0`, `output_trust=0`, `public_proof_risk=0`, `agent_setup=8`
- [Verified] Representative evidence: User reports that large pages can produce roughly 50k-token MCP responses and fill the client context quickly.

### trafilatura

- [Verified] Evidence rows: `10`
- [Verified] Buyer-trust profile: output-trust risk
- [Verified] Cluster weights: `onboarding=0`, `pricing=0`, `output_trust=9`, `public_proof_risk=0`, `agent_setup=0`
- [Verified] Representative evidence: User worries about release stagnation, dependency drift, and unresolved security handling.

### webpeel

- [Verified] Evidence rows: `10`
- [Verified] Buyer-trust profile: low independent proof
- [Verified] Cluster weights: `onboarding=1`, `pricing=1`, `output_trust=0`, `public_proof_risk=8`, `agent_setup=0`
- [Verified] Representative evidence: No concrete public issue backlog was visible for WebPeel in the prioritized public sources used in this pass.

### browserpilot

- [Verified] Evidence rows: `9`
- [Verified] Buyer-trust profile: mixed or thin signal
- [Verified] Cluster weights: `onboarding=0`, `pricing=1`, `output_trust=3`, `public_proof_risk=0`, `agent_setup=0`
- [Verified] Representative evidence: Users want automatic pagination detection and full-site crawling instead of single-page extraction only.

### mozilla-readability

- [Verified] Evidence rows: `9`
- [Verified] Buyer-trust profile: output-trust risk
- [Verified] Cluster weights: `onboarding=0`, `pricing=0`, `output_trust=7`, `public_proof_risk=0`, `agent_setup=0`
- [Verified] Representative evidence: Reader extraction can omit large sections of some BBC articles.
