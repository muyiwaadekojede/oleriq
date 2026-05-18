import Link from 'next/link';

export function BatchBelowFoldContent() {
  return (
    <section aria-labelledby="batch-search-guidance-heading" className="mt-14 border-t border-[var(--color-border)] pt-10">
      <article className="reading-prose mx-auto w-full max-w-[720px] text-[var(--color-ink)]">
        <h2 id="batch-search-guidance-heading">Batch convert many URLs or files into readable documents</h2>
        <p>
          Batch conversion is built for repeated work. Instead of converting one page at a time, you can run many URLs
          or uploaded files through one route, keep one output format for the run, and review the results in one place.
        </p>
        <p>
          The goal is not only to extract text. The goal is to produce readable Markdown, TXT, DOCX, or PDF files that
          can be downloaded, reviewed, and used again without guessing what happened during the run.
        </p>

        <h2>What Clearpage tries to preserve during batch conversion</h2>
        <p>
          Readable structure matters more than plain text. Users do not only need words from a page or file. They need
          headings, lists, tables, links, and code-like formatting to stay readable enough for human review and
          downstream AI work.
        </p>
        <h3>Readable structure matters more than plain text</h3>
        <p>
          A result can look complete while still losing the outline that makes it useful. When heading levels flatten,
          lists lose anchors, tables break apart, or code blocks lose spacing, the file becomes harder to review and
          harder to reuse.
        </p>
        <ul>
          <li>Headings help keep long documents scannable.</li>
          <li>Lists and links keep reference-heavy pages intact.</li>
          <li>Tables and code blocks carry meaning that plain text alone can hide.</li>
        </ul>
        <h3>Where output can still degrade</h3>
        <p>
          Some sources stay harder than others. Complex tables, non-article layouts, and difficult PDFs can still lose
          structure even when the run completes. That is why Clearpage exposes degraded results and warnings instead of
          treating every completed item as equally clean.
        </p>

        <h2>How batch results are reported</h2>
        <p>
          Batch status is designed to stay honest. The page distinguishes between a result that is ready to use, a
          result that converted with warnings, and a result that failed to produce a usable output.
        </p>
        <h3>Usable results</h3>
        <p>
          A usable result means the item converted cleanly enough to treat as ready for download and review. It does
          not mean every page or file is structurally perfect. It means the run produced an output that does not carry
          a current warning flag.
        </p>
        <h3>Degraded results</h3>
        <p>
          A degraded result means the conversion succeeded, but the item still needs attention. Warnings make that
          visible so you can tell the difference between a clean conversion and one where layout, rendering path, or
          source shape may have reduced output quality.
        </p>
        <h3>Failed results</h3>
        <p>
          A failed result means the item did not produce a usable converted file. Failure stays explicit so the batch
          does not hide broken rows behind a misleading success state.
        </p>

        <h2>Progress, retries, and trust during longer runs</h2>
        <p>
          Longer runs need more than a spinner. Clearpage shows progress while the batch is running, exposes failed
          rows directly, and lets you retry only the items that need another pass.
        </p>
        <h3>What the progress state tells you</h3>
        <p>
          Progress shows that the batch is moving through the run, not sitting in an opaque queue. This matters on
          mixed batches where some items finish quickly and others need more time or encounter harder source behavior.
        </p>
        <h3>Why retry controls matter</h3>
        <p>
          Retry controls let you rerun failed rows without repeating the whole batch. That keeps repeated conversion
          work predictable and reduces the cost of one bad row in a larger job.
        </p>

        <h2>Workloads this route is built for</h2>
        <p>
          Batch conversion is for repeated jobs where one-off conversion is too slow or too fragmented. It fits best
          when you want one route that can process many inputs, keep one output target, and report the condition of
          each row clearly.
        </p>
        <h3>When batch URL conversion fits best</h3>
        <p>
          URL mode is the right fit when you have many articles, guides, or reference pages to convert into one target
          format and you need one place to review usable, degraded, and failed rows.
        </p>
        <h3>When document batch conversion fits best</h3>
        <p>
          Document mode is the right fit when uploaded files need one consistent export target and one shared activity
          surface. If you only need a single one-off URL conversion, the{' '}
          <Link href="/" className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
            single URL converter
          </Link>{' '}
          is the lighter path.
        </p>

        <h2>Batch conversion FAQ</h2>
        <h3>Can batch conversion keep headings, lists, and tables readable?</h3>
        <p>
          That is the goal, and it is one of the main reasons this route exists. Clearpage aims to keep readable
          structure visible, but harder pages and files can still degrade. That is why the page reports warnings instead
          of assuming every completed row stayed clean.
        </p>
        <h3>What does a degraded result mean?</h3>
        <p>
          It means the item converted, but the output should be reviewed because the conversion path or source shape
          raised a trust warning. Degraded is different from failed, and it is different from a fully clean result.
        </p>
        <h3>What happens if some URLs or files fail?</h3>
        <p>
          Failed rows stay visible in the activity view with their failure state and guidance. A failed row does not
          need to erase the rest of the successful output from the same batch.
        </p>
        <h3>Can I retry only failed items?</h3>
        <p>
          Yes. The page supports retrying failed URLs or failed files without rebuilding the entire run from scratch.
        </p>
        <h3>Which formats can I download from a batch run?</h3>
        <p>
          Batch runs support Markdown, TXT, DOCX, and PDF output. The format stays fixed for the run so the results are
          easier to review and download as one consistent set.
        </p>
        <h3>Does batch conversion work on every page or document?</h3>
        <p>
          No. Some pages, layouts, and document classes remain harder than others, especially when structure is complex
          or the source does not convert cleanly. Clearpage is designed to surface those limits with degraded results,
          failed rows, and retry controls instead of implying universal success.
        </p>
      </article>
    </section>
  );
}
