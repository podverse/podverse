import { describe, expect, it } from 'vitest';

import {
  dummyClipTitle,
  dummyClipWindow,
  LOCAL_USER_CONTENT_SEED_EMAILS,
  pickRotated,
} from './localUserContentSeedLib.js';

describe('localUserContentSeedLib', () => {
  it('keeps dummy catalog emails off example.com and e2e prefixes', () => {
    const dummyEmails = LOCAL_USER_CONTENT_SEED_EMAILS.filter((email) =>
      email.startsWith('dummy')
    );
    expect(dummyEmails).toHaveLength(6);
    for (const email of dummyEmails) {
      expect(email.endsWith('@podverse.local')).toBe(true);
      expect(email.startsWith('e2e-')).toBe(false);
      expect(email.startsWith('local-')).toBe(false);
    }
  });

  it('picks a rotated slice without wrapping past the requested count', () => {
    expect(pickRotated(['a', 'b', 'c', 'd'], 1, 3)).toEqual(['b', 'c', 'd']);
    expect(pickRotated(['a', 'b', 'c'], 2, 3)).toEqual(['c', 'a', 'b']);
    expect(pickRotated(['a'], 9, 4)).toEqual(['a']);
    expect(pickRotated([], 1, 3)).toEqual([]);
  });

  it('builds clip titles from item id_text', () => {
    expect(dummyClipTitle('abc123xyz')).toBe('Dummy clip abc123xyz');
  });

  it('keeps clip windows 15–30s, start ≤ 60, end ≤ 90', () => {
    for (let accountId = 1; accountId <= 20; accountId += 1) {
      for (let itemId = 1; itemId <= 40; itemId += 1) {
        const window = dummyClipWindow(accountId, itemId);
        const duration = window.end - window.start;
        expect(window.start).toBeGreaterThanOrEqual(0);
        expect(window.start).toBeLessThanOrEqual(60);
        expect(window.end).toBeGreaterThan(window.start);
        expect(window.end).toBeLessThanOrEqual(90);
        expect(duration).toBeGreaterThanOrEqual(15);
        expect(duration).toBeLessThanOrEqual(30);
      }
    }
  });

  it('returns the same window for the same account and item', () => {
    expect(dummyClipWindow(4, 11)).toEqual(dummyClipWindow(4, 11));
  });
});
