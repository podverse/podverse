import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAsyncPageLoading } from './useAsyncPageLoading';

describe('useAsyncPageLoading', () => {
  it('runs the loader with loading true during execution', async () => {
    const { result } = renderHook(() => useAsyncPageLoading());

    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.runAsyncLoad(async () => Promise.resolve());
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('clears loading when the loader rejects', async () => {
    const { result } = renderHook(() => useAsyncPageLoading());

    await expect(
      act(async () => {
        await result.current.runAsyncLoad(async () => {
          throw new Error('boom');
        });
      })
    ).rejects.toThrow('boom');

    expect(result.current.isLoading).toBe(false);
  });
});
