# Stage 3 Ranking Summary

- [Verified] This summary is based on the `259`-row Stage 3 corpus in `painpoint-corpus-expanded.csv`.
- [Verified] Ranking inputs: evidence volume, pain severity, distance to Clearpage's current product surface, and a horizon multiplier.
- [Inference] Distance and horizon are manual product-fit judgments grounded in the Stage 1 baseline, based on observed patterns, not confirmed mechanism.

## Method

- [Verified] `frequency_score` measures how much evidence exists for a cluster in the corpus.
- [Verified] `severity_score` weights complaints, high-severity rows, and feature-request pressure.
- [Verified] `distance_score` measures how close the cluster is to Clearpage's current promise: one-URL extraction, clean export, direct-file handling, and `/batch` document or URL conversion.
- [Verified] `horizon_multiplier` down-ranks large but farther-scope themes so the shortlist favors what Clearpage can act on sooner.
- [Verified] `composite_score` is the final ranking input after that adjustment.

## Solve Now

- [Verified] `document_fidelity_and_structure` ranked `1` with score `5.0`. Clearpage already promises clean, exportable documents and batch document conversion, so fidelity failures hit the current product promise directly.
- [Verified] `onboarding_and_honeymoon_gap` ranked `2` with score `2.79`. Clearpage competes in a fast-first-success category where trust can collapse on the first real edge case.
- [Verified] `dynamic_pages_and_renderer_visibility` ranked `3` with score `2.54`. Dynamic-page truth is adjacent to the current URL extraction promise and will matter quickly as users test harder pages.
- [Verified] `reliability_truthfulness` ranked `4` with score `2.48`. Clearpage already exposes extraction failures and batch jobs, so honest status and non-empty output are immediate trust requirements.
- [Verified] `debugging_and_replay_visibility` ranked `5` with score `2.06`. Clearpage already has extraction and batch flows, so better failure explanation can improve trust without changing product category.

## Solve Soon

- [Verified] `pricing_and_token_predictability` ranked `6` with score `1.5`. Important for packaging and economics, but not the first product truth gap in the current UI.
- [Verified] `batch_and_job_control` ranked `9` with score `1.11`. Clearpage already has a real batch surface, so deterministic job control is close to the current architecture.
- [Verified] `structured_extraction_and_schema_control` ranked `10` with score `1.08`. This is a credible next-step expansion once core extraction trust is stronger.

## Later

- [Verified] `agent_packaging_and_mcp_setup` ranked `7` with score `1.22`. Important only if Clearpage deliberately expands into agent-native surfaces.
- [Verified] `anti_bot_and_protected_site_pressure` ranked `8` with score `1.18`. High demand exists, but this expands scope and infrastructure burden beyond the current core promise.
- [Verified] `authenticated_extraction_and_session_state` ranked `11` with score `0.5`. High-scope and security-sensitive; relevant later, not first.

## Watch

- [Verified] `thin_signal_market_uncertainty` ranked `12` with score `0.34`. Useful as a market caution, not a feature roadmap item.
- [Verified] `deep_research_and_enrichment` ranked `13` with score `0.1`. Expansion path after trust and fidelity, not before.

## Top 5 Shortlist

- [Verified] Rank `1`: `document_fidelity_and_structure` with `51` rows, `33` complaints, distance `very_near`, and recommendation `solve_now`.
- [Verified] Rank `2`: `onboarding_and_honeymoon_gap` with `22` rows, `13` complaints, distance `very_near`, and recommendation `solve_now`.
- [Verified] Rank `3`: `dynamic_pages_and_renderer_visibility` with `21` rows, `13` complaints, distance `near`, and recommendation `solve_now`.
- [Verified] Rank `4`: `reliability_truthfulness` with `14` rows, `14` complaints, distance `very_near`, and recommendation `solve_now`.
- [Verified] Rank `5`: `debugging_and_replay_visibility` with `15` rows, `8` complaints, distance `near`, and recommendation `solve_now`.

## Files

- [Verified] Ranked CSV: `docs/research/stage-3/top-painpoints-shortlist.csv`
- [Verified] Proof pack: `docs/research/stage-3/top-proof-links.md`
- [Verified] Summary: `docs/research/stage-3/stage-3-ranking-summary.md`