'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PublicProofPayload } from '@/lib/publicProof';

type PublicMetricsResponse = {
  success: boolean;
  publicProof?: PublicProofPayload;
};

function formatProofValue(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function HomepagePublicProof() {
  const [proof, setProof] = useState<PublicProofPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const response = await fetch('/api/public-metrics', {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const json = (await response.json()) as PublicMetricsResponse;
        if (!json.success || !json.publicProof) return;

        setProof(json.publicProof);
      } catch {
        // The section still renders its static shape if live proof is unavailable.
      }
    }

    void load();

    return () => controller.abort();
  }, []);

  const formattedValue = useMemo(() => formatProofValue(proof?.value ?? null), [proof?.value]);

  return (
    <section data-homepage-public-proof className="px-6 pb-20">
      <div className="mx-auto max-w-3xl border-t border-[var(--color-border)] pt-14 text-left">
        <p className="text-sm font-medium text-[var(--color-muted)]">Usage proof</p>
        <p className="mt-4 text-5xl font-semibold text-[var(--color-ink)] md:text-6xl">
          <span className="logo-mark">{formattedValue}</span>{' '}
          <span className="text-3xl font-medium text-[var(--color-ink)] md:text-4xl">
            {proof?.label || 'files converted'}
          </span>
        </p>
        <p className="mt-4 max-w-2xl text-base text-[var(--color-muted)]">
          Across homepage, batch, and direct-file flows. Updated weekly.
        </p>
      </div>
    </section>
  );
}
