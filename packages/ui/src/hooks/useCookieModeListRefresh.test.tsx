import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCookieModeListRefresh } from './useCookieModeListRefresh';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
    replace: mockReplace,
  }),
}));

describe('useCookieModeListRefresh', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockRefresh.mockClear();
  });

  it('replaces path, runs load, then refreshes when no metadata hook', async () => {
    const runAsyncLoad = vi.fn(async () => Promise.resolve());

    const { result } = renderHook(() =>
      useCookieModeListRefresh({
        basePath: '/items',
        runAsyncLoad,
      })
    );

    await act(async () => {
      await result.current.refreshListAfterCookieMutation();
    });

    expect(mockReplace).toHaveBeenCalledWith('/items');
    expect(runAsyncLoad).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onListMetadataChange instead of refresh when provided', async () => {
    const runAsyncLoad = vi.fn(async () => Promise.resolve());
    const onListMetadataChange = vi.fn(async () => Promise.resolve());

    const { result } = renderHook(() =>
      useCookieModeListRefresh({
        basePath: '/pods',
        runAsyncLoad,
        onListMetadataChange,
      })
    );

    await act(async () => {
      await result.current.refreshListAfterCookieMutation();
    });

    expect(mockReplace).toHaveBeenCalledWith('/pods');
    expect(runAsyncLoad).toHaveBeenCalledTimes(1);
    expect(onListMetadataChange).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
