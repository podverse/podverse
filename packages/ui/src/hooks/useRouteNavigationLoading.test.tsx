import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRouteNavigationLoading } from './useRouteNavigationLoading';

let mockPathname = '/podcasts';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

/** jsdom has no full navigation; preventDefault mirrors Next.js client Link behavior. */
function dispatchAnchorClick(anchor: HTMLAnchorElement): void {
  anchor.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
    },
    { once: true }
  );
  anchor.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    })
  );
}

describe('useRouteNavigationLoading', () => {
  beforeEach(() => {
    mockPathname = '/podcasts';
    mockSearchParams = new URLSearchParams();
    window.history.replaceState({}, '', '/podcasts');
  });

  it('ignores external link clicks', async () => {
    const { result } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    const anchor = document.createElement('a');
    anchor.setAttribute('href', 'https://example.com/episodes');
    document.body.append(anchor);

    act(() => {
      dispatchAnchorClick(anchor);
    });

    expect(result.current).toBe(false);

    anchor.remove();
  });

  it('starts loading on internal link clicks after hydration', async () => {
    const { result } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/episodes');
    document.body.append(anchor);

    act(() => {
      dispatchAnchorClick(anchor);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);

    anchor.remove();
  });

  it('starts loading after pushState when the URL changes route', async () => {
    const { result } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      window.history.pushState({}, '', '/episodes');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });

  it('starts loading after pushState without scheduling a useInsertionEffect update', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      window.history.pushState({}, '', '/episodes');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        call.some(
          (arg) =>
            typeof arg === 'string' && arg.includes('useInsertionEffect must not schedule updates')
        )
      )
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('ignores hash-only history changes from in-page scroll links', async () => {
    const { result } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      window.history.replaceState({}, '', '/podcasts#section-two');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current).toBe(false);
  });

  it('clears loading when the route key changes', async () => {
    const { result, rerender } = renderHook(() => useRouteNavigationLoading());

    await act(async () => {
      await Promise.resolve();
    });

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/episodes');
    document.body.append(anchor);

    act(() => {
      dispatchAnchorClick(anchor);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);

    mockPathname = '/episodes';
    rerender();

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    anchor.remove();
  });
});
