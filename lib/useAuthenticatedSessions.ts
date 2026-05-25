'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AUTH_SESSION_STORAGE_KEY, SESSION_HEADER } from '@/lib/internalIdentifiers';

export type ClientAuthenticatedSession = {
  id: string;
  label: string;
  importKind: 'storage_state' | 'cookie_array';
  allowedDomains: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  lastHealthState: 'ready' | 'used' | 'domain_mismatch' | 'expired' | 'invalid';
};

type ListResponse = {
  success: boolean;
  sessions?: ClientAuthenticatedSession[];
  error?: string;
};

type ImportResponse = {
  success: boolean;
  session?: ClientAuthenticatedSession;
  error?: string;
};

type StoredSelection = {
  ownerSessionId: string;
  authSessionId: string;
};

function readStoredSelection(): StoredSelection | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelection;
    if (!parsed?.ownerSessionId || !parsed?.authSessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSelection(selection: StoredSelection | null): void {
  if (typeof window === 'undefined') return;

  if (!selection) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(selection));
}

export function useAuthenticatedSessions(ownerSessionId: string) {
  const [sessions, setSessions] = useState<ClientAuthenticatedSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const headers = useMemo<HeadersInit>(
    () => ({
      'Content-Type': 'application/json',
      ...(ownerSessionId ? { [SESSION_HEADER]: ownerSessionId } : {}),
    }),
    [ownerSessionId],
  );

  const refresh = useCallback(async () => {
    if (!ownerSessionId) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth-sessions', {
        headers: {
          ...(ownerSessionId ? { [SESSION_HEADER]: ownerSessionId } : {}),
        },
      });
      const json = (await response.json()) as ListResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load authenticated sessions.');
      }

      const nextSessions = Array.isArray(json.sessions) ? json.sessions : [];
      setSessions(nextSessions);
      setSelectedSessionId((current) => {
        if (!current) return current;
        return nextSessions.some((session) => session.id === current) ? current : null;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load authenticated sessions.');
    } finally {
      setLoading(false);
    }
  }, [ownerSessionId]);

  useEffect(() => {
    if (!ownerSessionId) return;

    const storedSelection = readStoredSelection();
    if (storedSelection?.ownerSessionId === ownerSessionId) {
      setSelectedSessionId(storedSelection.authSessionId);
    } else {
      setSelectedSessionId(null);
      writeStoredSelection(null);
    }

    void refresh();
  }, [ownerSessionId, refresh]);

  useEffect(() => {
    if (!ownerSessionId) return;

    if (!selectedSessionId) {
      writeStoredSelection(null);
      return;
    }

    writeStoredSelection({
      ownerSessionId,
      authSessionId: selectedSessionId,
    });
  }, [ownerSessionId, selectedSessionId]);

  const importSessionFile = useCallback(
    async (file: File) => {
      if (!ownerSessionId) {
        setErrorMessage('Anonymous client session missing. Refresh the page and retry.');
        return null;
      }

      setImporting(true);
      setErrorMessage('');

      try {
        const payloadJson = await file.text();
        const response = await fetch('/api/auth-sessions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            label: labelDraft.trim() || undefined,
            payloadJson,
          }),
        });
        const json = (await response.json()) as ImportResponse;
        if (!response.ok || !json.success || !json.session) {
          throw new Error(json.error || 'Authenticated session import failed.');
        }

        setSessions((current) => [json.session!, ...current.filter((item) => item.id !== json.session!.id)]);
        setSelectedSessionId(json.session.id);
        setLabelDraft('');
        return json.session;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Authenticated session import failed.');
        return null;
      } finally {
        setImporting(false);
      }
    },
    [headers, labelDraft, ownerSessionId],
  );

  const clearSelection = useCallback(() => {
    setSelectedSessionId(null);
    setErrorMessage('');
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      if (!ownerSessionId) return;

      setDeletingSessionId(id);
      setErrorMessage('');

      try {
        const response = await fetch(`/api/auth-sessions?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            ...(ownerSessionId ? { [SESSION_HEADER]: ownerSessionId } : {}),
          },
        });
        const json = (await response.json()) as { success: boolean; error?: string };
        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Failed to delete authenticated session.');
        }

        setSessions((current) => current.filter((session) => session.id !== id));
        setSelectedSessionId((current) => (current === id ? null : current));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to delete authenticated session.');
      } finally {
        setDeletingSessionId(null);
      }
    },
    [ownerSessionId],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions],
  );

  return {
    sessions,
    selectedSessionId,
    selectedSession,
    loading,
    importing,
    deletingSessionId,
    labelDraft,
    errorMessage,
    setLabelDraft,
    setSelectedSessionId,
    importSessionFile,
    clearSelection,
    deleteSession,
    refresh,
  };
}
