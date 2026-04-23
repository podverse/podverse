import { describe, expect, it } from 'vitest';

import {
  OutboundUrlBlockedError,
  validateOutboundFetchUrl,
  validateOutboundRedirectLocation,
} from './outboundHttpPolicy.js';

describe('validateOutboundFetchUrl', () => {
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
});

describe('validateOutboundRedirectLocation', () => {
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

  it('allows hostname redirects (DNS cannot be checked synchronously in axios hook)', () => {
    expect(() =>
      validateOutboundRedirectLocation({ href: 'http://cdn.example.net/feed.xml' })
    ).not.toThrow();
  });
});
