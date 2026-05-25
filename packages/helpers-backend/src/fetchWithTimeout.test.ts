import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initObservability, shutdownObservability } from '@podverse/observability';

import { fetchWithTimeout } from './fetchWithTimeout.js';

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      )
    ) as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await shutdownObservability();
    vi.restoreAllMocks();
  });

  it('injects traceparent when observability is initialized with an active client span', async () => {
    initObservability({
      serviceName: 'podverse-test',
      tracesExport: 'none',
    });

    await fetchWithTimeout('https://example.com/feed.xml', { method: 'GET' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    const init = call?.[1];
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[1-9a-f]$/);
  });
});
