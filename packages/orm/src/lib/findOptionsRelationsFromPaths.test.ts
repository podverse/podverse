import { describe, expect, it } from 'vitest';

import { findOptionsRelationsFromPaths } from './findOptionsRelationsFromPaths.js';

describe('findOptionsRelationsFromPaths', () => {
  it('maps flat and nested dot paths', () => {
    expect(
      findOptionsRelationsFromPaths(['account', 'clip.item', 'clip.item.channel.channel_images'])
    ).toEqual({
      account: true,
      clip: {
        item: {
          channel: {
            channel_images: true,
          },
        },
      },
    });
  });
});
