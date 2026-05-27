'use client';

import { useRef } from 'react';

import type { ClientAuthenticatedSession } from '@/lib/useAuthenticatedSessions';

type AuthenticatedSessionManagerProps = {
  sessions: ClientAuthenticatedSession[];
  selectedSessionId: string | null;
  labelDraft: string;
  loading: boolean;
  importing: boolean;
  deletingSessionId: string | null;
  errorMessage: string;
  onLabelDraftChange: (value: string) => void;
  onSelectSession: (value: string | null) => void;
  onImportFile: (file: File) => Promise<unknown>;
  onClearSelection: () => void;
  onDeleteSession: (id: string) => Promise<void>;
  compact?: boolean;
  dataMarker?: string;
};

function expiresInLabel(value: string): string {
  const expiresAtMs = Date.parse(value);
  if (!Number.isFinite(expiresAtMs)) return 'Expires soon';

  const diffMs = expiresAtMs - Date.now();
  if (diffMs <= 0) return 'Expired';

  const hours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));
  if (hours < 24) return `Expires in ${hours}h`;
  const days = Math.round(hours / 24);
  return `Expires in ${days}d`;
}

export function AuthenticatedSessionManager({
  sessions,
  selectedSessionId,
  labelDraft,
  loading,
  importing,
  deletingSessionId,
  errorMessage,
  onLabelDraftChange,
  onSelectSession,
  onImportFile,
  onClearSelection,
  onDeleteSession,
  compact = false,
  dataMarker = 'data-auth-session-manager',
}: AuthenticatedSessionManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) || null;

  return (
    <div
      {...{ [dataMarker]: 'true' }}
      className={`rounded-2xl border border-[var(--color-border)] bg-white ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Saved browser session</p>
          <p className="text-sm text-[var(--color-muted)]">
            Use a saved session file from your own browser only if you already have access to the page there.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-ink)]" htmlFor="auth-session-select">
              Current saved session
            </label>
            <select
              id="auth-session-select"
              value={selectedSessionId || ''}
              onChange={(event) => onSelectSession(event.target.value || null)}
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">No saved session selected</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? 'Importing...' : 'Import session file'}
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            disabled={!selectedSessionId}
            className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear selection
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void onImportFile(file);
            event.currentTarget.value = '';
          }}
        />

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-ink)]" htmlFor="auth-session-label">
              Session label (optional)
            </label>
            <input
              id="auth-session-label"
              type="text"
              value={labelDraft}
              onChange={(event) => onLabelDraftChange(event.target.value)}
              placeholder="Example: My newspaper account"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <button
            type="button"
            onClick={() => selectedSession && void onDeleteSession(selectedSession.id)}
            disabled={!selectedSession || deletingSessionId === selectedSession.id}
            className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] hover:border-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {selectedSession && deletingSessionId === selectedSession.id ? 'Deleting...' : 'Delete saved session'}
          </button>
        </div>

        {selectedSession ? (
          <div
            data-auth-session-selected="true"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]"
          >
            <p className="font-semibold text-[var(--color-ink)]">{selectedSession.label}</p>
            <p className="mt-1">Allowed domains: {selectedSession.allowedDomains.join(', ')}</p>
            <p className="mt-1">{expiresInLabel(selectedSession.expiresAt)}</p>
          </div>
        ) : null}

        {!selectedSession && !loading ? (
          <p className="text-sm text-[var(--color-muted)]">
            No saved session selected yet.
          </p>
        ) : null}

        {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
