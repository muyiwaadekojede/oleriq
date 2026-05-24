# Cross-Format Structure Recovery Layer

## Purpose

This spec defines the next feature lane after the `/batch` redesign and trust-surface work.

The product already tells users when structure may have been damaged.

That is no longer enough.

The next step is to improve the output itself across the supported content types.

## Problem

Oleriq already accepts a wider range of source content than the earlier roadmap wording implied.

Current supported source inputs include:

- web pages and extracted HTML
- PDF
- DOCX
- EPUB
- TXT
- Markdown
- HTML and HTM files
- CSV, TSV, JSON, XML, YAML, YML, LOG, and RST

Current shipped export outputs are:

- PDF
- DOCX
- Markdown
- TXT

The product problem is not limited to one output format.

The real problem is that structure can be lost at multiple points:

- while reading the source
- while normalizing it
- while converting it to an export-specific representation

If Oleriq only improves one format, the user promise stays inconsistent.

## Product Goal

Oleriq should improve structure preservation across all supported content types that materially affect usability.

That means:

- stronger preservation for all shipped output formats
- stronger recovery from all supported input families where structure can realistically be improved

This does not mean every type is solved with one identical implementation pass.

## Why This Must Be Phased

The source and output types do not fail in the same way.

Examples:

- TXT is a plain-text loss problem
- Markdown is a structure-mapping problem
- DOCX is a document-generation problem
- PDF is mainly a rendering and layout-preservation problem
- PDF and DOCX inputs are source-parsing problems before they are export problems

Because of that, the correct architecture is one shared recovery layer plus format-specific adapters.

Not one large set of ad hoc fixes.

## Success Definition

The feature is working correctly only if all four statements are true:

1. the recovered structure is richer than the current baseline
2. the exported output keeps more of that structure in real fixtures
3. trust warnings become more exact, not noisier
4. no current clean conversions regress on the shipped corpus

## Non-Goals

This feature must not claim:

- universal perfect fidelity
- exact visual reproduction in every output format
- full recovery of every complex table
- guaranteed reconstruction of arbitrary layout-heavy PDFs

The product truth must remain narrower than that.

## Core Design

### 1. Shared recovered-structure layer

Add one internal recovered-structure representation between source extraction and export rendering.

This layer should capture the parts of content that most directly affect usability:

- heading depth
- paragraph flow
- nested list structure
- table structure
- code block boundaries
- quote boundaries
- figure and caption relationships
- block ordering

This layer exists so Oleriq does not have to rediscover structure separately inside every exporter.

### 2. Source-specific recovery passes

Each major input family should improve the recovered-structure layer in the way that best fits its failure mode.

#### HTML and extracted web content

What it does:

- recovers structure from semantic HTML or HTML-like content
- preserves heading trees, list nesting, code blocks, and table boundaries before export

Why it exists:

- this is the common path for homepage extraction, URL batch extraction, and several document conversions

What could go wrong:

- over-aggressive heuristics can invent structure that was not real
- layout tables can be mistaken for data tables

How to know it is working:

- current HTML fixtures export with fewer structure-loss warnings
- heading, list, code, and table fixtures preserve more usable shape in `md`, `txt`, and `docx`

#### PDF input recovery

What it does:

- improves reconstruction of reading order, headings, lists, code blocks, tables, and page-spanning sections from PDF source material

Why it exists:

- PDFs are one of the highest-pain document types in the research

What could go wrong:

- fake structure can be inferred from purely visual spacing
- multi-column or form-like layouts can scramble reading order

How to know it is working:

- PDF corpus fixtures show stronger section continuity
- fewer false-success states on table-heavy and multi-page PDFs
- trust reasons remain accurate when recovery still fails

#### DOCX and EPUB input recovery

What it does:

- uses the document's native structure when it exists instead of flattening too early

Why it exists:

- these formats often already contain structural clues that Oleriq should preserve

What could go wrong:

- embedded media and mixed layout blocks can still degrade
- style-based headings may be inconsistently authored

How to know it is working:

- headings and lists survive more often in exports
- image-caption and figure-order handling becomes more stable

#### Structured text-like documents

What it does:

- keeps obvious block semantics for formats like Markdown, RST, CSV, TSV, JSON, XML, YAML, and logs when those are routed through document conversion

Why it exists:

- these files may already be structured and should not be flattened by generic cleanup

What could go wrong:

- parser shortcuts can over-normalize source formatting
- machine-readable content can be made less reusable by reader-style rewriting

How to know it is working:

- structured-text fixtures preserve obvious boundaries and block intent in exports

### 3. Output-adapter upgrades

Each shipped export format should consume the shared recovered-structure layer in a format-appropriate way.

#### Markdown export

What it does:

- maps the recovered structure into better headings, nested lists, code fences, figures, and table output

Why it exists:

- Markdown is one of the main reusable formats in the product

What could go wrong:

- inconsistent table serialization
- broken nesting depth

How to know it is working:

- Markdown fixtures preserve heading depth, list nesting, and code blocks better than the current baseline

#### TXT export

What it does:

- preserves readable section flow, list continuity, code boundaries, and table fallbacks without pretending TXT can hold rich layout

Why it exists:

- TXT is intentionally lossy, but it still needs to remain understandable

What could go wrong:

- fake alignment can make TXT harder to read
- warnings may become misleading if TXT limits are hidden

How to know it is working:

- TXT stays honest while preserving more readable hierarchy than the current baseline

#### DOCX export

What it does:

- maps recovered structure into document-native blocks, headings, lists, tables, and code-like formatting

Why it exists:

- DOCX is the richest editable export in the current surface

What could go wrong:

- exporter complexity can create regressions in numbering, spacing, or table layout

How to know it is working:

- DOCX outputs preserve more structure in real fixtures and remain editable without obvious corruption

#### PDF export

What it does:

- uses the recovered structure to improve section organization before final rendering

Why it exists:

- users treat PDF as the highest-fidelity export

What could go wrong:

- improvements can overfit one layout style and break another

How to know it is working:

- PDFs stay visually coherent on the corpus and do not regress on current clean outputs

## Priority Order

The work should ship in this order:

1. shared recovered-structure layer
2. HTML and extracted-web recovery pass
3. Markdown and TXT adapter upgrades
4. DOCX adapter upgrade
5. PDF input recovery improvements
6. DOCX and EPUB input recovery improvements
7. structured text-like input protection

This order is correct because the early steps benefit the broadest amount of traffic and the largest current trust gap.

## Test And Verification Requirements

This feature must be test-first and corpus-backed.

The verification set must include:

- existing homepage and `/batch` E2Es
- direct-file regressions
- batch document regressions
- live corpus sweep
- structure-specific fixtures for headings, nested lists, tables, code blocks, and layout-heavy files

Success must be measured by:

- fewer structure-loss warnings where recovery genuinely improved
- unchanged warnings where the format is still inherently lossy
- no regressions on current usable cases

## Browser And Product Proof

The shipped proof should include:

- one homepage structure-heavy case
- one URL batch structure-heavy case
- one document batch structure-heavy case
- one PDF-heavy or table-heavy case

The proof must show both:

- what improved
- what still remains limited

## Decision Points Already Fixed

These decisions are already fixed for this spec:

- this feature targets all supported content types at the product level
- this feature ships in phases, not as one giant rewrite
- warnings stay in place; they are refined, not removed
- truth stays narrower than universal-fidelity marketing

## Next Execution Step

The next implementation pass should start by defining the shared recovered-structure representation and writing failing structure-preservation tests against the current Markdown and TXT exporters first.
