# /batch Proof-Led Below-Fold Redesign

## Purpose

This spec replaces the current `/batch` below-fold design direction.

The current below fold is structurally correct for search indexing, but visually weak. It behaves like a centered article with repeated bordered text containers. That is not strong enough for the route's real burden.

`/batch` does not need more decorative styling. It needs a better proof structure.

The below fold must help users trust repeated conversion work by showing:

- what kind of structure Clearpage tries to preserve
- how `usable`, `degraded`, and `failed` differ
- how longer runs stay inspectable and recoverable

## Why The Previous Pass Failed

The previous below-fold pass failed for four reasons:

1. It explained trust instead of proving trust.
2. It repeated one visual grammar across almost every section.
3. It relied too much on paragraphs and too little on proof artifacts.
4. It treated a workflow evidence layer like a polished prose article.

The result is a page that feels safe, generic, and AI-generated even though the copy is route-correct.

## Research Basis

This redesign is driven by the raw research corpus, not by generic landing-page patterns.

The strongest pressures for `/batch` remain:

- structural fidelity
- truthful status and output quality
- retries and visible failure handling
- workload fit as a secondary qualifier

The dominant burden is not broad persuasion.

The dominant burden is trust under repeated work.

## Product Truth Boundary

The below fold may only prove what the tool can actually show today.

The route can currently support and claim:

- URL and document batch conversion on the same `/batch` route
- visible progress bars
- per-item `success` or `failure`
- `usable` and `degraded` quality states
- warnings on degraded rows
- retry failed URLs
- retry failed files
- multiple output formats
- individual downloads

The route must not imply:

- perfect structural fidelity
- universal document-class success
- full provenance back to every source element
- guaranteed protected-site success
- automated deep structural scoring for every item

## Design Thesis

The correct design for this page is a proof-led workflow narrative.

That means:

- fewer sections, but stronger sections
- fewer repeated cards, but larger evidence artifacts
- less paragraph mass, but more visual teaching
- more real product proof, less abstract explanation

The page still remains calm, restrained, and warm.

But it stops being timid.

## Page Role

The above fold keeps one dominant working surface.

The below fold becomes a workflow evidence layer.

It is not a blog article.

It is not a feature grid.

It is not a generic educational page.

It is a guided proof body attached to the `/batch` tool.

## Core Composition Rules

### 1. One dominant artifact per major section

Each major section must have one visual artifact that carries most of the learning load.

Valid artifact types for this page include:

- annotated product screenshot
- fidelity comparison block
- status ladder
- retry flow strip
- workload comparison table
- compact FAQ blocks

Each section may include supporting copy, but the copy must not be the primary learning device.

### 2. Strong section contrast

Each major section must feel structurally different from the previous one.

This difference should come from layout, artifact type, density, and spacing rhythm.

It must not come from louder colors, gradients, glow, or decoration.

### 3. Real product evidence where possible

When the route already has a meaningful product surface, the below fold should show the product.

Do not invent abstract diagrams when a real route crop would teach faster and build more trust.

Real UI artifacts should be captured with Playwright or browser inspection from the actual local or deployed route.

### 4. Proof before explanation

Whenever a concept can be shown and then explained, show it first.

Examples:

- show a degraded row before explaining degraded status
- show a progress and retry surface before describing run recovery
- show structure-sensitive output expectations before talking about fidelity risk

### 5. FAQ becomes subordinate

FAQ stays on the page, but it loses its current visual dominance.

It should be short, compact, and late in the page.

It should answer objections, not occupy a large percentage of the scroll length.

## Required Below-Fold Structure

### Section 1: Route proof lead

**Job:** Introduce the route through real evidence, not through generic copy.

**Required artifact:** One large annotated screenshot or composite crop of the actual batch interface.

**Callouts must point to:**

- progress surface
- degraded-row warning behavior
- retry failed items behavior
- individual output download behavior

**Copy role:** Minimal. A short intro and one short trust-oriented framing paragraph only.

### Section 2: Structure preservation proof

