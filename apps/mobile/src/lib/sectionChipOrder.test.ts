import { describe, expect, it } from 'vitest';

import { placeSelectedFirst } from './sectionChipOrder';

const items = [
  { key: 'episodes' },
  { key: 'downloaded' },
  { key: 'about' },
  { key: 'clips' },
] as const;

describe('placeSelectedFirst', () => {
  it('leaves the row alone when the selected chip is already first', () => {
    expect(placeSelectedFirst(items, 'episodes').map((item) => item.key)).toEqual([
      'episodes',
      'downloaded',
      'about',
      'clips',
    ]);
  });

  it('moves a later selected chip to the front and keeps the others in order', () => {
    expect(placeSelectedFirst(items, 'about').map((item) => item.key)).toEqual([
      'about',
      'episodes',
      'downloaded',
      'clips',
    ]);
  });

  it('keeps the given order when nothing is selected', () => {
    expect(placeSelectedFirst(items, null).map((item) => item.key)).toEqual([
      'episodes',
      'downloaded',
      'about',
      'clips',
    ]);
  });

  it('keeps the given order when the selected key is not in the row', () => {
    expect(placeSelectedFirst(items, 'podroll').map((item) => item.key)).toEqual([
      'episodes',
      'downloaded',
      'about',
      'clips',
    ]);
  });
});
