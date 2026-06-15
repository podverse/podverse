import { describe, expect, it } from 'vitest';

import { getEmbedLayoutType } from '../getEmbedLayoutType';

describe('getEmbedLayoutType', () => {
  it('returns the index layout for the index route', () => {
    expect(getEmbedLayoutType('index')).toBe('index');
  });

  it('returns the list layout for channel, playlist, and episode-chapters routes', () => {
    expect(getEmbedLayoutType('podcast')).toBe('list');
    expect(getEmbedLayoutType('album')).toBe('list');
    expect(getEmbedLayoutType('playlist')).toBe('list');
    expect(getEmbedLayoutType('episode-chapters')).toBe('list');
  });

  it('returns the single layout for item and segment routes', () => {
    expect(getEmbedLayoutType('episode')).toBe('single');
    expect(getEmbedLayoutType('track')).toBe('single');
    expect(getEmbedLayoutType('clip')).toBe('single');
    expect(getEmbedLayoutType('chapter')).toBe('single');
    expect(getEmbedLayoutType('official-clip')).toBe('single');
  });
});
