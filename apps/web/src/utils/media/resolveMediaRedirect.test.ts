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
  const lookup = vi.fn(async (hostname: string) => {
    const address = hostname === 'private.test' ? '10.1.1.1' : '1.1.1.1';
    return [{ address, family: 4 }];
  });
  return {
    default: { promises: { lookup } },
    promises: { lookup },
  };
});

import { resolveMediaRedirectChain } from './resolveMediaRedirect';

const directFetch = vi.mocked(fetchWithTimeout);
const fetchMock = vi.mocked(fetchForOutbound);

const hopResponse = (status: number, headers?: Record<string, string>): Response =>
  new Response(null, { status, headers });

describe('resolveMediaRedirectChain', () => {
  beforeEach(() => {
    directFetch.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the final URL after a redirect when that host allows a website to load it', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url === 'https://cdn.example/start') {
        return hopResponse(302, { Location: 'https://cdn.example/final' });
      }
      return hopResponse(200, { 'Cross-Origin-Resource-Policy': 'cross-origin' });
    });

    await expect(resolveMediaRedirectChain('https://cdn.example/start', 'agent')).resolves.toEqual({
      url: 'https://cdn.example/final',
      reason: 'resolved',
    });
    const headers = fetchMock.mock.calls[0]?.[1]?.headers;
    expect(headers).toEqual({ 'User-Agent': 'agent' });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      maxBodyBytes: 0,
      method: 'HEAD',
      redirect: 'manual',
    });
  });

  it('rejects a literal private address before any request', async () => {
    await expect(resolveMediaRedirectChain('http://10.1.1.1/file', 'agent')).resolves.toEqual({
      url: null,
      reason: 'invalid',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('rejects a hostname that resolves to a private address', async () => {
    await expect(resolveMediaRedirectChain('https://private.test/file', 'agent')).resolves.toEqual({
      url: null,
      reason: 'invalid',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('rejects a URL that embeds credentials', async () => {
    await expect(
      resolveMediaRedirectChain('https://user:secret@cdn.example/file', 'agent')
    ).resolves.toEqual({ url: null, reason: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('stops when a redirect lands on a private address', async () => {
    fetchMock.mockResolvedValue(hopResponse(302, { Location: 'http://10.1.1.1/secret' }));

    await expect(resolveMediaRedirectChain('https://cdn.example/start', 'agent')).resolves.toEqual({
      url: null,
      reason: 'invalid',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect onto the other loopback host when loopback fetches are allowed', async () => {
    directFetch.mockImplementation(async (url) => {
      if (String(url).includes('127.0.0.1')) {
        return hopResponse(200);
      }
      return hopResponse(302, {
        Location: 'http://127.0.0.1:2111/e2e/images/art.png',
        'Cross-Origin-Resource-Policy': 'same-origin',
      });
    });

    await expect(
      resolveMediaRedirectChain(
        'http://localhost:2111/redirect/corp-hop/e2e/images/art.png',
        'agent'
      )
    ).resolves.toEqual({
      url: 'http://127.0.0.1:2111/e2e/images/art.png',
      reason: 'resolved',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops after five redirects', async () => {
    fetchMock.mockImplementation(async (url) => {
      const match = /\/hop\/(\d+)$/.exec(String(url));
      const hop = match === null ? 0 : Number(match[1]);
      return hopResponse(302, { Location: `https://cdn.example/hop/${hop + 1}` });
    });

    await expect(resolveMediaRedirectChain('https://cdn.example/hop/0', 'agent')).resolves.toEqual({
      url: null,
      reason: 'too_many_redirects',
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('reports a final host that still blocks websites', async () => {
    fetchMock.mockResolvedValue(
      hopResponse(200, { 'Cross-Origin-Resource-Policy': 'same-origin' })
    );

    await expect(resolveMediaRedirectChain('https://cdn.example/file', 'agent')).resolves.toEqual({
      url: null,
      reason: 'blocked_final',
    });
  });

  it('reports an HTTP error from a hop', async () => {
    fetchMock.mockResolvedValue(hopResponse(404));

    await expect(
      resolveMediaRedirectChain('https://cdn.example/missing', 'agent')
    ).resolves.toEqual({
      url: null,
      reason: 'http_error',
      httpStatus: 404,
    });
  });

  it('retries a refused HEAD once as a ranged GET', async () => {
    fetchMock
      .mockResolvedValueOnce(hopResponse(405))
      .mockResolvedValueOnce(hopResponse(200, { 'Cross-Origin-Resource-Policy': 'cross-origin' }));

    await expect(resolveMediaRedirectChain('https://cdn.example/file', 'agent')).resolves.toEqual({
      url: null,
      reason: 'same_url',
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { Range: 'bytes=0-0', 'User-Agent': 'agent' },
      maxBodyBytes: 0,
      method: 'GET',
      redirect: 'manual',
    });
  });
});
