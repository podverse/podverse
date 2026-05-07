import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCursorPagination } from './useCursorPagination';

describe('useCursorPagination', () => {
  it('loads the first page with an undefined continuation token', async () => {
    const fetchPage = vi.fn(async () => ({
      items: [{ id: 'a' }],
      nextContinuationToken: 't1',
    }));

    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
    expect(result.current.items).toEqual([{ id: 'a' }]);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it('advances the token stack on goNext and restores on goPrev without extra fetches', async () => {
    const fetchPage = vi.fn(async (token: string | undefined) => {
      if (token === undefined) {
        return { items: [{ id: 'p1' }], nextContinuationToken: 'tok2' };
      }
      if (token === 'tok2') {
        return { items: [{ id: 'p2' }], nextContinuationToken: undefined };
      }
      return { items: [], nextContinuationToken: undefined };
    });

    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.goNext();
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenLastCalledWith('tok2');
    expect(result.current.items).toEqual([{ id: 'p2' }]);
    expect(result.current.pageNumber).toBe(2);
    expect(result.current.hasPrev).toBe(true);
    expect(result.current.hasNext).toBe(false);

    act(() => {
      result.current.goPrev();
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([{ id: 'p1' }]);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it('reset refetches from the beginning and clears forward history', async () => {
    const fetchPage = vi.fn(async (token: string | undefined) => {
      if (token === undefined) {
        return { items: [{ id: 'x' }], nextContinuationToken: 'n' };
      }
      return { items: [{ id: 'y' }], nextContinuationToken: undefined };
    });

    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.goNext();
    });

    expect(result.current.pageNumber).toBe(2);

    await act(async () => {
      await result.current.reset();
    });

    expect(fetchPage.mock.calls.filter((c) => c[0] === undefined).length).toBeGreaterThanOrEqual(2);
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.items).toEqual([{ id: 'x' }]);
  });

  it('refetch replaces the current page from the same continuation token', async () => {
    const fetchPage = vi.fn(async (token: string | undefined) => {
      if (token === undefined) {
        return { items: [{ id: 'v1' }], nextContinuationToken: 'z' };
      }
      return { items: [], nextContinuationToken: undefined };
    });

    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    fetchPage.mockImplementation(async (token: string | undefined) => {
      if (token === undefined) {
        return { items: [{ id: 'v2' }], nextContinuationToken: 'z' };
      }
      return { items: [], nextContinuationToken: undefined };
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.items).toEqual([{ id: 'v2' }]);
    const undefinedTokenCalls = fetchPage.mock.calls.filter((c) => c[0] === undefined).length;
    expect(undefinedTokenCalls).toBeGreaterThanOrEqual(2);
  });

  it('records error when fetch fails', async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error('network');
    });

    const { result } = renderHook(() => useCursorPagination({ fetchPage }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('network');
    expect(result.current.items).toEqual([]);
  });
});
