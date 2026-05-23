# External Systems Playbook

## Purpose

This file defines how Oleriq uses external design systems, skills, and theory sources without losing its own identity.

It is a companion file, not the constitutional source of truth.

The precedence order is:
1. [DESIGN.md](../../../DESIGN.md)
2. [PRODUCT.md](../../../PRODUCT.md)
3. this file
4. source corpora under `docs/research/design-sources/`

## Operating Rule

External systems are imported as behavior, critique, workflow, or theory.
They are not imported as a full visual override.

Oleriq uses them to strengthen weak areas in the local design system:
- critique quality
- route classification
- UX writing
- onboarding and empty states
- color judgment
- anti-slop enforcement
- artifact-first concept exploration on the right surfaces

External systems do **not** get to overrule:
- one-purpose-per-page
- route separation
- flat background law on core surfaces
- current token truth from the codebase
- the restraint model for primary task screens

## Route-Class Application

### Core tool surfaces
Examples:
- `/`

Allowed imports:
- Impeccable product-register thinking
- Impeccable critique, audit, clarify, onboard, harden, and polish concepts
- color-book guidance on contrast, harmony, context, and perception
- selected anti-slop bans from Taste Skill where they remove generic clutter

Blocked imports:
- multi-section landing-page composition
- hero-image narratives
- expressive navigation shells
- decorative motion systems
- gradients, blur, glow, or atmospheric image treatment
- image-first redesign as the primary method for the core task screen
- interface fragmentation that splits one task across several equal-weight bordered sections

### Product workflow surfaces
Examples:
- `/batch`
- admin or settings-style pages
- future queue, diagnostics, and export-detail pages

Allowed imports:
- Impeccable product register as the main operating model
- Open Design style discovery and critique workflow when shaping new surfaces
- Taste Skill anti-slop rules for hierarchy, card overuse, and spacing quality
- selective image-first exploration for complex secondary pages where visual structure matters
- critique pressure against interface sprawl, empty containers, and unnecessary panel splitting

Blocked imports:
- marketing-first composition that obscures the task
- decorative motion that does not explain state
- visual experimentation that weakens workflow predictability
- section inflation where several boxed areas compete before the user understands the first action
- empty downstream panels that appear before any state exists when they could stay hidden

### Narrative surfaces
Examples:
- future feature pages
- use-case pages
- about pages
- SEO pages

Allowed imports:
- strongest Open Design workflow concepts
- strongest Taste Skill image-first exploration concepts
- selected Impeccable brand-register ideas where the surface is clearly narrative rather than task-first
- broader composition and editorial pacing than core tool surfaces allow

Still blocked:
- generic AI gradient tropes
- decorative excess that weakens trust
- style drift that breaks the product’s tone or token system

## Source-by-Source Rules

## Impeccable

Primary use:
- governance companion
- critique system
- product-vs-brand register discipline
- UX writing discipline
- onboarding, empty-state, hardening, and polish checks

Why it fits:
- it expects `PRODUCT.md` and `DESIGN.md`
- it is designed to read a real codebase before changing output
- it separates strategy from visual implementation
- it is strong on product UI correctness, copy clarity, and anti-pattern detection

What to adopt:
- register split
- route-aware design judgment
- deterministic anti-pattern awareness
- UX writing rules
- contrast and state-completeness discipline
- critique and audit habits

What not to adopt blindly:
- permissive use of system fonts or Inter when local tokens already define the type system
- any recommendation that conflicts with existing hard bans in `DESIGN.md`

## Open Design

Primary use:
- brief-locking
- discovery questions
- artifact-first exploration
- design critique workflow
- design-system and prompt-stack awareness

Why it fits:
- it looks for local `DESIGN.md`
- it treats artifacts and critique as part of the process rather than afterthoughts
- it is stronger as a workflow model than as a direct house style for Oleriq

What to adopt:
- ask sharper discovery questions before big UI work
- lock the brief before visual expansion
- critique work against hierarchy, specificity, restraint, and execution
- keep working artifacts on disk when exploring new surfaces

What not to adopt blindly:
- large preset system libraries
- multi-surface desktop-app mentality
- default direction pickers as a replacement for local product judgment
- broad media-generation surface logic on task-first Oleriq routes

## Taste Skill

Primary use:
- anti-slop enforcement
- image-first concept generation for selected surfaces
- stronger hierarchy and composition awareness
- aggressive rejection of repetitive AI layout clichés

Why it fits:
- it is useful when a page needs stronger visual concepting
- it is strong at preventing generic safe layouts
- it forces a better eye for spacing, rhythm, and visual memory

What to adopt:
- anti-default-AI vigilance
- fewer repetitive card grids
- stronger hierarchy and visual anchors
- better CTA restraint
- image-first exploration for narrative or visually important secondary pages

What not to adopt blindly:
- default landing-page worldview
- blur and atmospheric treatment from examples
- motion intensity assumptions
- multi-section marketing shells on core tool surfaces
- section inflation or moodboard-style fragmentation on product workflow pages
- typography or palette rules that contradict current token truth

## Color Book

Source:
- [README](../../research/design-sources/color-book/README.md)
- [full-book.md](../../research/design-sources/color-book/full-book.md)
- [full-book.txt](../../research/design-sources/color-book/full-book.txt)

Primary use:
- color theory source corpus
- contrast, perception, harmony, context, and application guidance
- long-form design judgment support for future agents

What to extract into practice:
- color is relational, not fixed
- contrast depends on lightness and context, not hue alone
- harmony is not sameness
- accessibility must be considered at design time, not after styling
- symbolic meaning and emotional associations matter, but must not replace legibility

What not to do:
- do not paste book prose directly into production UI copy
- do not turn theory terms into ornamental design jargon
- do not treat one color principle as a universal law outside context

## Decision Flow For Future Agents

Before visual work on any route:
1. read `README.md`
2. read `DESIGN.md`
3. read `PRODUCT.md`
4. identify the route class
5. use this file to choose which external system concepts are allowed
6. only then create or modify UI

## Conflict Resolution

If systems conflict, resolve in this order:
1. `DESIGN.md` hard law wins
2. `PRODUCT.md` route class and product register win next
3. this playbook chooses the safe subset of external ideas
4. external source defaults lose if they contradict the first three

## Current Verified Gaps Relevant To This Playbook

- The homepage currently drifts from the one-purpose rule and should be corrected before any richer visual expansion is attempted.
- EPUB is present in the repo as a research source format, but the current product upload and conversion pipeline does not yet support `.epub` as a user-facing input format.
