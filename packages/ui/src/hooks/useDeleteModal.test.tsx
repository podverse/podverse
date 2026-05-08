import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDeleteModal } from './useDeleteModal';

describe('useDeleteModal', () => {
  it('opens for a row and confirms deletion', async () => {
    const onDelete = vi.fn(async () => Promise.resolve());
    const { result } = renderHook(() => useDeleteModal({ onDelete }));

    act(() => {
      result.current.openFor({ id: '1' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.deleteTarget).toEqual({ id: '1' });

    await act(async () => {
      await result.current.confirm();
    });

    expect(onDelete).toHaveBeenCalledWith({ id: '1' });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.deleteTarget).toBe(null);
  });

  it('records error via formatError when onDelete rejects', async () => {
    const onDelete = vi.fn(async () => Promise.reject(new Error('network')));
    const formatError = vi.fn((err: unknown) => (err instanceof Error ? err.message : 'unknown'));
    const { result } = renderHook(() => useDeleteModal({ onDelete, formatError }));

    act(() => {
      result.current.openFor({ id: 'x' });
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(formatError).toHaveBeenCalled();
    expect(result.current.error).toBe('network');
    expect(result.current.isOpen).toBe(true);
  });

  it('leaves error empty when formatError is omitted and onDelete rejects', async () => {
    const onDelete = vi.fn(async () => Promise.reject(new Error('network')));
    const { result } = renderHook(() => useDeleteModal({ onDelete }));

    act(() => {
      result.current.openFor({ id: 'x' });
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.error).toBe('');
    expect(result.current.isOpen).toBe(true);
  });

  it('does not close while pending', async () => {
    let unblock: () => void = () => {};
    const stalled = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const onDelete = vi.fn(() => stalled);
    const { result } = renderHook(() => useDeleteModal({ onDelete }));

    act(() => {
      result.current.openFor({ id: 'p' });
    });

    await act(async () => {
      void result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.deleteTarget).toEqual({ id: 'p' });

    await act(async () => {
      unblock();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
      expect(result.current.deleteTarget).toBe(null);
    });
  });
});
