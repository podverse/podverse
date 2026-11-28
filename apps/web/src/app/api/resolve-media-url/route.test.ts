import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWithTimeout } from '@podverse/helpers-backend';
import { fetchForOutbound } from '@podverse/helpers-requests/outbound-requests';

vi.mock('@podverse/helpers-backend', () => ({
  fetchWithTimeout: vi.fn(),
}));

vi.mock('@podverse/helpers-requests/outbound-requests', () => ({
  fetchForOutbound: vi.fn(),
}));

vi.mock('node:dns', () => {
  const lookup = vi.fn(async () => [{ address: '1.1.1.1', family: 4 }]);
  return {
    default: { promises: { lookup } },
    promises: { lookup },
  };
});

vi.mock('../../../config', () => ({
  getConfig: () => ({ proxy: { userAgent: 'PodverseTest' } }),
}));

vi.mock('../../../utils/proxy/rateLimiter', () => ({
  checkRateLimit: vi.fn(),
}));

import { checkRateLimit } from '../../../utils/proxy/rateLimiter';
import { GET } from './route';

const directFetch = vi.mocked(fetchWithTimeout);
const fetchMock = vi.mocked(fetchForOutbound);
const rateLimitMock = vi.mocked(checkRateLimit);

const requestFor = (rawUrl: string | null): NextRequest => {
  const query = rawUrl === null ? '' : `?url=${encodeURIComponent(rawUrl)}`;
  return new NextRequest(`http://localhost:4032/api/resolve-media-url${query}`);
};

describe('GET /api/resolve-media-url', () => {
  beforeEach(() => {
    directFetch.mockReset();
    fetchMock.mockReset();
    rateLimitMock.mockReturnValue({
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 60_000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers 400 when the URL is missing, embeds credentials, or is a private address', async () => {
    const missing = await GET(requestFor(null));
    const userinfo = await GET(requestFor('https://user:secret@cdn.example/file'));
    const privateAddress = await GET(requestFor('http://10.1.1.1/file'));

    expect(missing.status).toBe(400);
    expect(userinfo.status).toBe(400);
    expect(privateAddress.status).toBe(400);
    await expect(privateAddress.json()).resolves.toEqual({ url: null, reason: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('answers 429 when the shared proxy rate limit is exhausted', async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetTime: Date.now() + 5_000 });

    const response = await GET(requestFor('https://cdn.example/file'));

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('returns the final URL and a private cache header', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url === 'https://cdn.example/start') {
        return new Response(null, {
          status: 302,
          headers: { Location: 'https://cdn.example/final' },
        });
      }
      return new Response(null, { status: 200 });
    });

    const response = await GET(requestFor('https://cdn.example/start'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=600');
    await expect(response.json()).resolves.toEqual({
      url: 'https://cdn.example/final',
      reason: 'resolved',
    });
  });
});
