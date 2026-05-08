'use client';

import { useCallback, useState } from 'react';

export type UseDeleteModalOptions<TRow> = {
  onDelete: (row: TRow) => Promise<void>;
  /** Maps delete failures to user-visible copy; when omitted, `error` in the return value stays empty. */
  formatError?: (err: unknown) => string;
};

export type UseDeleteModalReturn<TRow> = {
  close: () => void;
  confirm: () => Promise<void>;
  deleteTarget: TRow | null;
  error: string | null;
  isOpen: boolean;
  isPending: boolean;
  openFor: (row: TRow) => void;
};

/**
 * Headless delete flow for resource tables; pair with {@link DeleteConfirmModalShell}.
 */
export function useDeleteModal<TRow>({
  onDelete,
  formatError,
}: UseDeleteModalOptions<TRow>): UseDeleteModalReturn<TRow> {
  const [deleteTarget, setDeleteTarget] = useState<TRow | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (!isPending) {
      setDeleteTarget(null);
      setError(null);
    }
  }, [isPending]);

  const confirm = useCallback(async () => {
    if (deleteTarget === null) {
      return;
    }
    const row = deleteTarget;
    setIsPending(true);
    setError(null);
    try {
      await onDelete(row);
      setDeleteTarget(null);
    } catch (err) {
      setError(formatError?.(err) ?? '');
    } finally {
      setIsPending(false);
    }
  }, [deleteTarget, formatError, onDelete]);

  const openFor = useCallback((row: TRow) => {
    setDeleteTarget(row);
    setError(null);
  }, []);

  return {
    close,
    confirm,
    deleteTarget,
    error,
    isOpen: deleteTarget !== null,
    isPending,
    openFor,
  };
}
