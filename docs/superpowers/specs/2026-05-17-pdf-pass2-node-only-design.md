# PDF Pass 2 Design

Date: 2026-05-17
Status: Draft for review
Scope: Node-only PDF source-image retention for the existing `/batch` document workflow

## 1. Goal

Pass 2 adds source-image retention for PDF inputs inside the existing document conversion pipeline.

What this feature does:
- keeps PDF source images when the user selects `images=on`
- keeps readable image placeholders when the user selects `images=captions`
- removes source images when the user selects `images=off`
- places recovered images near their most likely reading position when confidence is high enough
- falls back to later page-order preservation when confidence is low instead of dropping the image or forcing fake exact placement

What this feature does not do:
- perfect visual reconstruction of arbitrary PDF layout
- OCR for scanned PDFs that do not expose usable text or drawing metadata
- Python-assisted parsing or external native workers
- changes to the homepage, URL mode, or route structure

## 2. Why This Exists

Clearpage already supports image-aware EPUB, DOCX, and HTML conversion in Pass 1.

PDF remains the major gap because the current ingestion path only extracts text through `pdf-parse`, which drops source images before export generation. That means the current `images` control is not truthful for PDF uploads.

Pass 2 exists to make PDF behavior closer to user expectation while preserving the current Node-first deployment shape.

## 3. Current State

Today the PDF path works like this:
- PDF input enters `convertDocumentBuffer(...)`
- `buildConversionSource(...)` detects `fileKind === 'pdf'`
- `pdf-parse` extracts text only
- the resulting HTML is synthetic paragraph HTML built from text blocks only
- exporters for MD, TXT, DOCX, and regenerated PDF never see source images

This means:
- `images=off` is effectively always true for PDF inputs today
- `images=on` cannot currently preserve source PDF images
- `images=captions` cannot currently produce meaningful image placeholders from PDF source content

## 4. Chosen Approach

Chosen approach: operator-list guided placement with low-confidence fallback to later page-order preservation.

This approach uses `PDF.js` page data to build two sets of evidence per page:
- text blocks
- image blocks

Then it estimates which text block each image belongs near.

If confidence is high enough, the image is inserted near that text block in generated HTML.

If confidence is low, the image is preserved later in page order for that page instead of being forced into a misleading position.

This is the best balance between fidelity and runtime simplicity under the Node-only constraint.

## 5. Alternatives Considered

### Option A: page-order preservation only

Description:
- extract images from each page
- keep them in page order without placement estimation
- append them after the nearest stable page section or at the end of the page output

Why not chosen:
- simpler, but weaker on mixed-layout PDFs where images clearly belong between paragraphs
- would preserve too many images in visibly late positions even when placement evidence exists

### Option B: operator-list guided placement

Description:
- use `PDF.js` operator and text metadata
- estimate image geometry and nearby text geometry
- place images near the most likely reading position
- fall back to page-order preservation when confidence is low

Why chosen:
- best fidelity that still stays Node-only
- bounded complexity compared to full layout reconstruction
- honest fallback behavior when confidence is weak

### Option C: near-layout reconstruction

Description:
- attempt to rebuild page layout tightly from PDF drawing operations

Why not chosen:
- high complexity
- high edge-case risk
- slower conversions
- not necessary for the current product promise

## 6. Product Behavior

### Supported surface

This feature stays on the current `/batch` document workflow.

URL mode remains the default on `/batch`.

No new route is introduced.

### User-facing image modes for PDF input

`off`
- remove recovered source images from generated HTML
- export text only

`captions`
- replace each recovered image with a readable placeholder
- label format should follow the existing convention: `[Image: ...]`
- labels should use the best available evidence in this order:
  1. nearby figure or caption text if available
  2. page number plus ordinal label such as `page 3 image 2`

`on`
- preserve recovered source images in generated HTML
- if placement confidence is high, place near likely reading position
- if placement confidence is low, preserve later in page order for that page
- TXT output still degrades `on` to readable captions, matching Pass 1 behavior

## 7. Architecture

### 7.1 New PDF extraction layer

Add a PDF-specific image-aware extraction path inside `lib/documentConversion.ts`.

This layer should:
- load PDF pages through `PDF.js`
- collect text content with geometry
- collect image draw operations with geometry
- recover image bytes when possible
- build page-level HTML sections that include text and preserved images

### 7.2 Core internal model

Introduce an internal page model for PDF conversion:
- `PdfTextBlock`
  - page index
  - bounding box
  - normalized text
  - reading-order rank
- `PdfImageBlock`
  - page index
  - bounding box
  - encoded image source or recoverable bytes
  - ordinal index within page
  - confidence metadata
