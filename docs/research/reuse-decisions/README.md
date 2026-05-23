# Reuse Decisions Index

## Purpose

- [Verified] This directory keeps the tracked decision surface for competitor reuse.
- [Verified] The full working analysis can stay in the external lab under `notes\` and `evidence\`.
- [Verified] This tracked index keeps the final gate outcome discoverable from the Oleriq repo itself.

## File Naming

- [Verified] Create one Markdown file per competitor decision using `<yyyy-mm-dd>-<slug>.md`.
- [Verified] Keep the slug equal to the manifest `slug`.
- [Verified] Add a new file when the reuse posture materially changes instead of rewriting older decisions.

## Minimum Contents

- [Verified] Competitor name.
- [Verified] Manifest slug.
- [Verified] Category.
- [Verified] Local repo path in the external lab.
- [Verified] Current `reuse_gate`.
- [Verified] Evidence used.
- [Verified] One-paragraph reason.
- [Verified] Next allowed action.

## Short Example

```md
# 2026-05-16 firecrawl

- Competitor: Firecrawl
- Manifest slug: firecrawl
- Category: direct_product
- Repo path: C:\Users\Godsgrace\Desktop\codez\Oleriq-competitor-lab\repos\direct-products\firecrawl
- Reuse gate: legal_review_required
- Evidence: repo audit + license check + product analysis
- Reason: Technical ideas are useful, but direct adoption stays blocked until written review clears the exact scope.
- Next allowed action: Clean-room implementation only.
```
