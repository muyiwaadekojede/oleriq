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

  if (!proof?.value || proof.value <= 0) {
    return null;
  }

  return (
    <div
      data-homepage-public-proof
      aria-label={`${formattedValue} ${proof?.label || 'files converted'}`}
      className="text-sm text-[var(--color-muted)]"
    >
      <span className="font-semibold text-[var(--color-ink)]">{formattedValue}</span>{' '}
      <span>{proof?.label || 'files converted'}</span>
    </div>
  );
}
