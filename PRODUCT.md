# Product

## Register

product

## Users

Oleriq is for people who need to turn a URL or an uploaded document into a clean, exportable reading artifact with minimal friction. The default user is task-focused, short on time, and trying to get usable output fast rather than explore a feature-rich interface.

Primary user groups in the current product shape:
- knowledge workers collecting source material
- researchers or students converting pages and documents into cleaner reading formats
- operators processing batches of URLs or files for later export
- anyone who values clarity, speed, and trust over feature theater

## Product Purpose

Oleriq exists to reduce the gap between raw web or document input and trustworthy, exportable output.

The core promise is not broad scraping power. The core promise is calm, understandable conversion:
- paste a URL and get a clean document
- upload supported documents and convert them into useful output formats
- use batch workflows when the job is bulk processing rather than single-item reading

Success looks like this:
- the user understands what the product is for immediately
- the first successful output feels clean and dependable
- failure states are legible instead of mysterious
- richer workflows never pollute the primary task surface

## Brand Personality

The brand personality is:
- calm
- exact
- trustworthy

Voice and tone implications:
- precise without sounding cold
- restrained without sounding empty
- helpful without hype
- confident without marketing theatrics

Typography implications:
- `Newsreader` carries display and editorial headings
- `Geist Sans` carries body copy, controls, labels, and UI state text
- the pairing should feel current and exact, not literary or ornamental

## Anti-references

Oleriq should not look or sound like:
- a generic AI landing page with gradients, glow, and inflated claims
- a dashboard-first tool that surfaces internal machinery before user value
- a “feature buffet” homepage with stacked sections, trust bars, and competing calls to action
- a dark, cinematic, motion-heavy product that asks the user to admire the interface instead of using it
- a vague lifestyle brand with beautiful surfaces but unclear task boundaries

## Design Principles

1. One purpose per screen.
Each primary surface should have one dominant job, one clear action path, and no competing sections fighting for attention.

2. Trust over spectacle.
Users should leave with confidence in the output, not a memory of decorative UI treatment.

3. Calm first impression, richer depth only when earned.
The first layer of the product should feel quiet and obvious. Complexity can appear in dedicated workflow routes, not in the core task entry surface.

4. Design serves comprehension.
Hierarchy, spacing, copy, color, and motion exist to improve understanding, not to create decorative novelty.

5. Route class decides visual freedom.
Core tool surfaces stay highly restrained. Narrative surfaces may become more expressive, but only without breaking the product’s tone or trust posture.

6. Homepage composure is the visual baseline.
Later product surfaces may become denser, but they should still inherit the homepage’s calm first-screen framing instead of introducing new page-level chrome by default.

## Route Classes

### Core tool surfaces
These are the most constrained surfaces. Design serves the task directly.

Current and default examples:
- `/`

Rules:
- one dominant task
- one dominant interactive surface on first view
- no stacked marketing sections
- no inline trust widgets, metrics, or decorative product chrome
- minimal navigation and minimal branching
- defer limits, help, and secondary status until they are relevant or clearly subordinate to the main task
- external systems may influence critique and copy quality, but not override the restraint model
- page titles and first-screen copy must name the concrete job clearly instead of relying on generic workspace language
- SEO shaping follows user intent and product truth; it does not decide the page message first
- the homepage content group remains the compositional reference for other product surfaces

### Product workflow surfaces
These are still product-register surfaces, but they can support denser utility when the job requires it.

Current examples:
- `/batch`
- admin or settings-style utility pages
- diagnostics, queue, export, or failure-detail surfaces if added later

Rules:
- maintain the calm token system and component language
- allow panels, secondary states, and denser controls when function requires them
- prefer clarity, state completeness, and recoverability over visual drama
- keep one active workspace surface as the visual center of the first screen
- merge adjacent setup information into the current workspace before creating another bordered section
- hide downstream activity or result surfaces until there is meaningful state, unless the empty state is required to explain the workflow
- use composition, sequencing, and copy to reduce noise before adding or splitting interface boxes
- start the page with the user task, expected output, and trust signal before any secondary explanation
- avoid generic workflow names when the page can state the exact job being done
- inherit the homepage’s page-level calm first, then add density only inside the working surface

### Narrative surfaces
These are persuasion or explanation surfaces that may be added later.

Expected examples:
- feature pages
- use-case pages
- SEO pages
- about or methodology pages

Rules:
- may borrow stronger editorial composition, image-first exploration, or broader narrative pacing
- must still respect Oleriq’s tone, token system, and truth-first product posture
- must never redefine the core tool surfaces by stealth
- still must make the first meaningful action obvious without fragmenting the top of the page into several equal-weight boxes

## Design Source Precedence

When multiple design sources are available, use them in this order:

1. `DESIGN.md` for core visual law and hard prohibitions
2. this `PRODUCT.md` for route class, register, users, tone, and product priorities
3. `docs/design/playbooks/external-systems.md` for controlled use of external systems and source material
4. source corpora under `docs/research/design-sources/` for deeper theory or reference material

If two sources conflict, the higher source wins.

## Accessibility & Inclusion

Target WCAG AA as the baseline for product work.

Minimum expectations:
- text and UI contrast must remain legible in real use
- color alone must not carry essential meaning
- motion must remain restrained and respect reduced-motion preferences
- labels, errors, and empty states should help users recover without guesswork
- core task surfaces should remain easy to scan, keyboard-friendly, and low-clutter
