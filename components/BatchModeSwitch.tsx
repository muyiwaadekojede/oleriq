'use client';

import type { BatchInputMode } from '@/lib/types';

type BatchModeSwitchProps = {
  mode: BatchInputMode;
  onModeChange: (mode: BatchInputMode) => void;
};

export function BatchModeSwitch({ mode, onModeChange }: BatchModeSwitchProps) {
  return (
    <div className="flex justify-center">
      <div role="group" aria-label="Input mode" className="flex flex-wrap gap-2">
        {(['url', 'document'] as BatchInputMode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            aria-pressed={mode === value}
            className={`h-10 rounded-lg border px-4 text-sm font-semibold transition ${
              mode === value
                ? 'border-[var(--color-accent)] bg-white text-[var(--color-accent)]'
                : 'border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            }`}
          >
            {value === 'url' ? 'URLs' : 'Documents'}
          </button>
        ))}
      </div>
    </div>
  );
}
