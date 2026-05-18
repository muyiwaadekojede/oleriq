# /batch Redesign Brief

## Purpose

This brief defines the first design refresh pass for `Clearpage`'s `/batch` route.

It does not change the route's role. It sharpens the route so it feels authored, calm, and exact instead of merely functional.

The homepage is not part of this implementation pass except for later polish work that preserves the existing one-purpose homepage law.

## Why This Pass Exists

The current `/batch` surface is structurally correct, but its hierarchy is still flatter than the design system now allows.

The page already follows the right product rules:

- batch work lives on `/batch`
- URL mode remains the default
- document work remains a sibling mode
- the page uses the calm token system

The remaining gap is compositional quality:

- the title, tabs, panels, and action rows do not yet feel staged strongly enough
- the URL and document modes feel related, but not fully unified
- the empty states are useful, but not memorable or self-explanatory enough
- progress and operational status exist, but do not yet guide the eye with enough intent

## What Will Not Change

These decisions are locked for this pass:

- `/batch` stays the workflow route
- URL mode stays the default
- URL and document workflows stay inside one shared page
- technical limits remain visible
- individual downloads remain the output behavior
- the token system, flat backgrounds, and no-blur rule stay in force
- no marketing-style sections are added
- no gradients, glass, glow, or decorative motion are introduced

## Target Outcome

After this pass, `/batch` should feel like a composed workflow surface with:

- a clearer top-to-bottom reading order
- a stronger primary action path
- more deliberate spacing and grouping
- calmer but sharper empty states
- better separation between setup, running state, and results
- one coherent visual system across URL mode and document mode

## Route Role

`/batch` is a product workflow surface, not a narrative page and not a homepage variant.

That means the page is allowed to be denser than `/`, but the density must still feel disciplined. The goal is operational clarity, not visual novelty.

## Design Direction

### 1. Stronger page framing

The page should read in four clear layers:

1. page identity
2. mode selection
3. current workflow panel
4. output and progress state

The current page already contains these parts, but they are not distinct enough in rhythm or emphasis.

### 2. One dominant action per mode

Each mode should have one visually dominant action:

- URL mode: `Start Batch`
- Document mode: `Start Batch`

All other controls should read as secondary utilities.

`Download` stays important, but it should not visually compete with the start action before results exist.

### 3. Shared workflow language

URL mode and document mode must feel like two entries into the same engine, not two separate mini-products.

The panel framing, meta copy, action spacing, and result treatment should use the same logic even when the controls differ.

### 4. Better empty-state guidance

The empty state should explain the next action faster.

It must stay spare, but it should feel deliberate rather than passive.

### 5. State-driven clarity

Queued, processing, success, and failure states should be easier to scan.

Status must be readable without decorative devices or excessive badges.

## Structural Changes

### Header block

Keep:

- `Batch Workspace` title
- `Back to Homepage` link

Change:

- tighten spacing between title and tab row
- make the page header feel more anchored to the workflow beneath it
- reduce the sense that the back link is a competing action

### Mode switcher

Keep:

- two top-level modes: `URLs` and `Documents`

Change:

- treat the switcher more like a controlled surface selector than two ordinary buttons
- increase clarity of active vs inactive state
- align spacing and width logic so the switcher feels intentional

### Workflow panel

Keep:

- one panel per active mode

Change:

- separate setup controls from status/results more clearly
- introduce a stronger internal grouping rhythm
- reduce the feeling that everything is placed on one flat plane

### URL mode

Keep:

- URL textarea
- format selector
- import control
- start action
- download all action
- results list

Change:

- stage setup controls more clearly around the textarea
- make the count and cap information feel integrated instead of appended
- make the results region feel like a downstream state, not just more content below

### Document mode

Keep:

- upload dropzone
- format selector
- document image toggle
- start action
- download all action
- selected files list
- results list

Change:

- make the dropzone feel more like the first step of a workflow
- clarify the relationship between upload state, file list, and conversion action
- make image-mode controls feel integrated instead of bolted on

## Visual Rules For This Pass

- keep the existing color tokens
- keep the existing fonts
- keep flat backgrounds
- keep white utility panels with bordered edges
- keep rounded geometry
- add no shadows unless there is a documented exception
- use spacing, type scale, and grouping before adding any new visual treatment

## Risks

### Risk 1: Overdesign

If the page becomes more expressive than its route class allows, it will break the product law.

How to avoid it:

- no decorative sections
- no visual storytelling layer
- no homepage-style ambition on this route

### Risk 2: Workflow confusion

If hierarchy changes are too aggressive, the page could become prettier but slower to use.

How to avoid it:

- preserve all core controls
- keep the tab model unchanged
- test setup-to-run flow in both modes after each change

### Risk 3: Cross-mode drift

If URL mode and document mode are redesigned separately, the page will feel inconsistent.

How to avoid it:

- define one shared panel grammar first
- apply it to both modes in the same pass

## Success Criteria

This redesign is successful when:

- the first screen explains itself faster
- the start action is visually obvious in both modes
- empty state, running state, and results state are easier to distinguish
- URL mode and document mode clearly belong to the same system
- no part of the page violates the current `DESIGN.md` or `PRODUCT.md` route rules

## Implementation Boundaries

This pass includes:

- `/batch` layout and hierarchy refinement
- copy and spacing refinement inside batch panels
- control emphasis refinement
- empty-state and status treatment refinement

This pass excludes:

- homepage redesign
- new batch capabilities
- new routes
- pricing or plan messaging
- marketing content
- changes to URL default behavior

## Recommended Build Order

1. establish shared `/batch` header and mode-switcher rhythm
2. redesign URL mode hierarchy
3. redesign document mode hierarchy using the same grammar
4. refine results and progress treatment
5. run browser checks on both modes
6. only after `/batch` is stable, do the homepage polish pass

## Approval Check

Implementation should start only if the following are accepted together:

- `/batch` first, homepage second
- refinement, not visual reinvention
- one shared system across URL and document modes
- stronger hierarchy without adding marketing-style chrome
