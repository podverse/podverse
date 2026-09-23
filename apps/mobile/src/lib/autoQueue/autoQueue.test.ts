import { describe, expect, it } from 'vitest';

import type { AutoQueueConfig } from './autoQueue';
import {
  createDefaultAutoQueueConfig,
  resolveAutoQueueConfigAfterDirective,
  toggleAutoQueueShuffle,
} from './autoQueue';

const configWith = (overrides: Partial<AutoQueueConfig>): AutoQueueConfig => ({
  ...createDefaultAutoQueueConfig(),
  ...overrides,
});

describe('resolveAutoQueueConfigAfterDirective', () => {
  it('rotates shuffleHash on clear and keeps random and repeat', () => {
    const current = configWith({
      nextPage: 4,
      playlist_id_text: 'pl-keep-out',
      random: true,
      repeat: true,
      shuffleHash: 'stale-hash',
    });

    const next = resolveAutoQueueConfigAfterDirective(
      current,
      { mode: 'clear' },
      () => 'fresh-hash'
    );

    expect(next.shuffleHash).toBe('fresh-hash');
    expect(next.nextPage).toBe(1);
    expect(next.playlist_id_text).toBeNull();
    expect(next.random).toBe(true);
    expect(next.repeat).toBe(true);
    expect(next.disabled).toBe(current.disabled);
  });

  it('seeds a playlist source without rotating the hash', () => {
    const current = configWith({
      nextPage: 3,
      random: true,
      shuffleHash: 'keep-hash',
    });

    const next = resolveAutoQueueConfigAfterDirective(
      current,
      { mode: 'seed-playlist', playlistIdText: 'pl-1' },
      () => 'must-not-use'
    );

    expect(next.shuffleHash).toBe('keep-hash');
    expect(next.playlist_id_text).toBe('pl-1');
    expect(next.nextPage).toBe(1);
    expect(next.disabled).toBe(false);
    expect(next.random).toBe(true);
  });
});

describe('toggleAutoQueueShuffle', () => {
  it('flips random, rotates the hash, and restarts paging', () => {
    const current = configWith({
      nextPage: 3,
      random: false,
      repeat: true,
      shuffleHash: 'hash-a',
    });

    const next = toggleAutoQueueShuffle(current, () => 'hash-b');

    expect(next.random).toBe(true);
    expect(next.shuffleHash).toBe('hash-b');
    expect(next.nextPage).toBe(1);
    expect(next.repeat).toBe(true);
  });
});
