import { describe, expect, it } from 'vitest';

import { webClient } from './web-client.js';

describe('cloudflare web-client headScripts', () => {
  it('returns an empty array when token is empty', () => {
    const descriptors = webClient.headScripts?.({
      config: {
        token: '   ',
      },
    });

    expect(descriptors).toEqual([]);
  });

  it('returns one descriptor with default script src and token payload when token is valid', () => {
    const token = '00000000000000000000000000000000';

    const descriptors = webClient.headScripts?.({
      config: {
        token,
      },
    });

    expect(descriptors).toHaveLength(1);
    expect(descriptors?.[0]?.src).toBe('https://static.cloudflareinsights.com/beacon.min.js');

    const payload = descriptors?.[0]?.dataAttrs?.['cf-beacon'];
    expect(payload).toBeDefined();
    expect(JSON.parse(payload ?? '{}')).toEqual({ token });
  });

  it('uses beaconUrl override when provided', () => {
    const descriptors = webClient.headScripts?.({
      config: {
        token: '00000000000000000000000000000000',
        beaconUrl: 'https://example.com/custom-beacon.js',
      },
    });

    expect(descriptors).toHaveLength(1);
    expect(descriptors?.[0]?.src).toBe('https://example.com/custom-beacon.js');
  });
});
