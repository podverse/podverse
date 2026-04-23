import { describe, expect, it } from 'vitest';

import { computeParsingStaleBefore, deriveHttpsAndHttpUrlsFromInput } from './feed.helpers.js';

describe('deriveHttpsAndHttpUrlsFromInput', () => {
  it('strips scheme and builds https and http URLs', () => {
    expect(deriveHttpsAndHttpUrlsFromInput('HTTPS://Example.COM/path')).toEqual({
      base: 'Example.COM/path',
      httpsUrl: 'https://Example.COM/path',
      httpUrl: 'http://Example.COM/path',
    });
  });

  it('handles URLs without scheme', () => {
    expect(deriveHttpsAndHttpUrlsFromInput('podcast.example/feed.xml')).toEqual({
      base: 'podcast.example/feed.xml',
      httpsUrl: 'https://podcast.example/feed.xml',
      httpUrl: 'http://podcast.example/feed.xml',
    });
  });
});

describe('computeParsingStaleBefore', () => {
  it('subtracts parsing age in minutes from now', () => {
    const nowMs = 1_700_000_000_000;
    const stale = computeParsingStaleBefore(nowMs, 15);
    expect(stale.getTime()).toBe(nowMs - 15 * 60 * 1000);
  });

  it('supports zero-minute window', () => {
    const nowMs = 1_700_000_000_000;
    expect(computeParsingStaleBefore(nowMs, 0).getTime()).toBe(nowMs);
  });
});
