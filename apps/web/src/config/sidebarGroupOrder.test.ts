import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SIDEBAR_GROUP_ORDER,
  parseSidebarGroupOrder,
  parseSidebarGroupOrderStrict,
} from '@podverse/helpers-config';

describe('sidebar group order', () => {
  it('defaults when undefined or blank', () => {
    expect(parseSidebarGroupOrder(undefined)).toEqual([...DEFAULT_SIDEBAR_GROUP_ORDER]);
    expect(parseSidebarGroupOrder('')).toEqual([...DEFAULT_SIDEBAR_GROUP_ORDER]);
    expect(parseSidebarGroupOrder('   ')).toEqual([...DEFAULT_SIDEBAR_GROUP_ORDER]);
  });

  it('accepts valid permutations', () => {
    expect(parseSidebarGroupOrder('music,podcasts,addByRSS,library')).toEqual([
      'music',
      'podcasts',
      'addByRSS',
      'library',
    ]);
    expect(parseSidebarGroupOrder('podcasts,music,addByRSS,library')).toEqual([
      'podcasts',
      'music',
      'addByRSS',
      'library',
    ]);
  });

  it('trims tokens', () => {
    expect(parseSidebarGroupOrderStrict(' music , podcasts , addByRSS , library ')).toEqual({
      ok: true,
      order: ['music', 'podcasts', 'addByRSS', 'library'],
    });
  });

  it('rejects unknown tokens', () => {
    expect(parseSidebarGroupOrderStrict('podcasts,music,addByRSS,extra').ok).toBe(false);
  });

  it('rejects duplicates', () => {
    expect(parseSidebarGroupOrderStrict('podcasts,podcasts,music,library').ok).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(parseSidebarGroupOrderStrict('podcasts,music').ok).toBe(false);
  });

  it('rejects empty segments', () => {
    expect(parseSidebarGroupOrderStrict('podcasts,music,,library').ok).toBe(false);
  });

  it('parseSidebarGroupOrder throws on invalid non-empty value', () => {
    expect(() => parseSidebarGroupOrder('bad')).toThrow();
  });
});
