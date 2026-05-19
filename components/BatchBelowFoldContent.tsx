import Link from 'next/link';

const GUIDE_INDEX = [
  {
    number: '01',
    title: 'Preserve readable structure',
    copy: 'See what users need to stay intact and where harder source shapes can still degrade output.',
  },
  {
    number: '02',
    title: 'Read result states honestly',
    copy: 'Understand the difference between usable, degraded, and failed rows before you download.',
  },
  {
    number: '03',
    title: 'Trust longer runs',
    copy: 'Progress, retries, and failed-row visibility reduce guesswork during mixed or repeated jobs.',
  },
  {
    number: '04',
    title: 'Choose the right workload',
    copy: 'Match the route to bulk URLs, bulk files, or lighter one-off conversion work.',
  },
  {
    number: '05',
    title: 'Resolve common objections',
    copy: 'Review practical batch questions without leaving the page or opening extra interface layers.',
  },
] as const;

const SIGNAL_CHIPS = ['readable structure', 'truthful result states', 'retry failed items'] as const;

const PRESERVATION_GOALS = [
  {
    label: 'Headings and outline',
    copy: 'Long documents stay easier to scan when section hierarchy survives the conversion pass.',
  },
  {
    label: 'Lists, links, and references',
    copy: 'Reference-heavy source material remains more usable when bullets and anchors keep their shape.',
  },
  {
    label: 'Tables and code blocks',
    copy: 'Structured source regions carry meaning that plain paragraph text can hide or flatten.',
  },
] as const;

const PRESERVATION_LIMITS = [
  {
    label: 'Difficult tables',
    copy: 'Dense or visually unusual tables can still lose layout integrity even when the row completes.',
  },
  {
    label: 'Complex PDFs',
    copy: 'Academic or image-heavy PDFs can return readable text with degraded structure or visual grouping.',
  },
  {
    label: 'Non-article layouts',
    copy: 'Some pages remain harder to normalize cleanly when the source layout was not built as a readable article.',
  },
] as const;

const STATUS_CARDS = [
  {
    label: 'Usable',
    title: 'Ready for download and review',
    meaning:
      'A usable row finished without a current warning flag, so it can be treated as the cleanest result in the run.',
    trust: 'Trust signal: this row is the safest candidate for direct reuse, but review still matters on dense source material.',
  },
  {
    label: 'Degraded',
    title: 'Converted with a visible caution',
    meaning:
      'A degraded row produced output, but the source shape or conversion path raised a quality warning that should stay visible.',
    trust: 'Trust signal: the row is not failed, but it should not be treated as equal to a clean result.',
  },
  {
    label: 'Failed',
    title: 'No usable converted file',
    meaning:
      'A failed row did not produce a usable converted output, so the batch keeps the breakage explicit instead of hiding it.',
    trust: 'Trust signal: failure stays named so the rest of the batch can still be read honestly.',
  },
] as const;

const PROCESS_STEPS = [
  {
    step: 'Step 1',
    title: 'Start the run',
    copy: 'Lock one output format, submit the batch, and let the route keep one shared activity surface for the job.',
  },
  {
    step: 'Step 2',
    title: 'Watch progress move',
    copy: 'Progress confirms the queue is advancing instead of leaving the user to wonder whether the run stalled.',
  },
  {
    step: 'Step 3',
    title: 'Review failed rows',
    copy: 'Visible failed rows preserve context so one broken item does not erase the rest of the completed work.',
  },
  {
    step: 'Step 4',
    title: 'Retry only what broke',
    copy: 'Retry controls reduce waste by rerunning only the rows that need another pass instead of restarting the whole batch.',
  },
] as const;

type WorkloadCard = {
  label: string;
  title: string;
  copy: string;
  linkLabel?: string;
  linkHref?: string;
  suffix?: string;
};

const WORKLOADS: readonly WorkloadCard[] = [
  {
    label: 'Many URLs',
    title: 'Article and reference-page runs',
    copy: 'Use URL mode when you need one place to convert many pages into one target format and review row-level outcomes clearly.',
  },
  {
    label: 'Many uploaded files',
    title: 'Shared export target for documents',
    copy: 'Use document mode when many files need one consistent export choice and one activity surface for status, warnings, and downloads.',
  },
  {
    label: 'One-off URL work',
    title: 'Use the lighter path when bulk is unnecessary',
    copy: 'If the job is only one URL, the ',
    linkLabel: 'single URL converter',
    linkHref: '/',
    suffix: ' keeps the same product tone with less workflow overhead.',
  },
] as const;

const FAQS = [
  {
    question: 'Can batch conversion keep headings, lists, and tables readable?',
    answer:
      'That is the goal, and it is one of the main reasons this route exists. Clearpage aims to keep readable structure visible, but harder pages and files can still degrade. That is why the page reports warnings instead of assuming every completed row stayed clean.',
  },
  {
    question: 'What does a degraded result mean?',
    answer:
      'It means the item converted, but the output should be reviewed because the conversion path or source shape raised a trust warning. Degraded is different from failed, and it is different from a fully clean result.',
  },
  {
    question: 'What happens if some URLs or files fail?',
    answer:
      'Failed rows stay visible in the activity view with their failure state and guidance. A failed row does not need to erase the rest of the successful output from the same batch.',
  },
  {
    question: 'Can I retry only failed items?',
    answer: 'Yes. The page supports retrying failed URLs or failed files without rebuilding the entire run from scratch.',
  },
  {
    question: 'Which formats can I download from a batch run?',
    answer:
      'Batch runs support Markdown, TXT, DOCX, and PDF output. The format stays fixed for the run so the results are easier to review and download as one consistent set.',
  },
  {
    question: 'Does batch conversion work on every page or document?',
    answer:
      'No. Some pages, layouts, and document classes remain harder than others, especially when structure is complex or the source does not convert cleanly. Clearpage is designed to surface those limits with degraded results, failed rows, and retry controls instead of implying universal success.',
  },
] as const;

