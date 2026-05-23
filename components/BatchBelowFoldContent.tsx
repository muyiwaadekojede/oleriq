import Image from 'next/image';
import Link from 'next/link';

const faqItems = [
  {
    question: 'Can a batch look finished while structure still needs review?',
    answer:
      'Yes. That is why the route keeps partial and degraded separate instead of flattening every finished row into one clean-looking state.',
  },
  {
    question: 'Why are clean rows hidden first?',
    answer:
      'Because the rows that need attention matter first. Clean rows stay available behind Show clean rows instead of competing with failures or warnings.',
  },
  {
    question: 'Can I retry only the rows that broke?',
    answer: 'Yes. Failed rows keep their retry path so one broken item does not force a full rerun.',
  },
  {
    question: 'When should I switch away from TXT or Markdown?',
    answer:
      'Switch when table layout, deeper heading structure, embedded images, or richer formatting matters in the final file.',
  },
] as const;

const structureColumns = [
  {
    title: 'What usually stays readable',
    items: ['basic article flow', 'plain paragraphs and links', 'simple headings and lists'],
  },
  {
    title: 'What still needs review',
    items: ['tables that depend on layout', 'deeper heading trees', 'code blocks and embedded media'],
  },
] as const;

const runSteps = [
  'Start one run with one output target.',
  'Watch progress without losing the thread.',
  'Open only the row that needs inspection.',
] as const;

const chapterHeadingClass = 'max-w-[13ch] text-[2.35rem] leading-[0.95] md:text-[3rem]';

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

function ProofArtifact({
  src,
  alt,
  caption,
  section,
  sizes,
}: {
  src: string;
  alt: string;
  caption: string;
  section: string;
  sizes: string;
}) {
  return (
    <figure
      data-batch-guide-artifact={section}
      className="overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <Image src={src} alt={alt} width={1440} height={1080} className="h-auto w-full" sizes={sizes} />
      <figcaption className="border-t border-[var(--color-border)] px-5 py-4 text-sm leading-6 text-[var(--color-muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-batch-guide-kicker
      className="text-[1rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
    >
      {children}
    </p>
  );
}

function QuietStatusStrip() {
  return (
    <div
      data-batch-guide-card="status-strip"
      className="grid gap-0 overflow-hidden rounded-[24px] border border-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:border-r xl:border-b-0">
        <p className="font-semibold">Usable</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Clean output with no current warning signs.</p>
      </div>
      <div className="border-b border-[var(--color-border)] px-4 py-4 xl:border-b-0 xl:border-r">
        <p className="font-semibold">Partial</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">The run finished, but only part came back intact.</p>
      </div>
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:border-r sm:border-b-0">
        <p className="font-semibold">Degraded</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
          The output came back, but Oleriq can already see a warning worth reviewing.
        </p>
      </div>
      <div className="px-4 py-4">
        <p className="font-semibold">Failed</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">No usable converted file came back from that row.</p>
      </div>
    </div>
  );
}

