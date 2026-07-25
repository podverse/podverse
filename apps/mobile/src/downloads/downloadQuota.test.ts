import { describe, expect, it } from 'vitest';

import {
  formatDownloadBytes,
  isOverQuota,
  recordBytes,
  selectAutoDeleteVictims,
  sumCompletedBytes,
} from './downloadQuota';
import type { DownloadRecord } from './downloadTypes';

const record = (overrides: Partial<DownloadRecord>): DownloadRecord => ({
  itemIdText: 'item-1',
  enclosureUri: 'https://x/ep.mp3',
  enclosureUrlHash: 'abcd1234',
  enclosureMime: 'audio/mpeg',
  mediaType: 'audio',
  fileExtension: 'mp3',
  filePath: 'file:///docs/downloads/item-1.mp3',
  byteSize: 1000,
  bytesDownloaded: 1000,
  status: 'complete',
  title: 'Ep 1',
  artworkUrl: null,
  errorReason: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('recordBytes', () => {
  it('prefers byteSize, falls back to bytesDownloaded', () => {
    expect(recordBytes(record({ byteSize: 500, bytesDownloaded: 10 }))).toBe(500);
    expect(recordBytes(record({ byteSize: null, bytesDownloaded: 42 }))).toBe(42);
    expect(recordBytes(record({ byteSize: 0, bytesDownloaded: 0 }))).toBe(0);
  });
});

describe('sumCompletedBytes', () => {
  it('sums only complete rows (in-progress files are not final on disk)', () => {
    const rows = [
      record({ itemIdText: 'a', status: 'complete', byteSize: 100 }),
      record({ itemIdText: 'b', status: 'downloading', byteSize: 200, bytesDownloaded: 50 }),
      record({ itemIdText: 'c', status: 'complete', byteSize: 300 }),
    ];
    expect(sumCompletedBytes(rows)).toBe(400);
  });
});

describe('isOverQuota', () => {
  it('is true only when completed bytes exceed the cap', () => {
    const rows = [record({ byteSize: 600 })];
    expect(isOverQuota(rows, 500)).toBe(true);
    expect(isOverQuota(rows, 600)).toBe(false);
  });
});

describe('selectAutoDeleteVictims', () => {
  it('returns nothing when under the cap', () => {
    const rows = [record({ itemIdText: 'a', byteSize: 100 })];
    expect(selectAutoDeleteVictims(rows, 500)).toEqual([]);
  });

  it('evicts oldest-first until under the cap', () => {
    const rows = [
      record({ itemIdText: 'newest', byteSize: 100, updatedAt: 300 }),
      record({ itemIdText: 'oldest', byteSize: 100, updatedAt: 100 }),
      record({ itemIdText: 'middle', byteSize: 100, updatedAt: 200 }),
    ];
    // total 300, cap 150 → must drop 150+ → oldest then middle (200 → 100)
    expect(selectAutoDeleteVictims(rows, 150)).toEqual(['oldest', 'middle']);
  });

  it('never evicts the protected (just-completed) item', () => {
    const rows = [
      record({ itemIdText: 'oldest', byteSize: 100, updatedAt: 100 }),
      record({ itemIdText: 'fresh', byteSize: 100, updatedAt: 400 }),
    ];
    // cap 50 forces both over, but 'fresh' is protected → only 'oldest' selected
    expect(selectAutoDeleteVictims(rows, 50, 'fresh')).toEqual(['oldest']);
  });

  it('ignores in-progress rows as eviction candidates', () => {
    const rows = [
      record({ itemIdText: 'downloading', status: 'downloading', byteSize: 500 }),
      record({ itemIdText: 'complete', status: 'complete', byteSize: 100, updatedAt: 10 }),
    ];
    expect(selectAutoDeleteVictims(rows, 50)).toEqual(['complete']);
  });
});

describe('formatDownloadBytes', () => {
  it('formats GB / MB / KB / B', () => {
    expect(formatDownloadBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
    expect(formatDownloadBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatDownloadBytes(2 * 1024)).toBe('2 KB');
    expect(formatDownloadBytes(512)).toBe('512 B');
  });
});
