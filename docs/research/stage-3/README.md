# Stage 3 Demand And Complaint Mining

## Scope

- [Verified] Research date: `2026-05-16`.
- [Verified] This stage now covers a broader public pain-point corpus, not only the verified direct cohort.
- [Verified] Covered surfaces in this expanded pass:
- [Verified] Direct competitors: `firecrawl`, `jina-reader`, `apify-crawlee`, `crawl4ai`, `webclaw`, `crw`, `scrapegraphai`, `browser-use`, `webpeel`
- [Verified] Adjacent or enabling tools: `playwright-mcp`, `trafilatura`, `mozilla-readability`, `webustler`, `crawl4ai-mcp-server`, `teracrawl`, `browserpilot`
- [Verified] Generic domain pain points related to Oleriq’s present or plausible future surface
- [Verified] This stage still does not synthesize a final feature roadmap. It stops at evidence collection, clustering, taxonomy, and Oleriq implications.

## Artifacts

- [Verified] Expanded merged corpus: `docs/research/stage-3/painpoint-corpus-expanded.csv`
- [Verified] Direct-cohort evidence file: `docs/research/stage-3/demand-evidence-direct-cohort.csv`
- [Verified] Adjacent-tool evidence file: `docs/research/stage-3/adjacent-tools-demand-evidence.csv`
- [Verified] Domain pain-point evidence file: `docs/research/stage-3/domain-painpoints-evidence.csv`
- [Verified] Community-and-review evidence file: `docs/research/stage-3/community-and-review-evidence.csv`
- [Verified] Review-platform evidence file: `docs/research/stage-3/review-platform-demand-evidence.csv`
- [Verified] Comparison-article evidence file: `docs/research/stage-3/comparison-articles-evidence.csv`
- [Verified] Onboarding-and-pricing evidence file: `docs/research/stage-3/onboarding-pricing-demand-evidence.csv`
- [Verified] Browser-agent evidence file: `docs/research/stage-3/browser-agent-demand-evidence.csv`
- [Verified] Document-intelligence evidence file: `docs/research/stage-3/document-intelligence-demand-evidence.csv`
- [Verified] Thin-signal product evidence file: `docs/research/stage-3/thin-signal-products-evidence.csv`
- [Verified] Pain-point taxonomy: `docs/research/stage-3/painpoint-taxonomy.md`
- [Verified] Pain-point ledger: `docs/research/stage-3/painpoint-ledger.md`
- [Verified] Pain-point cluster counts: `docs/research/stage-3/painpoint-cluster-counts.csv`
- [Verified] Competitor pain-point matrix: `docs/research/stage-3/competitor-painpoint-matrix.csv`
- [Verified] Competitor pain-point readout: `docs/research/stage-3/competitor-painpoint-readout.md`
- [Verified] Buyer-trust matrix: `docs/research/stage-3/buyer-trust-matrix.csv`
- [Verified] Buyer-trust readout: `docs/research/stage-3/buyer-trust-readout.md`
- [Verified] Ranked pain-point shortlist: `docs/research/stage-3/top-painpoints-shortlist.csv`
- [Verified] Top proof links: `docs/research/stage-3/top-proof-links.md`
- [Verified] Ranking summary: `docs/research/stage-3/stage-3-ranking-summary.md`
- [Verified] Group notes:
- [Verified] `docs/research/stage-3/group-a-demand-notes.md`
- [Verified] `docs/research/stage-3/group-b-demand-notes.md`
- [Verified] `docs/research/stage-3/group-c-demand-notes.md`
- [Verified] `docs/research/stage-3/adjacent-tools-demand-notes.md`
- [Verified] `docs/research/stage-3/domain-painpoints-notes.md`
- [Verified] `docs/research/stage-3/community-and-review-notes.md`
- [Verified] `docs/research/stage-3/review-platform-demand-notes.md`
- [Verified] `docs/research/stage-3/comparison-articles-notes.md`
- [Verified] `docs/research/stage-3/onboarding-pricing-demand-notes.md`
- [Verified] `docs/research/stage-3/browser-agent-demand-notes.md`
- [Verified] `docs/research/stage-3/document-intelligence-demand-notes.md`
- [Verified] `docs/research/stage-3/thin-signal-products-notes.md`
- [Verified] Raw GitHub issue snapshots:
- [Verified] `docs/research/stage-3/github-open-issues-snapshot.csv`
- [Verified] `docs/research/stage-3/github-open-issues-fallback.csv`
- [Verified] `docs/research/stage-3/group-c-github-open-issues.csv`
- [Verified] `docs/research/stage-3/adjacent-github-open-issues.csv`

