# /batch First Fold And Below Fold Redesign

## Purpose

This spec replaces the old below-fold-only redesign direction.

The old direction is no longer enough because the real problem is not only the article body below the fold.

The real problem is the full `/batch` attention system.

The first fold is too crowded.

The below fold is too generic.

The route now also has a stronger truth model than the older spec assumed. The product can now show `usable`, `partial`, `degraded`, and `failed`, along with more exact row-level diagnostics.

This redesign must therefore cover the whole route, not only the lower body.

## Why The Old Direction Is Incomplete

The earlier below-fold spec was correct about one thing: `/batch` needs proof, not decorative marketing structure.

But it missed the bigger problem.

The first fold still behaves like too many decisions are visible at once.

That creates the same kind of clutter that later appears in the article body.

If the first fold remains noisy, a cleaner below fold will not fix the route.

## Research Basis

This redesign is grounded in the current user-research burden for `/batch`:

- structure surviving conversion
- truthful run and row states
- visible failure handling and recovery
- repeated work that stays understandable under longer runs

The route is not mainly trying to persuade.

It is mainly trying to help users trust repeated conversion work.

## Product Truth Boundary

The redesign may only express what the product can honestly support today.

The route can currently support and claim:

- one shared `/batch` route for URL and document batch conversion
- progress visibility during longer runs
- per-row status and row-level quality truth
- `usable`, `partial`, `degraded`, and `failed`
- row-level warnings and next-step guidance
- retry flows for failed rows
- multiple output formats
- document-image handling as an advanced option
- individual downloads

The route must not imply:

- universal structural fidelity
- perfect media retention across every format
- full provenance for every recovered element
- universal protected-site success
- automatic deep structural scoring for every row

## Design Thesis

`/batch` should behave like one calm instrument across three states:

1. before run
2. during run
3. after run

It should not behave like a dashboard.

It should not behave like a stack of equal-weight utility panels.

It should not explain too much of its own logic in visible helper boxes.

The interface itself should communicate the sequence by what it reveals and what it withholds.

## Core Route Rules

### 1. One shared shell

`URLs` and `Documents` stay inside one shared shell.

Mode switching should not turn the route into two visually different tools.

Only these things change by mode:

- the input surface
- the advanced options inside `More options`
- the copy needed to explain the current mode

Everything else should preserve one route identity.

### 2. One dominant surface

The route keeps one dominant working surface above the fold.

Progress, trust, row inspection, and recovery should remain tied to that same surface instead of opening a second equal-weight panel by default.

### 3. Progressive disclosure

Do not show every decision at once.

The interface should reveal only what matters in the current state.

This is the main anti-clutter rule for the redesign.

### 4. Explanation by structure, not helper boxes

Visible annotation boxes such as `Hidden until needed...` are allowed in brainstorming mockups, but they do not belong in the shipped UI.

The shipped UI should communicate behavior through sequencing and placement, not through self-explanatory scaffolding.

### 5. Trust before comfort

Whenever there is tension between looking tidy and showing important truth, preserve truth.

But truth should be shown at the right moment, not all at once.

## First Fold Design

### State 1: Before run

The first fold before the run starts should show only:

- mode switch
- page title and short trust-oriented framing
- input surface
- output format
- start action
- `More options`

Everything else should stay hidden until relevant.

#### Hidden before run

These stay inside `More options` or stay absent until needed:

- import from file
- document-image retention options
- technical limits
- estimated download time
- bulk download controls
- retry controls
- detailed trust counts
- row list

### `Documents` mode

`Documents` mode keeps the same shell.

It only swaps the input surface and the advanced options content.

That means the page still feels like one instrument instead of a second sub-product.

### `More options`

`More options` opens as an inline reveal inside the same panel.

It must not open in a modal, side sheet, or detached drawer.

Those patterns create another surface and weaken the single-object behavior.

### Mobile

On mobile, this same state must remain true.

The page may stack vertically, but it must not reveal extra settings just because the viewport changed.

## During-Run Design

### State 2: During run

When the run starts, the setup emphasis recedes.

The primary visible elements become:

- current progress
- compact run context such as total items and chosen output format
- one short state sentence only when the run needs to explain a non-obvious state

The point is to make the run itself the object of attention.

### During-run trust visibility

