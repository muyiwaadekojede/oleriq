# /batch Below-Fold Search-Target Design

## Purpose

This spec defines the below-fold content architecture for `Oleriq`'s `/batch` route.

The first fold remains tool-first. Users should still land, understand the job, and start the workflow without reading the lower page.

The lower page has a different job:

- capture search intent
- answer trust questions before users ask support
- prove workload fit
- explain output truth without bloating the tool surface

This is not a homepage comparison page.

This is not a generic marketing page.

This is not a feature-dump page.

It is a search-target reading layer attached to the existing `/batch` workflow.

## Locked Constraints

These decisions are already fixed:

- `/batch` stays the existing route
- the above-fold tool stays first
- URL mode stays the default mode
- homepage comparison is not a major section
- the lower page must be driven by raw research, not summary prose
- the lower page must stay in the homepage family of calm composition
- the lower page must not reintroduce many competing interface cards

## Raw Research Readout

The actual stage-3 research corpus points to five repeated pressures that matter most for `/batch`.

### 1. Users care about structure, not only text

Raw evidence repeatedly shows that users lose trust when headings, lists, tables, links, code blocks, or document hierarchy collapse during conversion.

Evidence:

- `docs/research/stage-3/document-intelligence-demand-evidence.csv`
- `docs/research/stage-3/domain-painpoints-evidence.csv`
- `docs/research/stage-3/adjacent-tools-demand-evidence.csv`

Examples from the corpus:

- headings and bullets flatten
- h2 and h3 structure breaks
- list items with anchors disappear
- tables lose columns or structure
- code blocks lose spacing and line breaks
- academic PDF markdown breaks formatting

Implication:

The lower page must explicitly address readable structure, not just "conversion."

### 2. Users care about truthful status, not just completion

Raw evidence shows repeated category distrust when a job reports success but returns empty, partial, or misleading output.

Evidence:

- `docs/research/stage-3/demand-evidence-direct-cohort.csv`
- `docs/research/stage-3/onboarding-pricing-demand-evidence.csv`
- `docs/research/stage-3/domain-painpoints-evidence.csv`

Examples from the corpus:

- jobs marked `completed` with empty data
- false-success states break automation trust
- users want zero-result causes surfaced explicitly

Implication:

The lower page must explain result truth using the tool's real vocabulary:

- usable
- degraded
- failed

It must not imply that every completed job is equally trustworthy.

### 3. Users care about progress, retries, and visible failure handling

Raw evidence shows that users do not only want extraction to happen. They want to understand what is happening, why it failed, and what they should do next.

Evidence:

- `docs/research/stage-3/demand-evidence-direct-cohort.csv`
- `docs/research/stage-3/domain-painpoints-evidence.csv`

Examples from the corpus:

- anti-bot loops hang instead of timing out cleanly
- users struggle to verify retries, sessions, and repeated 403s
- queue behavior becomes hard to trust on longer jobs
- users want targeted reruns and central failure handling

Implication:

The lower page must explain batch progress, degraded states, failed states, and retry behavior in plain language.

### 4. Users compare tools by workload fit

The research does not support organizing this page around abstract feature lists alone.

Evidence:

- `docs/research/stage-3/comparison-thread-demand-evidence.csv`
- `docs/research/stage-3/community-and-review-evidence.csv`

Examples from the corpus:

- users judge tools by which workload they handle well
- one-page reading is treated differently from repeated conversion or larger operational jobs
- predictable repeated workflows matter more than one-off demos once the user moves past first success

Implication:

The lower page should explain which jobs `/batch` is for.

### 5. Users want a fast first win without a fragile second step

Raw evidence shows category tools often look impressive in the first few minutes, then lose trust on the first meaningful edge case.

Evidence:

- `docs/research/stage-3/onboarding-pricing-demand-evidence.csv`
- `docs/research/stage-3/buyer-trust-matrix.csv`

Examples from the corpus:

- quick one-call markdown wins attract users
- second-step trust breaks when outputs fail, hang, or misreport status
- "fast pitch, fragile second step" is a repeated category pattern

Implication:

The lower page must reassure repeated-use trust, not only first-click curiosity.

## Current Tool Truth

The lower page must only claim what the tool currently supports above the fold.

### The tool can truthfully claim today

- batch conversion for URLs and uploaded documents on the existing `/batch` route
- visible progress bars
- per-item success and failure state
- explicit degraded results
- warnings on degraded rows
- retry of failed URLs
- retry of failed files
- multiple output formats
- individual downloads

### The tool must not overclaim today

- full provenance back to source cells or exact source structure
- deep structural scoring for every heading, table, or code block
- universal protected-site coverage
- guaranteed perfect PDF fidelity
- universal document-class success

Implication:

The lower page should use trust language, but it must stay inside the product's actual current truth surface.

## Content Strategy

The page should answer the real user questions in this order:

1. what kind of batch job this page is for
2. what the output tries to preserve
3. how the page reports usable, degraded, and failed results
4. what happens when a run does not succeed cleanly
5. which formats and workloads this route supports
6. the most repeated objections and trust questions from the corpus

That means the page should be organized by user concern, not by internal product modules.

## Information Architecture

The below-fold layer should be one continuous reading body with internal sectioning.

It should not be a pile of independent bordered cards.

### H2: Batch convert many URLs or files into readable documents

Purpose:

State the page's search-facing job in direct terms.

Why it exists:

The raw corpus shows users want a workload-fit explanation, not a vague workspace label.

What it must cover:

- this route is for repeated conversion work
- it supports both many links and many uploaded documents
- the goal is readable output that can be downloaded and reviewed