**Job:** Address the strongest user concern from research: structure surviving conversion.

**Required artifact:** One fidelity comparison block.

This is not a literal fake before-and-after markdown demo if the product cannot prove that honestly. It is a structure-expectation artifact that shows:

- what users care about preserving
- what Clearpage currently tries to keep readable
- where harder layouts can still degrade

**Artifact options:**

- left-right preservation matrix
- annotated source-structure versus output-expectation comparison
- structured checklist with asymmetrical layout

**Copy role:** Explain why readable structure matters more than plain text. Keep this short.

### Section 3: Status truth artifact

**Job:** Make `usable`, `degraded`, and `failed` instantly understandable.

**Required artifact:** One status ladder or three-state comparison artifact.

Each state must show:

- label
- plain meaning
- what the user should do next

`Degraded` must visually read as a true middle state, not as success with cosmetic caution.

### Section 4: Run recovery artifact

**Job:** Prove that longer batch jobs remain understandable and recoverable.

**Required artifact:** One process strip or workflow rail using the real route logic.

The sequence must show:

1. start the run
2. monitor progress
3. inspect degraded or failed rows
4. retry only what broke

This section exists because the research repeatedly ties trust to queue clarity, retry clarity, and visible failure handling.

### Section 5: Workload-fit qualifier

**Job:** Clarify when `/batch` is the right route without making this a homepage comparison page.

**Required artifact:** One compact workload comparison artifact.

It should compare:

- many URLs
- many uploaded files
- one-off URL work

The homepage link may appear only inside the one-off path.

This section is secondary. It should not compete with the earlier proof sections.

### Section 6: Compact FAQ

**Job:** Resolve repeated objections without turning the page back into a prose wall.

**Required artifact:** Compact question blocks with low visual weight.

Rules:

- no long slab stack
- no accordion unless needed later for length control
- one short answer per question
- answers should compress what was already proven above, not restate the whole page

## What Must Be Removed From The Current Version

Remove or replace these patterns:

- repeated equal-weight mini-cards
- repeated paragraph-first sections
- a long slab-style FAQ stack
- decorative chips that summarize claims without proving them
- any section whose visual structure is too similar to the section before it

## Typography And Tone

The page should use the current `Newsreader + Geist Sans` system already approved for the product.

Use `Newsreader` for major section titles and proof-section leads.

Use `Geist Sans` for labels, captions, artifact annotations, status labels, and instructional microcopy.

The page must feel contemporary, exact, and warm.

It must not feel literary, ornate, or startup-gimmicky.

## Color And Surface Rules

The page keeps the calm Clearpage palette.

Allowed:

- flat warm page background
- restrained section banding if it stays close to the token system
- thin rules, inset frames, and low-contrast artifact containers
- one accent color used functionally inside callouts or active emphasis

Not allowed:

- gradients
- glow
- glass blur
- decorative shadows
- loud multi-accent color systems

## Mobile Rules

This page must remain readable on mobile without collapsing into another text wall.

That means:

- large artifacts must stack cleanly
- callouts must remain attached to their proof object
- comparison blocks must collapse into a readable single-column sequence
- FAQ answers must stay short enough that mobile scanning remains possible

## Artifact Capture Requirement

Any product-evidence artifact used in design or implementation must come from the actual route.

Approved capture methods:

- Playwright screenshots
- browser inspection screenshots
- locally rendered route crops
- deployed route crops if live validation is needed

Do not ship invented faux-product frames when a real route crop can be used.

## Success Criteria

This redesign is successful when:

- the below fold no longer reads like one article with supporting cards
- each major section teaches through a distinct proof artifact
- the page proves trust more than it describes trust
- FAQ becomes a minor support layer instead of a major layout block
- the route still feels like Clearpage instead of a marketing site

## Out Of Scope

This spec does not change:

- the first-fold batch tool workflow
- batch execution behavior
- trust-state semantics already shipped above the fold
- homepage layout
- structured extraction features
- protected-site escalation
