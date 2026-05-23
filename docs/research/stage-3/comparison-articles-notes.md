# Stage 3 Comparison And Tradeoff Notes

## Scope

- [Verified] Research date: `2026-05-16`.
- [Verified] This pass captures public comparison articles and tradeoff discussions that expose switching reasons and workload framing.
- [Verified] Sources in this pass include public blogs, live comparison directories, and community comparison threads.

## Main Readout

- [Verified] Comparison sources repeatedly frame the category around one core tradeoff: managed convenience versus self-hosted control.
- [Verified] The same sources also show that users evaluate tools by workload class: one-page RAG, full-site docs crawling, structured extraction, agent browsing, or document cleanup after scraping.
- [Verified] Community comparison threads add a stronger warning than most vendor comparisons do: long multi-step browser flows, authenticated flows, and silent quality drift remain fragile even when the tooling looks impressive in demos.
- [Inference] Oleriq should not think only in terms of “best extractor.” It should think in terms of which workload it wants to own with the least user friction and the clearest trust model.

## Strongest Tradeoff Signals

- [Verified] Managed tools win when users do not want to own browser fleets, queues, retries, rate limits, or anti-bot handling.
- [Verified] Self-hosted or local tools win when users care about privacy, low fixed cost, or full control over extraction strategy.
- [Verified] Browser-agent comparisons show that replay, monitoring, and context discipline matter more than novelty once tasks include login or many steps.
- [Verified] Comparison threads also confirm that document intelligence after scraping is a separate pain class, not just an output format preference.

## Oleriq Implications

- [Inference] Oleriq should define its workload identity more sharply: document-first cleanup and export, browser-assisted extraction fallback, or wider research automation.
- [Inference] Oleriq should keep the operational burden low for the user while still exposing enough evidence that failures are not silent.
- [Inference] Oleriq should continue treating document cleanup and structured export as strategic value, because public comparison threads explicitly separate that from live-page scraping.
