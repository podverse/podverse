import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OutboundUrlBlockedError,
  resolveOutboundFetchTarget,
  validateOutboundFetchUrl,
  validateOutboundRedirectLocation,
} from './outboundHttpPolicy.js';

const lookup = vi.hoisted(() => vi.fn(async () => [{ address: '1.1.1.1', family: 4 }]));

vi.mock('node:dns', () => ({
  default: { promises: { lookup } },
  promises: { lookup },
}));

describe('validateOutboundFetchUrl', () => {
  beforeEach(() => {
    lookup.mockReset();
    lookup.mockImplementation(async () => [{ address: '1.1.1.1', family: 4 }]);
  });

  it('allows a public IPv4 literal', async () => {
    await expect(validateOutboundFetchUrl('http://1.1.1.1/path')).resolves.toBeUndefined();
  });

  it('blocks loopback IPv4', async () => {
    await expect(validateOutboundFetchUrl('http://127.0.0.1/foo')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks AWS metadata IP', async () => {
    await expect(
      validateOutboundFetchUrl('http://169.254.169.254/latest/meta-data')
    ).rejects.toThrow(OutboundUrlBlockedError);
  });

  it('blocks RFC1918 10/8', async () => {
    await expect(validateOutboundFetchUrl('http://10.0.0.1/')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks RFC1918 172.16/12', async () => {
    await expect(validateOutboundFetchUrl('http://172.16.0.1/')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks RFC1918 192.168/16', async () => {
    await expect(validateOutboundFetchUrl('http://192.168.1.1/')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks localhost hostname', async () => {
    await expect(validateOutboundFetchUrl('http://localhost/rss')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks IPv6 loopback literal', async () => {
    await expect(validateOutboundFetchUrl('http://[::1]/feed.xml')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks IPv4-mapped IPv6 loopback', async () => {
    await expect(validateOutboundFetchUrl('http://[::ffff:127.0.0.1]/')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks non-http(s) schemes', async () => {
    await expect(validateOutboundFetchUrl('ftp://example.com/file')).rejects.toThrow(
      OutboundUrlBlockedError
    );
    await expect(validateOutboundFetchUrl('file:///etc/passwd')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks URLs with embedded credentials', async () => {
    await expect(validateOutboundFetchUrl('http://user:pass@1.1.1.1/x')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('blocks a hostname that resolves to loopback', async () => {
    lookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    await expect(validateOutboundFetchUrl('https://public.example/cover.png')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });
});

describe('validateOutboundRedirectLocation', () => {
  beforeEach(() => {
    lookup.mockReset();
    lookup.mockImplementation(async () => [{ address: '1.1.1.1', family: 4 }]);
  });

  it('allows a public redirect target', () => {
    expect(() => validateOutboundRedirectLocation({ href: 'http://1.1.1.1/next' })).not.toThrow();
  });

  it('rejects redirect to private IP', () => {
    expect(() => validateOutboundRedirectLocation({ href: 'http://192.168.1.5/home' })).toThrow(
      OutboundUrlBlockedError
    );
  });

  it('rejects redirect to loopback', () => {
    expect(() => validateOutboundRedirectLocation({ href: 'http://127.0.0.1/' })).toThrow(
      OutboundUrlBlockedError
    );
  });

  it('rejects missing href', () => {
    expect(() => validateOutboundRedirectLocation({})).toThrow(OutboundUrlBlockedError);
  });

  it('accepts a hostname in the synchronous redirect check', () => {
    lookup.mockClear();
    expect(() =>
      validateOutboundRedirectLocation({ href: 'http://cdn.example.net/feed.xml' })
    ).not.toThrow();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('blocks a redirect hostname when DNS is a private address', async () => {
    lookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);
    await expect(resolveOutboundFetchTarget('http://cdn.example.net/feed.xml')).rejects.toThrow(
      OutboundUrlBlockedError
    );
  });

  it('returns the looked-up address for a public redirect hostname', async () => {
    const target = await resolveOutboundFetchTarget('http://cdn.example.net/feed.xml');
    expect(target.hostname).toBe('cdn.example.net');
    expect(target.addresses).toEqual([{ address: '1.1.1.1', family: 4 }]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});
