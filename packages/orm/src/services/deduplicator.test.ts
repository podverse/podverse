import { describe, expect, it } from 'vitest';

import { buildItemMapsForDedup, findDuplicateItemForDedup } from './deduplicator.helpers.js';

type DedupItemShape = {
  id: number;
  guid?: string | null;
  guid_enclosure_url?: string | null;
};

describe('deduplicator helpers', () => {
  it('builds guid and guid_enclosure_url maps from available fields', () => {
    const keepA: DedupItemShape = { id: 1, guid: 'g-1', guid_enclosure_url: 'u-1' };
    const keepB: DedupItemShape = { id: 2, guid: 'g-2', guid_enclosure_url: null };

    const { guidMap, guidEnclosureUrlMap } = buildItemMapsForDedup([keepA, keepB]);

    expect(guidMap.get('g-1')?.id).toBe(1);
    expect(guidMap.get('g-2')?.id).toBe(2);
    expect(guidEnclosureUrlMap.get('u-1')?.id).toBe(1);
    expect(guidEnclosureUrlMap.has('')).toBe(false);
  });

  it('prefers guid matches before guid_enclosure_url matches', () => {
    const guidMatch: DedupItemShape = { id: 10, guid: 'same-guid', guid_enclosure_url: 'url-a' };
    const enclosureMatch: DedupItemShape = {
      id: 20,
      guid: 'other-guid',
      guid_enclosure_url: 'same-url',
    };
    const itemToArchive: DedupItemShape = {
      id: 30,
      guid: 'same-guid',
      guid_enclosure_url: 'same-url',
    };

    const { guidMap, guidEnclosureUrlMap } = buildItemMapsForDedup([guidMatch, enclosureMatch]);

    const duplicate = findDuplicateItemForDedup(itemToArchive, guidMap, guidEnclosureUrlMap);
    expect(duplicate?.id).toBe(10);
  });

  it('falls back to guid_enclosure_url when guid is missing', () => {
    const keep: DedupItemShape = { id: 42, guid: 'guid-42', guid_enclosure_url: 'url-42' };
    const itemToArchive: DedupItemShape = { id: 99, guid: null, guid_enclosure_url: 'url-42' };

    const { guidMap, guidEnclosureUrlMap } = buildItemMapsForDedup([keep]);

    const duplicate = findDuplicateItemForDedup(itemToArchive, guidMap, guidEnclosureUrlMap);
    expect(duplicate?.id).toBe(42);
  });

  it('returns undefined when no duplicate key is found', () => {
    const keep: DedupItemShape = { id: 5, guid: 'guid-5', guid_enclosure_url: 'url-5' };
    const itemToArchive: DedupItemShape = { id: 6, guid: 'guid-6', guid_enclosure_url: 'url-6' };

    const { guidMap, guidEnclosureUrlMap } = buildItemMapsForDedup([keep]);

    expect(findDuplicateItemForDedup(itemToArchive, guidMap, guidEnclosureUrlMap)).toBe(undefined);
  });
});
