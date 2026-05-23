# Stage 3 Domain Pain-Point Notes

## Scope

- [Verified] Research date: `2026-05-16`.
- [Verified] This pass covers generic domain pain points that touch Oleriq's current or plausible future product surface.
- [Verified] Source mix in this pass is public GitHub issues or discussions, Reddit posts, and Hacker News comments.
- [Verified] The focus is pain-point evidence, not solution design or final prioritization.

## Evidence Volume

- [Verified] The CSV created in this pass contains `14` normalized evidence rows.
- [Verified] Source mix in this pass is `11` GitHub issues, `1` Reddit thread, `1` Reddit product post with direct practitioner reply, and `1` Hacker News comment.
- [Verified] The evidence covers these pain-point areas: `web_to_markdown_fidelity`, `js_heavy_pages_and_spa_timing`, `bot_protection_and_cloudflare`, `authenticated_pages_and_session_reuse`, `pdf_and_office_document_extraction`, `batch_jobs_retries_and_observability`, `screenshot_cleanliness_and_visual_verification`, `token_cost_output_size_and_multilingual_overhead`, and `selector_capture_replayability_and_deterministic_handoff`.

## Strongest Cross-Domain Pain Points

### Extraction Fidelity Breaks Trust Fast

- [Verified] Markdown fidelity problems are concrete and repeated, not theoretical.
- [Verified] `crawl4ai` users reported code blocks flattened into inline text in issue `#325`, damaged table output in issue `#756`, and preserved table-structure bugs still visible in the open issues index on `2026-04-16`.
- [Verified] `microsoft/markitdown` users reported broken academic PDF markdown formatting in open issue `#1845` on `2026-04-28`.
- [Inference] Users do not only want text extraction. They want structure that survives enough for downstream LLM parsing, copy-paste use, and human spot checks.

### Dynamic Pages Still Create Coverage Gaps

- [Verified] Public issues still show real failures on JS-heavy pages and timing-sensitive flows.
- [Verified] `jina-ai/reader#1148` reported inability to crawl heavy JavaScript websites on `2025-02-20`.
- [Verified] A Hacker News comment on `2024-11-09` said Jina Reader handles most jobs but still fails on some Cloudflare-protected sites, which ties dynamic rendering limits to anti-bot friction in real use.
- [Inference] Oleriq cannot frame SPA support as a binary yes or no capability. Users care about whether the renderer waited long enough, what it actually saw, and why a page still failed.

### Anti-Bot Pressure Is A Product-Surface Problem

- [Verified] Bot protection appears repeatedly as a source of outright failure, looping, or false expectation.
- [Verified] `firecrawl/firecrawl#2257` reported self-hosted failure against strong anti-bot systems even when Browserless worked on the same host.
- [Verified] `puppeteer-extra#841` reported Cloudflare detection simply from attaching to the browser.
- [Inference] Users will judge Oleriq on honest coverage boundaries, fallback visibility, and failure explanation, not only on whether a browser mode exists.

### Authenticated Access Needs Stable Session Reuse

- [Verified] Logged-in scraping remains a repeated pain point in public community discussion.
- [Verified] A Reddit thread on `2026-05-02` framed authenticated scraping as the real value layer and described session-by-ID reuse as the product abstraction users want.
- [Verified] A separate Reddit thread on `2026-05-02` described login scraping as fragile because of 2FA, session replay, and modern bot detection.
- [Verified] `microsoft/playwright#35466` reported persistent context cookie corruption and headless or headful mismatch, which shows that even lower-level session primitives can be unreliable.
- [Inference] If Oleriq expands into authenticated extraction, reusable session objects and session-health visibility will matter as much as the extraction endpoint itself.

### Document Extraction Is Wider Than PDF Text

