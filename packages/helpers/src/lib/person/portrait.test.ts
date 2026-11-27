import { describe, expect, it } from 'vitest';

import type { PersonPortraitCredit } from './portrait.js';
import { choosePersonListImage } from './portrait.js';

const crew = (img: string, at: string): PersonPortraitCredit => ({
  at,
  group: 'crew',
  img,
  kind: 'channel',
});

describe('choosePersonListImage', () => {
  it('prefers the latest crew channel image', () => {
    expect(
      choosePersonListImage([
        crew('https://example.com/old.jpg', '2020-01-01'),
        { at: '2024-01-01', group: 'cast', img: 'https://example.com/host.jpg', kind: 'channel' },
        crew('https://example.com/new.jpg', '2024-06-01'),
        { at: '2025-01-01', group: null, img: 'https://example.com/guest.jpg', kind: 'item' },
      ])
    ).toBe('https://example.com/new.jpg');
  });

  it('uses another channel image when no crew image exists', () => {
    expect(
      choosePersonListImage([
        { at: '2024-01-01', group: 'cast', img: 'https://example.com/host.jpg', kind: 'channel' },
        { at: '2025-01-01', group: null, img: 'https://example.com/guest.jpg', kind: 'item' },
      ])
    ).toBe('https://example.com/host.jpg');
  });

  it('uses the latest item image when no channel image exists', () => {
    expect(
      choosePersonListImage([
        { at: '2020-01-01', group: null, img: 'https://example.com/old.jpg', kind: 'item' },
        { at: '2025-01-01', group: null, img: 'https://example.com/new.jpg', kind: 'item' },
        { at: null, group: 'crew', img: '   ', kind: 'channel' },
      ])
    ).toBe('https://example.com/new.jpg');
  });

  it('returns null when no credit has an image', () => {
    expect(choosePersonListImage([])).toBeNull();
    expect(
      choosePersonListImage([{ at: '2025-01-01', group: 'cast', img: null, kind: 'channel' }])
    ).toBeNull();
  });
});