## Evidence Volume

- [Verified] The expanded merged corpus contains `259` normalized rows.
- [Verified] Scope mix: `41` direct-competitor rows, `39` browser-agent rows, `36` adjacent-tool rows, `32` onboarding-and-pricing rows, `29` document-intelligence rows, `27` community-review rows, `20` thin-signal-product rows, `18` generic domain pain-point rows, `9` comparison-article rows, and `8` review-platform rows.
- [Verified] Signal mix: `135` complaints, `37` feature requests, `30` praise signals, `28` generic signals, `15` explicit source-gap records, `5` workaround signals, and `1` workaround-style signal.
- [Verified] Top subject volume in the merged corpus is `firecrawl=26`, `webclaw=23`, `crawl4ai=19`, `browser-use=19`, `jina-reader=17`, and `crw=17`.
- [Verified] Source mix spans GitHub issues, GitHub discussions, GitHub issue-index checks, GitHub readmes, Reddit threads, Reddit posts, Hacker News comments and threads, Product Hunt reviews and comments, G2 review pages, a Capterra directory page, official docs, official sites, official blogs, official packages, official changelogs, public comparison articles, and public web discussions.

## Main Finding

- [Verified] The loudest demand in this market is not "more formats" and not "more crawl breadth" by itself.
- [Verified] The loudest demand is trust under pressure: reliable output, honest failure, dynamic-page truthfulness, browser-path visibility, and structural fidelity once extraction leaves easy pages.
- [Inference] Oleriq already competes well on human-facing export, but the broader demand-side gap is around trust, observability, first-session confidence, dynamic-page truthfulness, and agent-native control.

## Strongest Demand Clusters

### Reliability And Truthfulness

- [Verified] `firecrawl` users complain about anti-bot fallback loops, empty results on reported-success crawls, and fragile self-hosted extraction paths.
- [Verified] `crawl4ai` users complain about markdown fidelity regressions, MCP parity gaps, and Docker instability over time.
- [Verified] `browser-use` users complain about loops, wrong-control clicks, and brittle real-UI behavior.
- [Verified] `trafilatura` users complain about concurrency crashes and markdown or media preservation bugs.
- [Verified] `mozilla-readability` users complain about truncated article bodies and aggressive normalization that hurts extraction accuracy.
- [Inference] Users do not only want extraction to succeed. They want failure to be honest, bounded, and diagnosable.

### Dynamic And Protected Pages

- [Verified] `jina-reader`, `scrapegraphai`, `crawl4ai`, and `browser-use` all show public pain around JS-heavy pages, SPA timing, authenticated pages, or bot-protected pages.
- [Verified] `webclaw` demand includes hydration-state and page-state extraction, not only visible HTML extraction.
- [Verified] The generic domain corpus adds direct pain on Cloudflare, session reuse, browser detection, and page-state extraction beyond the named competitor set.
- [Inference] This is the clearest evidence that static-page extraction alone is not enough for a serious competitor set.

### Debuggability And Observability

- [Verified] `apify-crawlee` demand emphasizes queue visibility, failure propagation, retry semantics, and proxy observability.
- [Verified] `scrapegraphai` users ask for real debug output, not shallow verbose mode.
- [Verified] `browser-use` users want selector capture, deterministic replay, and better introspection from exploratory runs.
- [Verified] `playwright-mcp` users ask for visual highlighters and complain about overwhelming page-state context being sent to the model.
- [Inference] Oleriq can gain trust quickly if it explains what happened, what path was used, and why a result is incomplete or failed.