- [Verified] Public document-extraction evidence goes beyond simple PDF parsing and points to OCR, Office, images, tables, and language coverage.
- [Verified] `microsoft/markitdown#1817` reported Word documents with Visio or UML flowcharts converting incorrectly.
- [Verified] `docling-project/docling#2866` reported that non-English OCR fails in offline mode because only English and Latin EasyOCR models are downloaded.
- [Verified] `docling-project/docling#2109` reported some PDFs hanging during conversion.
- [Inference] Oleriq should assume that “supports PDF or Office” is too coarse a claim. Users care about which subtypes break, whether OCR is involved, and whether the job can stall.

### Batch Truthfulness And Retry Semantics Matter

- [Verified] Queue or job-state pain shows up wherever extraction becomes recurring or large-scale.
- [Verified] `firecrawl/firecrawl#1309` reported jobs marked completed and successful with an empty data array.
- [Verified] `apify/crawlee#2406` reported severe queue inefficiency near crawl completion because the queue kept scanning nearly all completed requests.
- [Verified] A Reddit thread on Browserbase sessions described practitioners batching several page hits into one session and tuning queue bin-packing because the billing floor and error recovery shaped the real system behavior.
- [Inference] Users need job truthfulness, retry transparency, and cost-aware batching controls before they trust recurring Oleriq workflows.

### Visual Verification Is Only Useful If The Image Is Clean

- [Verified] Screenshot output is not automatically useful.
- [Verified] `firecrawl/firecrawl#647` requested cookie-banner removal because privacy popups can hide meaningful content and block visual validation.
- [Verified] The same Browserbase Reddit thread described error recovery pain when cookie banners appear intermittently and block the target element.
- [Inference] Screenshot or preview artifacts should help users verify extraction state, not introduce another opaque failure mode.

### Replayability And Deterministic Handoff Are Still Weak

- [Verified] Deterministic browser handoff remains a live problem in agent tooling.
- [Verified] `browser-use/browser-use#3044` reported broken replay because initial actions were missing from history and DOMRect serialization failed.
- [Verified] `microsoft/playwright#9015` requested configurable selector-building attributes because real teams use custom test IDs and need recorder output to match their selector strategy.
- [Verified] `browser-use/browser-use#1700` showed iframe interaction requiring manual hacks, which is a concrete signal that generic recorded actions do not always survive hard page structures.
- [Inference] If Oleriq expands into selector capture or automation handoff, the hard requirement is replayable state and stable element references, not just one-time recording.

## Oleriq Implications

- [Inference] The strongest generic demand signal is trust under imperfect conditions, not just raw extraction coverage.
- [Inference] Oleriq should treat rendering path, wait behavior, fallback path, and failure reason as user-visible product outputs.
- [Inference] Oleriq should treat session reuse, retry semantics, screenshot cleanliness, and replay artifacts as first-class surfaces if it moves deeper into agent or batch workflows.
- [Inference] Oleriq should avoid broad compatibility claims for documents until subtype, OCR, and multilingual limits are explicit.
- [Inference] Oleriq has room to differentiate if it is more truthful about zero-result jobs, partial renders, and automation replay boundaries than current tools are.

## Main Evidence Gaps

- [Verified] This pass is stronger on GitHub and community threads than on long-form technical blog posts.
- [Verified] Public evidence is thinner for Office formats other than Word plus embedded-diagram cases; PDF and OCR complaints dominate the visible corpus.
- [Verified] Public evidence for multilingual overhead is present but still narrow, with the strongest concrete signal here coming from Docling OCR model coverage rather than many repeated cross-tool complaints.
- [Verified] There is less public, sourceable discussion of “selector capture” as a standalone product category than of adjacent browser-agent replay or recorder reliability.
- [Unverified] I cannot verify this. Closed support channels, Discord communities, and vendor support inboxes likely contain stronger evidence on authenticated extraction and enterprise document edge cases than the public record captured here.

## Stage Status

- [Verified] This Stage 3 pain-point mining pass is complete as a public-evidence collection artifact.
- [Inference] The next useful step is synthesis across the demand files, the product-truth inventory, and the competitor evidence so the team can separate broad market pain from pain that Oleriq should actually own.