What it must not cover:

- homepage comparison as a primary idea
- broad category history

### H2: What Oleriq tries to preserve during batch conversion

Purpose:

Address the strongest raw research theme: structure fidelity.

Why it exists:

Users do not only want text. They want headings, lists, tables, links, code blocks, and readable document shape to survive conversion.

What it must cover:

- readable structure matters for people and downstream AI use
- headings, lists, tables, links, and code-like formatting are high-value parts of the output
- some files or pages can still degrade, especially on harder layouts

Required H3s:

#### H3: Readable structure matters more than plain text

This subsection should explain why "text extracted" is not the same as "document still useful."

#### H3: Where output can still degrade

This subsection should explain that harder PDFs, complex tables, and non-article layouts can still lose structure.

### H2: How batch results are reported

Purpose:

Turn the raw status-truth problem into a clear product promise.

Why it exists:

The corpus repeatedly shows that false-success states destroy trust.

What it must cover:

- usable means the item converted cleanly enough to treat as ready
- degraded means the item converted, but warnings matter
- failed means the item did not produce a usable converted result

Required H3s:

#### H3: Usable results

Explain the meaning of a clean result without overselling perfect fidelity.

#### H3: Degraded results

Explain why warnings appear and why this state exists.

#### H3: Failed results

Explain that failure is surfaced explicitly instead of being hidden behind a misleading success state.

### H2: Progress, retries, and trust during longer runs

Purpose:

Address the raw need for visible job-state truth and recovery.

Why it exists:

Users need reassurance during waiting, and they need next actions when some rows fail.

What it must cover:

- the page shows visible progress while work is running
- failed rows can be retried without rerunning the whole batch
- job-state clarity matters on longer or mixed-quality runs

Required H3s:

#### H3: What the progress state tells you

Explain what the running state means in practical terms.

#### H3: Why retry controls matter

Explain targeted retry in workload language, not implementation language.

### H2: Workloads this route is built for

Purpose:

Use the raw comparison evidence to frame `/batch` by job type.

Why it exists:

Users compare tools by workload fit, not by decorative feature lists.

What it must cover:

- many article or page URLs in one run
- mixed document uploads that need one export target
- repeated review, download, or processing workflows

What it must not do:

- turn into a competitive comparison page
- list every hypothetical use case

Required H3s:

#### H3: When batch URL conversion fits best

#### H3: When document batch conversion fits best

### H2: Batch conversion FAQ

Purpose:

Capture the highest-frequency objections and search phrasing from the corpus.

Why it exists:

The raw research repeatedly surfaces trust questions that users ask before or after the first meaningful failure.

FAQ topics should come from the raw evidence, not generic SEO templates.

Required H3 questions:

#### H3: Can batch conversion keep headings, lists, and tables readable?

#### H3: What does a degraded result mean?

#### H3: What happens if some URLs or files fail?

#### H3: Can I retry only failed items?

#### H3: Which formats can I download from a batch run?

#### H3: Does batch conversion work on every page or document?

This answer must be honest about limits and should not imply universal success.

## Copy Rules

The lower page should use the language patterns the corpus supports.

### Required wording direction

Prefer language like:

- readable structure
- headings, lists, tables, and code blocks
- usable result
- degraded result
- failed result
- progress
- retry failed items
- batch conversion
- many URLs or files
- predictable output

### Avoid weak or vague wording like

- seamless
- effortless
- perfect conversion
- flawless markdown
- universal support
- works on everything
- enterprise-grade

### SEO rule

Search phrasing should come from actual user jobs and repeated user complaints, not keyword stuffing.

The copy must sound like a serious workflow page, not a generic landing page.

## Design And Composition Rules

The lower page must inherit the homepage-derived composure already established on `/batch`.

### Required composition rules

- one continuous reading column
- strong vertical rhythm
- restrained typography changes
- minimal border usage
- no pile of equal-weight cards
- no visual competition with the tool above

### Content density rule

The lower page can be denser than the homepage, but it cannot feel cluttered or over-signaled.

### Section rhythm rule

Each H2 should feel like a meaningful reading stop.

Each H3 should tighten the point, not create decorative subdivision.

## Omission Rules

The lower page should not:

- become a homepage explainer
- compare the tool against many competitors by name
- promise capabilities the current tool does not expose
- introduce pricing or upsell framing
- become a giant feature catalog
- repeat above-fold instructions that the tool already makes obvious

## Decision Points Before Implementation

These choices still need explicit confirmation before UI implementation.

### Decision 1: Article-style body or lightly segmented sections

Recommended:

One continuous article-style reading body with restrained section separation.

Why:

It gives stronger search readability and avoids reintroducing the many-box problem.

### Decision 2: Whether to include a small internal link to homepage conversion

Recommended:

Yes, but only one small contextual mention inside workload-fit copy, not a major section.

Why:

It helps internal linking without diluting `/batch` as the main subject.

### Decision 3: Whether FAQ should live inside the same reading body or as a final compact accordion

Recommended:

Keep it in the same reading body first.

Why:

This keeps the page structurally calm and avoids a heavy widget feel unless the implemented page proves too long.

## Acceptance Criteria

The lower page is correct only if all of these are true:

- the first fold remains clearly tool-first
- the below-fold reading body is clearly about `/batch`, not the homepage
- each major section can be traced back to raw research pressure
- the copy uses user-job and trust language, not generic marketing filler
- the page claims only what the current tool can actually support
- the added content improves search readability without recreating the clutter problem

## Next Step

The next correct step after this spec is an implementation plan for the `/batch` below-fold content layer, followed by UI implementation and live browser verification.
