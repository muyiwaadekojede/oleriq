# /batch Structural Fidelity Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining `now` trust-critical `/batch` functionality by adding deterministic structure-fidelity signals for headings, lists, tables, code blocks, and document truncation risk before any new below-fold design work resumes.

**Architecture:** Keep the current `/batch` queue, polling model, and trust-surface vocabulary. Add one shared structural-fidelity analyzer that compares source-side structure signals with extracted or exported structure signals, emit typed diagnostic reasons only when the loss signal is defensible, persist those reasons through batch state, and expose them in the existing first-fold trust surface.

**Tech Stack:** Next.js App Router, React client components, TypeScript, JSDOM, better-sqlite3 batch state, existing document conversion pipeline, existing Node E2E scripts, Playwright browser verification.

---

## Summary

- [Verified] This pass is function-first. It does **not** redesign the `/batch` below fold.
- [Verified] The objective is to reduce silent structure-loss cases that still survive the current trust-gap pass.
- [Inference] The first-pass structural-fidelity layer should stay deterministic and narrow: only warn where the pipeline can compare a meaningful source-side structure signal with a meaningful output-side signal.
- [Verified] The colour work in this sequence is an audit and guardrail pass, not a visual redesign pass.

## Important Interface And State Changes

- [Inference] Keep current lifecycle statuses unchanged.
- [Inference] Keep `qualityState: 'usable' | 'degraded'`, but allow more exact degraded reasons through added structural-fidelity diagnostic IDs.
- [Inference] Extend `BatchDiagnosticReason` in `lib/types.ts` with deterministic structure-loss reasons:
  - [Inference] `structure_heading_loss_risk`
  - [Inference] `structure_list_loss_risk`
  - [Inference] `structure_table_loss_risk`
  - [Inference] `structure_code_block_loss_risk`
  - [Inference] `document_pdf_truncated_pages`
- [Inference] Keep `warnings: string[]` as user-facing copy, but make those warnings derive from the typed reasons so batch and homepage stay consistent.
- [Inference] Preserve current counts and add no new top-level summary counts unless the new reasons prove a real need. This pass should improve row truth first.

## File Map

- [Inference] Create `lib/structuralFidelity.ts`
  - [Inference] one shared analyzer for HTML structure counts and deterministic risk derivation
- [Inference] Modify `lib/types.ts`
  - [Inference] extend `BatchDiagnosticReason`
- [Inference] Modify `lib/trustGuidance.ts`
  - [Inference] labels, warnings, and next-step guidance for new structure-loss reasons
- [Inference] Modify `lib/extract.ts`
  - [Inference] run structure comparison on successful URL extraction paths
- [Inference] Modify `lib/documentConversion.ts`
  - [Inference] run structure comparison for document conversions and surface PDF truncation explicitly
- [Inference] Modify `lib/pdfConversion.ts`
  - [Inference] return truncation metadata instead of hiding it only inside body text
- [Inference] Modify `lib/batchQueue.ts`
  - [Inference] persist and expose new diagnostic reasons through batch item state
- [Inference] Modify `lib/durableDocumentBatch.ts`
  - [Inference] mirror the same reasons in durable document batch state
- [Inference] Modify `app/batch/page.tsx`
  - [Inference] no layout redesign; only ensure new reasons and guidance flow through existing state
- [Inference] Modify `components/BatchUrlPanel.tsx`
  - [Inference] surface new structure-loss reason chips and next steps in current activity rows
- [Inference] Modify `components/BatchDocumentPanel.tsx`
  - [Inference] same as URL panel for documents
- [Inference] Modify `components/SettingsSidebar.tsx`
  - [Inference] if homepage trusts the same shared response object, expose the same new structure-loss reasons there
- [Inference] Create `public/test-fixtures/structure-source.html`
  - [Inference] stable URL fixture with headings, nested lists, table, and code block