- `PdfPageModel`
  - ordered text blocks
  - ordered image blocks
  - page heading marker if one exists

This model exists so placement and fallback logic can be tested independently from export generation.

### 7.3 Placement estimator

The placement estimator should score candidate insertion points using:
- vertical proximity
- horizontal overlap
- whether the image is between two text blocks
- whether the image appears before or after the nearest text block in page reading order
- whether the image is likely decorative page art rather than content art

The estimator returns:
- matched insertion target when confidence is above threshold
- low-confidence result when the score is below threshold

### 7.4 Fallback behavior

When confidence is low:
- `images=on`: preserve the image later in the same page section instead of forcing a false exact position
- `images=captions`: emit a placeholder later in the same page section
- `images=off`: drop the image

This fallback exists because wrong placement is worse than slightly late placement.

## 8. Data Flow

1. uploaded PDF reaches `convertDocumentBuffer(...)`
2. file kind resolves to `pdf`
3. PDF-specific image-aware extraction builds `ConversionSource`
4. source HTML contains text plus preserved image markers or image tags
5. existing image-mode transform runs on that HTML
6. existing exporters generate MD, TXT, DOCX, or regenerated PDF

This keeps Pass 2 aligned with the same export boundary used by Pass 1.

## 9. Error Handling

### Recoverable cases

If a page exposes text but some images cannot be recovered:
- continue conversion
- preserve what can be recovered
- omit only unrecoverable images

If a page exposes image geometry but no stable placement target:
- use the low-confidence fallback

If an image format is unsupported for embedding:
- degrade to caption placeholder

### Hard-failure cases

Return conversion failure only when:
- the PDF cannot be parsed at all
- the document yields neither usable text nor recoverable image content
- the runtime cannot load the PDF parser path

### Performance guardrails

The existing page cap must still apply.

If full image-aware extraction becomes too slow at the current cap, the implementation may use a lower PDF image-analysis cap than the plain text cap, but that cap must be explicit and tested.

## 10. Testing

### Unit-level and focused regression checks

Add a focused semantic PDF check that proves:
- `images=off` removes recovered PDF images from MD output
- `images=captions` produces readable placeholders for PDF images
- `images=on` preserves PDF images in MD output
- `images=on` degrades to captions in TXT output
- low-confidence PDF image placement still preserves the image later in page order rather than dropping it

### Targeted browser and API checks

Extend targeted `/batch` E2E checks to prove:
- PDF uploads keep using the current document workflow
- the existing image toggle affects PDF jobs as expected
- outputs remain downloadable individually, not zipped

### Full suite

Run after targeted fixes are green:
- `npm run typecheck`
- `npm run build`
- `npm run e2e:batch-documents`
- `npm run e2e:full`
- `npm run e2e:batch-documents-real`

### Live real-document checks

Use a small PDF corpus that includes:
- PDF with inline images between paragraphs
- PDF with diagrams or charts
- PDF with decorative header or footer art
- PDF with low-confidence placement cases

Success means:
- inline images appear near the right text blocks most of the time
- decorative or uncertain cases remain preserved without obviously false placement
- no regressions to current document conversions

## 11. Risks

### Risk: geometry mismatch

PDF geometry can be difficult to normalize across transforms and page coordinate systems.

Mitigation:
- keep the internal page model explicit
- add fixtures that cover rotated or offset content only if they appear in the real corpus
- prefer fallback preservation over forced placement

### Risk: runtime cost

Image-aware PDF parsing will cost more than text-only extraction.

Mitigation:
- preserve the current hard page cap
- measure duration in the real E2E matrix
- keep layout reconstruction out of scope

### Risk: misleading captions

Some PDFs do not expose meaningful nearby labels.

Mitigation:
- use explicit ordinal labels such as `page N image M` when semantic labels are unavailable

### Risk: deployment drift

The repo previously had a Vercel PDF worker regression.

Mitigation:
- keep the PDF worker tracing path under test
- rerun the real document suite against the deployed app when deployment verification is required

## 12. Scope Boundaries

Included in Pass 2:
- Node-only PDF source-image retention
- confidence-based placement
- low-confidence page-order fallback
- integration with existing image modes
- verification through targeted, full, and real-browser tests

Excluded from Pass 2:
- Python or native worker path
- OCR-first scanned PDF reconstruction
- exact layout reconstruction
- homepage or non-document route changes
- new export formats

## 13. Success Criteria

The feature is successful when all of the following are true:
- users can upload PDFs on `/batch` and get source images preserved when `images=on`
- users get readable placeholders when `images=captions`
- users get text-only output when `images=off`
- low-confidence cases preserve images honestly instead of inventing precise placement
- the existing verification ladder stays green
- the implementation does not introduce a second runtime
