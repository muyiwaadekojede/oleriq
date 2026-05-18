# Document Intelligence Demand Notes

Updated: 2026-05-16

## Coverage
- [Verified] This note set is backed by 29 evidence rows in `document-intelligence-demand-evidence.csv`.
- [Verified] Source mix in the CSV: 4 GitHub READMEs, 3 official docs pages, 13 GitHub issues, 1 GitHub PR list, 1 GitHub changelog, 4 Reddit threads, 2 Hacker News threads, and 1 comparison writeup.
- [Inference] The demand signal is not just "extract the text." It is "extract it without silently damaging structure, and prove what survived."

## Strongest Signals
- [Inference] Tables are the biggest trust breaker. Multiple sources report damaged table structure, missing table content, merged-cell failure, or the need for special table pipelines even when general extraction succeeds.
- [Inference] Markdown fidelity still breaks on basic structure: headings, lists, anchor-linked list items, code blocks, and heading markers. This matters because the output can look usable while losing meaning.
- [Inference] OCR alone is not the hard part for many workflows. The harder part is preserving layout, reading order, row and column relationships, and document hierarchy across scans, rotated pages, and mixed-language packets.
- [Inference] "Successful" extraction still leaves post-processing demand: schema validation, figure or equation handling, provenance back to source cells or spans, and page-level routing for hard cases.
- [Inference] Managed products and open-source tools both expose the same pattern: vendor docs promise clean markdown or JSON, while issue trackers and user discussions show recurring edge-case damage.

## What Breaks Trust In Output Quality
- [Verified] Trafilatura exposes formatting, lists, quotes, code, links, images, and tables as supported output areas, but user reports show skipped headings, flattened bullets, discarded images, broken heading tags, anchor-list loss, and bad table HTML or markdown in edge cases.
- [Verified] Mozilla Readability returns processed article HTML and plain text, not validated structured JSON. Its own docs warn that `isProbablyReaderable()` can produce false positives and false negatives, and open issues show failures on mobile Wikipedia, GitHub issues, and Wikipedia heading preservation.
- [Verified] Firecrawl documents strong file parsing claims for PDF, DOCX, XLSX, markdown, and structured JSON, but issues show heading-marker loss and schema-output gaps. Its docs also expose workflow constraints: `onlyMainContent` defaults to `true`, OCR mode is slower, file size is capped at 50 MB, and `/parse` has no batch upload mode.
- [Verified] Crawl4AI separates markdown output from structured extraction output and explicitly recommends a special LLM table path for complex merged-cell tables. Its issue history shows broken or incomplete tables, code-block damage, rowspan or colspan loss, and metadata stripping in fitted markdown.

## What Users Still Need After "Successful" Extraction
- [Inference] Provenance: users need source bounding boxes, row and column relationships, confidence, or at least a way to trace a value back to the page region that produced it.
- [Inference] Routing: clean digital PDFs, scanned PDFs, image-heavy documents, and multilingual packets should not all go through the same path.
- [Inference] Validation: schema-filled JSON is not trustworthy by default. Users still need missing-field checks, section completeness checks, and structural QA for tables and code blocks.
- [Inference] Rich-element handling: figures, tables, equations, screenshots, captions, footnotes, and code blocks keep creating downstream work even after text extraction completes.
- [Inference] Human fallback: hard cases still need review queues, side-by-side source preview, or tie-breaker passes when two extraction methods disagree.

## Clearpage-Relevant Takeaways
- [Inference] For current Clearpage document workflows, the risk is silent degradation after a nominally successful conversion: headings collapse, bullets flatten, tables shift, or code blocks lose formatting while the job still reports success.
- [Inference] For future file-to-structured-output workflows, the product value is likely in verification layers around extraction, not just extraction itself.
- [Inference] The most defensible roadmap themes are: table-specific QA, per-page OCR or layout routing, provenance-friendly structured output, and explicit handling for multilingual or mixed-layout documents.
- [Inference] A strong success metric should include structural fidelity checks and downstream usability checks, not only "conversion completed" or "JSON returned."