### Low-Friction First Success

- [Verified] `jina-reader` gets praise for its prefix-based read flow.
- [Verified] `webclaw` and `crw` get praise for local-first or lightweight deployment.
- [Verified] `browser-use` demand includes frustration when setup or operation becomes unclear enough that users build wrapper tooling around it.
- [Verified] Community evidence around `firecrawl`, `scrapegraphai`, and `browser-use` confirms that immediate time saved is one of the fastest paths to public praise.
- [Inference] The market rewards tools that feel immediately useful before users commit to deeper integration.

### Cost And Token Predictability

- [Verified] `jina-reader` shows public complaints about token spikes.
- [Verified] `firecrawl` shows public cost sensitivity for recurring scraping workloads.
- [Verified] `crawl4ai` shows public complaints about token overhead in multilingual MCP output.
- [Verified] `playwright-mcp` adds direct evidence that browser-assisted MCP flows can explode context size and rate-limit cost.
- [Inference] Users care about extraction economics as a first-order product property, not a billing afterthought.

### Onboarding Trust Decay

- [Verified] `firecrawl`, `jina-reader`, `browser-use`, and `crawl4ai` all show a repeated pattern where the initial demo is easy, but the second real workflow hits empty-success results, JS-heavy failures, Docker friction, browser loops, or cost shock.
- [Verified] `webpeel` and `crw` present low-friction and low-price official surfaces, but public complaint evidence is much thinner than their messaging surface.
- [Inference] The market does not only reward quick first success. It punishes products that lose trust in the first meaningful edge case.

### Browser-Agent And MCP Overhead

- [Verified] `playwright-mcp`, `crawl4ai-mcp`, `browser-use`, `firecrawl`, and `webclaw` all show public pain around token bloat, session resets, bot blocking, missing explicit waits, and weak replay evidence once extraction escalates into live browser control.
- [Verified] The browser-agent lane adds clear demand for session persistence, visible action traces, better fallback boundaries, and direct explanation of when a browser path is required.
- [Inference] If Oleriq expands into browser-assisted or agent-facing surfaces, the product burden is not just "support a browser." It is "make the browser path legible, bounded, and economically sane."

### Document And Structure Fidelity

- [Verified] The generic domain corpus adds repeated pain around broken tables, flattened code blocks, malformed academic PDF markdown, OCR language gaps, Word or diagram conversion failures, and hanging document jobs.
- [Verified] `jina-reader`, `crawl4ai`, `mozilla-readability`, and `trafilatura` each reinforce that structure loss is a practical trust problem, not a minor formatting complaint.
- [Verified] The document-intelligence lane adds repeated pain around merged-cell loss, heading-marker collapse, list and anchor flattening, GitHub-style complex-layout failures, and the need for provenance after a nominally successful extraction.
- [Inference] Oleriq’s document and markdown claims should be framed around tested fidelity boundaries, not broad file-extension support alone.

## Competitor Readout