Detailed review must not explode open immediately.

However, the route still needs inspectability during longer runs.

The correct balance is:

- progress stays primary
- row inspection remains available only when there is settled state worth inspecting
- row inspection should enter quietly, not as a competing second panel

## After-Run Design

### State 3: After run

Once the run has enough completed work to review, the surface shifts into inspection mode.

That state should show:

- one compact run-level summary
- row list ordered by attention priority
- row expansion for detail and action

### Run-level summary

Keep one compact summary above the rows:

- `usable`
- `partial`
- `degraded`
- `failed`

This summary must remain quiet.

It is there to orient the user, not to compete with the rows.

### Row ordering

Rows should be ordered by severity first:

1. `failed`
2. `partial`
3. `degraded`
4. `usable`

This is better than original input order because the rows needing attention rise first.

### Clean rows

`Usable` rows should not compete with rows that need attention.

The main review surface should prioritize non-clean outcomes.

`Usable` rows should sit behind a quiet `Show clean rows` control.

### Collapsed row design

A collapsed row should show only:

- title
- status
- expand affordance

Do not show download or retry actions in the collapsed state.

Do not open any row by default.

### Expanded row design

When a row is expanded, it may reveal:

- short state explanation
- structured warning or next-step guidance
- download action when applicable
- retry action when applicable
- source link only when it clarifies which origin produced the row

Expanded detail should stay compact.

The row is not a mini dashboard.

## Below Fold Design

The below fold remains a workflow evidence layer, not a marketing section.

But it must now inherit the same route logic as the first fold.

That means the below fold should feel calmer, more exact, and more proof-led than the current article wall.

### Required below-fold job

The below fold should prove:

- what readable structure Clearpage tries to preserve
- how `usable`, `partial`, `degraded`, and `failed` differ
- how longer runs stay inspectable and recoverable
- when `/batch` is the right route versus the lighter one-off path

### Required structure

#### 1. Route proof lead

Use one strong route-level artifact, ideally based on the real first-fold and run-state behavior.

#### 2. Structure preservation proof

Use one fidelity-focused artifact that explains where structure survives and where it can flatten.

#### 3. Status truth artifact

This section must now use the four-state truth model:

- `usable`
- `partial`
- `degraded`
- `failed`

`Partial` must be clearly visible as distinct from both `usable` and `degraded`.

#### 4. Run recovery artifact

Show how longer runs stay understandable and recoverable without making the route feel like a dashboard.

#### 5. Workload-fit qualifier

Keep this compact and secondary.

#### 6. Compact FAQ

Keep this late, quiet, and compressed.

## What Must Be Removed

Remove or avoid these patterns in the real implementation:

- equal-weight stacked panels on first load
- visible helper scaffolding that explains hidden behavior
- long prose-first sections below the fold
- expanded row detail for every row at once
- action-heavy collapsed rows
- making `usable` rows compete with the rows that need attention
- turning progress and trust review into a dashboard aesthetic

## Copy Direction

Use research-grounded wording wherever possible.

The route should keep using direct user-language ideas such as:

- clean output you can actually use
- what was extracted
- what stayed readable
- where the limits showed up
- false-success states

Microcopy should stay plain, short, and operational.

## Verification Requirements

The final implementation should be judged against these checks:

### First fold

- one dominant working surface only
- no second equal-weight panel on first load
- `More options` inline reveal only
- `Documents` mode keeps the same shell
- before-run state shows only the essential setup controls

### During run

- progress becomes the dominant signal
- row review does not explode open too early
- longer runs still remain inspectable

### After run

- compact four-count summary remains quiet
- severity-first row ordering
- no row open by default
- no actions visible on collapsed rows
- clean rows can be hidden behind secondary reveal

### Below fold

- proof-led, not prose-led
- uses the four-state truth model
- remains subordinate to the first fold
- avoids repeated equal-weight mini-cards and slab FAQ stacks
- on desktop, paired proof chapters must not leave stranded vertical gutters from unequal column heights; if a support block is needed, it should drop into its own full-width continuation row

## Supersession Note

This spec supersedes the older below-fold-only redesign direction in `2026-05-19-batch-proof-led-below-fold-redesign.md`.

That older file should be treated as historical context, not as the current route-design source of truth.