- [Inference] Create `tests documents/structure-source.html` only if current document E2E harness requires a local upload copy rather than the public fixture
- [Inference] Modify `scripts/e2e-batch.mjs`
  - [Inference] verify structure-loss reasons on URL mode
- [Inference] Modify `scripts/e2e-batch-documents.mjs`
  - [Inference] verify structure-loss reasons on document mode
- [Inference] Modify `scripts/check-batch-design-law.mjs`
  - [Inference] keep first-fold contract and trust-summary checks; add no new below-fold design assertions
- [Inference] Modify `DESIGN.md` or `docs/design/playbooks/external-systems.md`
  - [Inference] only if needed for explicit workflow-surface colour ratio and token guardrails after the functionality pass is proven

## Task 1: Shared Structural-Fidelity Analyzer

**Files:**
- [Inference] Create: `lib/structuralFidelity.ts`
- [Inference] Modify: `lib/types.ts`
- [Inference] Modify: `lib/trustGuidance.ts`

- [ ] Define one shared shape for source and output structure counts: headings, lists, list items, tables, rows, code blocks, and preformatted blocks.
- [ ] Parse HTML with JSDOM and count only semantic elements that the current pipeline already emits or consumes.
- [ ] Define deterministic loss rules that avoid fake warnings:
  - [Inference] heading risk only when source side has multiple semantic headings and output side collapses them sharply
  - [Inference] list risk only when source side has a meaningful list presence and output side loses it
  - [Inference] table risk only when source side contains real tables and output side removes them entirely
  - [Inference] code-block risk only when source side contains `pre` or meaningful `code` blocks and output side removes them
- [ ] Add human-facing labels and next-step guidance for each new reason in `lib/trustGuidance.ts`.
- [ ] Keep warning copy short, concrete, and non-theatrical.

## Task 2: URL Extraction Fidelity Signals

**Files:**
- [Inference] Modify: `lib/extract.ts`
- [Inference] Modify: `lib/structuralFidelity.ts`

- [ ] Identify a defensible source-side comparison point for URL extraction.
- [ ] Use the original loaded DOM before final output assembly, not only the flattened text body.
- [ ] Compare source-side structure counts against the sanitized extracted article HTML that becomes `contentVariants`.
- [ ] Append structural-fidelity diagnostic reasons and warnings to successful extraction responses when the rules fire.
- [ ] Degrade `resultState` when structure-loss reasons are present, even if the extraction path itself stayed on `readability`.
- [ ] Do not emit structure warnings on weak evidence such as generic full-document navigation chrome or one isolated heading.

## Task 3: Document Conversion Fidelity Signals

**Files:**
- [Inference] Modify: `lib/documentConversion.ts`
- [Inference] Modify: `lib/pdfConversion.ts`
- [Inference] Modify: `lib/structuralFidelity.ts`

- [ ] Compare source-side document HTML structure against the HTML or text shape that each export target actually preserves.
- [ ] For HTML-, EPUB-, DOCX-, and text-derived document inputs, analyze the conversion source HTML before export generation.
- [ ] For TXT exports, warn only where the current format truly flattens semantic structure in a deterministic way.
- [ ] Surface PDF truncation as an explicit diagnostic reason instead of hiding it only inside body text.
- [ ] Keep the existing TXT image downgrade warning and combine it cleanly with any new structure-loss reasons.
- [ ] Do not introduce speculative OCR-quality warnings in this pass.

## Task 4: Batch State, Persistence, And Current UI Surface

**Files:**
- [Inference] Modify: `lib/batchQueue.ts`
- [Inference] Modify: `lib/durableDocumentBatch.ts`
- [Inference] Modify: `app/batch/page.tsx`
- [Inference] Modify: `components/BatchUrlPanel.tsx`
- [Inference] Modify: `components/BatchDocumentPanel.tsx`

- [ ] Persist the new structural-fidelity reasons through both SQLite-backed and durable document batch state.
- [ ] Keep the existing first-fold activity panel as the primary proof surface.
- [ ] Show new reason chips and next-step guidance in degraded rows without adding a new panel or below-fold surface.
- [ ] Update the run message only if the additional specificity improves clarity rather than noise.
- [ ] Preserve retry behavior exactly as-is.