export function BatchBelowFoldContent() {
  return (
    <section
      data-batch-guide="true"
      aria-labelledby="batch-guide-heading"
      className="mt-16 border-t border-[var(--color-border)] pt-12"
    >
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-16 text-[var(--color-ink)]">
        <section data-batch-guide-section="truth-surface" className="space-y-7">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-end">
            <div className="space-y-5 xl:pr-6">
              <SectionLabel>Truth surface</SectionLabel>
              <h2 id="batch-guide-heading" className={chapterHeadingClass}>
                One finished run should not hide what actually came back.
              </h2>
              <p>
                Repeated conversion work gets risky when a run looks finished before you know what came back clean,
                what only partly held together, and what broke on the first pass.
              </p>
              <p>
                The first fold now keeps setup, progress, and review in one calm surface so the route can stay legible
                while usable, partial, degraded, and failed stay separate.
              </p>
            </div>
            <ProofArtifact
              section="truth-surface"
              src="/proof/batch/batch-route-proof-review.png"
              alt="Real /batch review state showing one shared working surface, compact counts, and collapsed rows."
              caption="Real route state: the completed run stays quiet, but the rows that need attention still rise first."
              sizes="(min-width: 1280px) 58vw, (min-width: 1024px) 54vw, 100vw"
            />
          </div>

          <QuietStatusStrip />

          <p className="max-w-[76ch] text-sm leading-6 text-[var(--color-muted)]">
            Use <span className="font-medium text-[var(--color-ink)]">/batch</span> when repeated work needs one
            output target and one review surface. For one-off work, use the{' '}
            <Link href="/" className="text-[var(--color-accent)] hover:text-[var(--color-accent-strong)]">
              single URL converter
            </Link>
            .
          </p>
        </section>

        <section data-batch-guide-section="structure-proof" className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] xl:items-start">
            <ProofArtifact
              section="structure-proof"
              src="/proof/batch/batch-structure-proof.png"
              alt="Real /batch row detail showing a partial result and structure-loss guidance on the affected row."
              caption="Real route state: structure warnings stay on the row that needs review instead of hiding behind a finished run."
              sizes="(min-width: 1280px) 56vw, (min-width: 1024px) 50vw, 100vw"
            />

            <div className="space-y-5 xl:pt-2">
              <SectionLabel>Structure proof</SectionLabel>
              <h2 className={chapterHeadingClass}>Readable structure can still flatten.</h2>
              <p>
                Clean output you can actually use is more than getting words back. Structure still decides whether the
                result is safe to trust, reuse, or pass to another system.
              </p>
            </div>
          </div>

          <div
            data-batch-guide-card="structure-split"
            className="grid overflow-hidden rounded-[24px] border border-[var(--color-border)] md:grid-cols-2"
          >
            {structureColumns.map((column, index) => (
              <div
                key={column.title}
                className={index === 0 ? 'border-b border-[var(--color-border)] px-5 py-6 md:border-b-0 md:border-r' : 'px-5 py-6'}
              >
                <p className="text-[1.22rem] font-semibold leading-8">{column.title}</p>
                <ul className="mt-3 space-y-2 pl-5 text-base leading-8 text-[var(--color-muted)]">
                  {column.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section data-batch-guide-section="run-recovery" className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] xl:items-start">
            <div className="space-y-5 xl:pr-4 xl:pt-2">
              <SectionLabel>Run recovery</SectionLabel>
              <h2 className={chapterHeadingClass}>Longer runs stay legible and recoverable.</h2>
              <p>
                Progress stays primary while work is moving. Review only steps forward once there is real settled output
                to inspect, and failed rows keep their retry path instead of forcing a full rerun.
              </p>
            </div>

            <ProofArtifact
              section="run-recovery"
              src="/proof/batch/batch-running-proof.png"
              alt="Real /batch running state showing progress as the primary signal while review stays secondary until there is settled work to inspect."
              caption="Real route state: the run stays legible while work is still moving."
              sizes="(min-width: 1280px) 58vw, (min-width: 1024px) 52vw, 100vw"
            />
          </div>

          <div
            data-batch-guide-card="run-steps"
            className="rounded-[24px] border border-[var(--color-border)] px-5 py-6"
          >
            <ol className="grid gap-6 md:grid-cols-3">
              {runSteps.map((step, index) => (
                <li key={step} className="space-y-2">
                  <p className="text-[1.2rem] font-semibold leading-8">
                    {index + 1}. {step}
                  </p>
                  <p className="text-base leading-8 text-[var(--color-muted)]">
                    {index === 0
                      ? 'The route keeps one output format per run so the review surface stays coherent.'
                      : index === 1
                        ? 'The progress state stays quiet, direct, and tied to the same surface.'
                        : 'Details, downloads, and retry actions stay hidden until you open the specific row.'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section data-batch-guide-section="faq" className="space-y-5">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="max-w-[13ch] text-[2.1rem] leading-[0.98] md:max-w-none md:text-[2.8rem]">
            Questions that matter before a bigger run.
          </h2>
          <div className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details
                key={item.question}
                data-batch-faq-item
                className="group border-t border-[var(--color-border)] pt-4"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[1.22rem] font-semibold leading-8 marker:hidden">
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className="mt-1 text-[1.5rem] leading-none text-[var(--color-muted)] transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-[1.02rem] leading-8 text-[var(--color-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