- [Verified] `firecrawl`: strongest public demand around reliable self-hosting, clean success semantics, and better behavior under protected pages.
- [Verified] `jina-reader`: strongest public demand around token predictability, document coverage, and dynamic-page handling, while onboarding remains a major praise point.
- [Verified] `apify-crawlee`: strongest public demand around long-job control, queue-state ergonomics, and proxy or retry observability.
- [Verified] `crawl4ai`: strongest public demand around markdown fidelity, SPA support parity, and long-run deployment stability.
- [Verified] `webclaw`: strongest public demand around concrete workflow wins like hydration-state extraction, deterministic batch output, and migration compatibility.
- [Verified] `crw`: strongest visible public signal is lightweight deployment praise rather than a large public complaint backlog.
- [Verified] `scrapegraphai`: strongest public demand around protected pages, AJAX pagination, authenticated scraping, markdown export clarity, and better debugging.
- [Verified] `browser-use`: strongest public demand around replayability, dependency friction, loop control, and real-UI reliability.
- [Verified] `webpeel`: this pass found a source gap rather than a visible public demand backlog.
- [Verified] `webpeel`: official surface is broad and aggressively priced, but third-party public complaint depth remains weak.
- [Verified] `playwright-mcp`: strongest adjacent-tool demand around token bloat, setup friction, visual action evidence, and security trust at the model-context boundary.
- [Verified] `trafilatura`: strongest adjacent-tool demand around maintenance confidence, concurrency stability, and markdown or media fidelity.
- [Verified] `mozilla-readability`: strongest adjacent-tool demand around completeness and structured-page extraction limits.
- [Verified] `webustler`: strongest adjacent-tool signal is positioning around protected-site extraction, but the public pain surface is thin.
- [Verified] `crawl4ai-mcp-server`: strongest adjacent-tool demand around local hosting, MCP transport stability, SPA waiting, and markdown fidelity inherited from the broader Crawl4AI surface.
- [Verified] `teracrawl`: strongest adjacent-tool demand around anti-bot success tempered by dependency sprawl and hosted-service reliance.
- [Verified] `browserpilot`: strongest adjacent-tool demand around pagination, full-site crawling, proxy control, model support, and security trust.
- [Verified] `crw`: official surface is unusually polished for a thin-signal product, but public complaint depth remains thin.

## Oleriq Implications

- [Inference] Oleriq should treat renderer visibility as product surface. Users want to know whether extraction used lightweight fetch, browser fallback, or a degraded path.
- [Inference] Oleriq should treat structured failure reporting as product surface. Users need explicit reasons for empty output, partial output, retry paths, and dynamic-page limits.
- [Inference] Oleriq should treat dynamic-page support as a product question, not only an implementation question, because public demand repeatedly centers on JS-heavy pages, page state, and authenticated sessions.
- [Inference] Oleriq should keep first success extremely fast, because `jina-reader`, `webclaw`, and `crw` all show that ease-of-start strongly shapes user sentiment.
- [Inference] Oleriq should treat post-first-use trust as a separate product surface, because the strongest modern pain pattern is demo success followed by first-edge-case disappointment.
- [Inference] Oleriq should expose predictable batch output naming and job-state truthfulness if it expands agent-facing or recurring workflows.
- [Inference] Oleriq should define structural fidelity expectations explicitly for tables, headings, lists, code blocks, OCR-heavy files, and mixed-layout documents instead of treating "document converted" as the only success condition.
- [Inference] Oleriq should consider agent-readable docs or tool-facing docs packaging, because `llms.txt`-style discoverability surfaced explicitly in demand signals.

## Source Gaps

- [Verified] `webpeel` is the biggest evidence gap in this stage. The public repo showed no open issues in this pass, and the prioritized public surfaces did not yield a concrete demand backlog.
- [Verified] `crw` has thinner complaint evidence than the rest of the cohort and is more community-comment driven in this pass.
- [Verified] `webustler` is also a thin-signal comparator in the widened corpus.
- [Verified] `browserpilot` demand is fragmented across more than one public repo or launch surface.
- [Verified] Public review platforms were weaker than GitHub and community threads for this cohort.
- [Verified] Official surfaces for `webpeel`, `crw`, and `webclaw` were much easier to find than independent public complaint archives.
- [Unverified] I cannot verify this. Private channels such as Discord, support inboxes, or closed community groups may hold stronger demand signals than the public record captured here.

## Stage Gate

- [Verified] This stage now contains a widened public pain-point corpus across direct competitors, adjacent tools, community review surfaces, and generic domain problems.
- [Inference] The next correct stage is synthesis and prioritization, because the product-truth baseline, competitor-truth baseline, repo investigation, and expanded demand corpus are now all in place.