## Task 5: Homepage Trust Surface Consistency

**Files:**
- [Inference] Modify: `app/page.tsx`
- [Inference] Modify: `components/SettingsSidebar.tsx`

- [ ] If homepage extraction now receives new shared structural-fidelity reasons, expose them in the existing trust panel.
- [ ] Keep homepage behavior additive: no new route, no new panel stack, no below-fold expansion.
- [ ] Ensure the shared trust model remains aligned between homepage and `/batch`.

## Task 6: Fixtures And Red-First Verification

**Files:**
- [Inference] Create: `public/test-fixtures/structure-source.html`
- [Inference] Modify: `scripts/e2e-batch.mjs`
- [Inference] Modify: `scripts/e2e-batch-documents.mjs`
- [Inference] Modify: `scripts/check-batch-design-law.mjs`

- [ ] Add a stable structure-rich URL fixture with headings, nested lists, table markup, and code block markup.
- [ ] Add failing E2E expectations first for URL mode:
  - [Inference] structure-rich source plus lossy export path should expose structure-loss reasons when appropriate
  - [Inference] empty output and current diagnostic cases must still pass unchanged
- [ ] Add failing E2E expectations first for document mode:
  - [Inference] structure-rich uploaded HTML or text-derived source should surface deterministic table/code/list risks where the selected output target flattens them
  - [Inference] PDF truncation should surface explicitly when the converter caps page count
- [ ] Keep `check-batch-design-law` focused on first-fold task and trust behavior, not redesign work.

## Task 7: Browser-Use Verification Loop

**Files:**
- [Inference] No required source file unless browser findings reveal a real product issue

- [ ] After each frontend-affecting change, run the relevant automated check first.
- [ ] Then inspect the live `/batch` page in Playwright against the actual user view.
- [ ] If the rendered page hides the reason, overloads the row, or weakens the first fold, change the UI and rerun the cycle.
- [ ] Save screenshots only when they prove the current trust surface or reveal a defect worth fixing.

## Task 8: Workflow-Surface Colour Audit And Guardrails

**Files:**
- [Inference] Modify: `DESIGN.md` or `docs/design/playbooks/external-systems.md` only if the audit reveals missing guardrails
- [Inference] Modify: changed `/batch` UI files only if any trust-surface additions slipped outside existing brand tokens

- [ ] Audit the changed `/batch` trust-surface files for raw colours outside the current Clearpage token system.
- [ ] Keep dominant, supporting, and accent color roles aligned with the repo’s existing token model and the color-book guidance on dominant/supporting/accent relationships.
- [ ] Use `60-30-10` as a composition discipline for future workflow-surface changes, not as an excuse to add extra colors.
- [ ] If a new guardrail is needed, document it without reopening below-fold design work.

## Task 9: Full Verification

**Files:**
- [Inference] No new source files beyond the implementation changes above

- [ ] Run: `npm run build`
- [ ] Run: `npm run typecheck`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run check:homepage-design-law`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run check:batch-design-law`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run e2e:batch`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run e2e:batch-documents`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run e2e:full`
- [ ] Run: `BASE_URL=http://127.0.0.1:3102 npm run e2e:batch-documents-real`
- [ ] Re-open `/batch` in Playwright after the final green run and verify the first fold still feels tool-first.

## Assumptions And Defaults

- [Verified] This plan stays function-first and deliberately avoids new below-fold design work.
- [Inference] The first-pass structure-fidelity layer warns only on measurable structure loss, not on taste-based judgments.
- [Inference] The new diagnostic reasons may mark some currently `usable` rows as `degraded` when the structure-loss evidence is real.
- [Inference] No new pricing, packaging, structured extraction, or anti-bot work is part of this pass.
- [Inference] Colour changes are out of scope unless the trust-surface additions violate the existing brand-token discipline.
