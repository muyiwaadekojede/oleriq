# /batch Copy And Intent Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic `/batch` framing with task-first, trust-first copy and a more compact first screen that matches the approved design direction.

**Architecture:** Keep `/batch` on the existing route and preserve URL mode as default. Refine the route in three units: route metadata and header copy, active-panel compaction, and governance updates that encode intent-first copy rules for future page work.

**Tech Stack:** Next.js App Router, React client components, Tailwind utility classes, Playwright checks, Node-based E2E scripts.

---

### Task 1: Route Metadata And Header Copy

**Files:**
- Create: `app/batch/layout.tsx`
- Modify: `app/batch/page.tsx`
- Modify: `scripts/check-batch-design-law.mjs`

- [ ] Replace the generic global `/batch` page title with route-specific metadata that states the job and output formats clearly.
- [ ] Replace the `Batch Workspace` heading and generic support line with task-first, trust-first copy.
- [ ] Replace the large `Back to Homepage` button with a small icon-only home link.
- [ ] Move the mode switch into the compact header and remove the separate `Input mode` explainer block.
- [ ] Update the design-law script to assert the new first-load copy instead of the old generic labels.
- [ ] Run: `npm run check:batch-design-law`

### Task 2: Active Panel Compaction

**Files:**
- Modify: `components/BatchUrlPanel.tsx`
- Modify: `components/BatchDocumentPanel.tsx`

- [ ] Remove the repeated `Prepare batch` heading and helper copy from both active panels.
- [ ] Keep the input itself as the first visible focus inside each active panel.
- [ ] Collapse the limit and state chips into the controls region so they stop consuming a dedicated row above the input.
- [ ] Keep activity hidden until state exists.
- [ ] Preserve accessibility labels even where visible labels are removed or reduced.
- [ ] Run: `npm run typecheck`
- [ ] Run: `npm run e2e:batch-documents`

### Task 3: Intent-Driven Copy Governance

**Files:**
- Modify: `DESIGN.md`
- Modify: `PRODUCT.md`

- [ ] Add a durable rule that page copy must be driven by user job, trust need, and route intent before SEO shaping.
- [ ] Add a durable rule against generic workspace-style labels on core and workflow routes when a concrete job description is available.

### Task 4: Final Verification And Live Check

**Files:**
- Modify: `batch-consolidated-url-mode-current.png`
- Modify: `batch-consolidated-documents-mode-current.png`

- [ ] Run: `npm run build`
- [ ] Run: `npm run e2e:batch`
- [ ] Run: `npm run e2e:direct-file`
- [ ] Run: `npm run e2e:full`
- [ ] Rebuild the local production server if needed and re-check `http://127.0.0.1:3000/batch` in the browser.
- [ ] Refresh the URL-mode and document-mode screenshots after the final verified state.
