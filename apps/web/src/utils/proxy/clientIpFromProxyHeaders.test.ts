import { describe, expect, it } from 'vitest';

import { getClientIpFromProxyHeaders } from './clientIpFromProxyHeaders.js';

describe('getClientIpFromProxyHeaders', () => {
  it('prefers first X-Forwarded-For address', () => {
    expect(
      getClientIpFromProxyHeaders({
        forwardedFor: ' 203.0.113.1 , 198.51.100.2 ',
        realIp: '192.0.2.9',
      })
    ).toBe('203.0.113.1');
  });

  it('falls back to X-Real-IP when forwarded-for is absent', () => {
    expect(
      getClientIpFromProxyHeaders({
        forwardedFor: null,
        realIp: '192.0.2.5',
      })
    ).toBe('192.0.2.5');
  });

  it('returns unknown when no proxy headers', () => {
    expect(getClientIpFromProxyHeaders({ forwardedFor: null, realIp: null })).toBe('unknown');
  });
});
