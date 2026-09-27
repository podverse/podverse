import { describe, expect, it } from 'vitest';

import { compareClientVersion, parseClientVersion } from './compareClientVersion.js';

describe('compareClientVersion', () => {
  it('reports equal versions as 0, treating missing trailing segments as zero', () => {
    expect(compareClientVersion('5.5.3', '5.5.3')).toBe(0);
    expect(compareClientVersion('5.5', '5.5.0')).toBe(0);
    expect(compareClientVersion('5.5.0', '5.5')).toBe(0);
  });

  it('reports a newer client as 1 at every segment', () => {
    expect(compareClientVersion('6.0.0', '5.5.3')).toBe(1);
    expect(compareClientVersion('5.6.0', '5.5.3')).toBe(1);
    expect(compareClientVersion('5.5.4', '5.5.3')).toBe(1);
    expect(compareClientVersion('5.5.3.1', '5.5.3')).toBe(1);
  });

  it('reports an older client as -1 at every segment', () => {
    expect(compareClientVersion('4.9.9', '5.5.3')).toBe(-1);
    expect(compareClientVersion('5.4.9', '5.5.3')).toBe(-1);
    expect(compareClientVersion('5.5.2', '5.5.3')).toBe(-1);
  });

  it('compares segments numerically, not as text', () => {
    expect(compareClientVersion('5.10.0', '5.9.9')).toBe(1);
    expect(compareClientVersion('5.5.10', '5.5.9')).toBe(1);
  });

  it('treats a missing or unparseable client version as too old', () => {
    const unparseable = [
      null,
      undefined,
      '',
      '   ',
      'unknown',
      '5.5.x',
      '5..3',
      '5.5.3-beta',
      'v5.5.3',
    ];
    for (const clientVersion of unparseable) {
      expect(compareClientVersion(clientVersion, '5.5.3')).toBe(-1);
    }
  });

  it('ignores surrounding whitespace in the header value', () => {
    expect(compareClientVersion(' 5.5.3 ', '5.5.3')).toBe(0);
  });

  it('throws when the required version is misconfigured', () => {
    expect(() => compareClientVersion('5.5.3', '')).toThrow(TypeError);
    expect(() => compareClientVersion('5.5.3', 'latest')).toThrow(TypeError);
  });
});

describe('parseClientVersion', () => {
  it('returns the numeric segments of a plain dotted version', () => {
    expect(parseClientVersion('5.5.3')).toEqual([5, 5, 3]);
  });

  it('returns null for prerelease suffixes', () => {
    expect(parseClientVersion('5.5.3-rc.1')).toBeNull();
  });
});