export function BatchBelowFoldContent() {
  return (
    <section
      aria-labelledby="batch-search-guidance-heading"
      className="mt-14 border-t border-[var(--color-border)] pt-10"
      data-batch-guide
    >
      <article className="batch-guide reading-prose mx-auto w-full text-[var(--color-ink)]">
        <section>
          <h2 id="batch-search-guidance-heading">Batch convert many URLs or files into readable documents</h2>
          <p className="batch-guide__lead">
            Batch conversion is built for repeated work. Instead of converting one page or file at a time, this route
            keeps one output target, one activity surface, and one honest record of what happened across the run.
          </p>
          <p className="batch-guide__lead">
            The point is not raw extraction volume. The point is readable output, truthful result states, and less
            uncertainty when a batch is larger, mixed, or harder than a quick one-off conversion.
          </p>

          <div className="batch-guide__index" data-batch-guide-nav>
            <ol className="batch-guide__index-list" aria-label="Batch guide overview">
              {GUIDE_INDEX.map((item) => (
                <li key={item.number} className="batch-guide__index-item">
                  <span className="batch-guide__index-number">{item.number}</span>
                  <span>
                    <span className="batch-guide__index-title">{item.title}</span>
                    <span className="batch-guide__index-copy">{item.copy}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="batch-guide__chip-row" aria-label="Batch route signals">
            {SIGNAL_CHIPS.map((chip) => (
              <span key={chip} className="batch-guide__chip">
                <span className="batch-guide__chip-dot" aria-hidden="true" />
                <span className="batch-guide__chip-label">{chip}</span>
              </span>
            ))}
          </div>
        </section>

        <section data-batch-guide-preservation>
          <p className="batch-guide__eyebrow">Readable structure first</p>
          <h2>What Clearpage tries to preserve during batch conversion</h2>
          <p className="batch-guide__intro">
            Users do not only need the words from a page or file. They need enough structure to review, compare, and
            reuse the output without rebuilding the document outline by hand.
          </p>
          <div className="batch-guide__matrix">
            <div className="batch-guide__panel">
              <h3>Readable structure matters more than plain text</h3>
              <p>
                A result can look complete while still losing the outline that makes it useful. When headings flatten,
                lists lose anchors, or code blocks lose spacing, the file becomes harder to review and harder to reuse.
              </p>
              <ul className="batch-guide__list">
                {PRESERVATION_GOALS.map((item) => (
                  <li key={item.label}>
                    <span className="batch-guide__list-label">{item.label}</span>
                    <span className="batch-guide__list-copy">{item.copy}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="batch-guide__panel">
              <h3>Where output can still degrade</h3>
              <p>
                Some source types remain harder than others. Clearpage surfaces that reality instead of treating every
                completed row as equally clean.
              </p>
              <ul className="batch-guide__list">
                {PRESERVATION_LIMITS.map((item) => (
                  <li key={item.label}>
                    <span className="batch-guide__list-label">{item.label}</span>
                    <span className="batch-guide__list-copy">{item.copy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section data-batch-guide-status>
          <p className="batch-guide__eyebrow">Truthful batch states</p>
          <h2>How batch results are reported</h2>
          <p className="batch-guide__intro">
            Batch status is designed to stay honest. The route separates clean output, caution-marked output, and rows
            that did not produce a usable converted file.
          </p>
          <div className="batch-guide__status-rail">
            {STATUS_CARDS.map((card) => (
              <div key={card.label} className="batch-guide__status-card">
                <span className="batch-guide__status-name">{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.meaning}</p>
                <p className="batch-guide__status-trust">{card.trust}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-batch-guide-progress>
          <p className="batch-guide__eyebrow">Progress with less guesswork</p>
          <h2>Progress, retries, and trust during longer runs</h2>
          <p className="batch-guide__intro">
            Longer runs need more than a spinner. This route uses progress visibility and failed-row recovery to reduce
            the uncertainty that usually appears when a batch becomes mixed, heavy, or slow.
          </p>
          <div className="batch-guide__process-rail">
            {PROCESS_STEPS.map((item, index) => (
              <div key={item.step} className="batch-guide__process-card">
                <span className="batch-guide__process-step">
                  <span className="batch-guide__process-count">{index + 1}</span>
                  {item.step}
                </span>
                <h3 className="batch-guide__process-title">{item.title}</h3>
                <p className="batch-guide__process-copy">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-batch-guide-workloads>
          <p className="batch-guide__eyebrow">Workload fit</p>
          <h2>Workloads this route is built for</h2>
          <p className="batch-guide__intro">
            Batch conversion fits repeated jobs where one-off conversion becomes too fragmented. The route is strongest
            when many inputs need one export target and one place to review per-row condition clearly.
          </p>
          <div className="batch-guide__workload-rail">
            {WORKLOADS.map((item) => (
              <div key={item.label} className="batch-guide__workload-card">
                <span className="batch-guide__workload-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>
                  {item.copy}
                  {item.linkHref ? (
                    <>
                      <Link
                        href={item.linkHref}
                        className="font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                      >
                        {item.linkLabel}
                      </Link>
                      {item.suffix}
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section data-batch-guide-faq>
          <p className="batch-guide__eyebrow">FAQ</p>
          <h2>Batch conversion FAQ</h2>
          <div className="batch-guide__faq-list">
            {FAQS.map((item) => (
              <div key={item.question} className="batch-guide__faq-item">
                <span className="batch-guide__faq-question">Question</span>
                <h3>{item.question}</h3>
                <p className="batch-guide__faq-answer">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}
