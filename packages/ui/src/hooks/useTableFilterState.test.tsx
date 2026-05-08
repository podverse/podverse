import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: vi.fn(),
  }),
}));

import { TABLE_SEARCH_DEBOUNCE_MS, useTableFilterState } from './useTableFilterState';

describe('useTableFilterState', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.useRealTimers();
  });

  it('debounces search and pushes URL params in default mode', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useTableFilterState({
        allColumnIds: ['title'],
        basePath: '/feeds',
        currentQueryParams: {},
        initialColumns: ['title'],
        initialSearch: '',
      })
    );

    act(() => {
      result.current.setSearch('rss');
    });

    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TABLE_SEARCH_DEBOUNCE_MS);
    });

    expect(mockPush).toHaveBeenCalledWith('/feeds?search=rss');

    vi.useRealTimers();
  });

  it('writes cookie and refreshes when cookie mode is configured', async () => {
    vi.useFakeTimers();

    const cookieName = 'test_table_state';
    const listKey = 'feeds';

    const { result } = renderHook(() =>
      useTableFilterState({
        allColumnIds: ['title'],
        basePath: '/feeds',
        currentQueryParams: {},
        initialColumns: ['title'],
        initialSearch: '',
        tableListStateCookieName: cookieName,
        tableListStateListKey: listKey,
      })
    );

    act(() => {
      result.current.setSearch('podcast');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TABLE_SEARCH_DEBOUNCE_MS);
    });

    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${encodeURIComponent(cookieName)}=([^;]*)`)
    );
    expect(match?.[1]).toBeDefined();
    const decoded = decodeURIComponent(match?.[1] ?? '');
    expect(decoded).toContain('podcast');
    expect(decoded).toContain('"page":1');
    expect(mockRefresh).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
