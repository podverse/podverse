import { describe, expect, it } from 'vitest';

import { formatPlaylistTagLine } from './playlistTagLine.js';

describe('formatPlaylistTagLine', () => {
  it('returns null when tags are missing, empty, or only blank', () => {
    expect(formatPlaylistTagLine(undefined)).toBeNull();
    expect(formatPlaylistTagLine([])).toBeNull();
    expect(formatPlaylistTagLine(['', '  '])).toBeNull();
  });

  it('joins names with a comma and a space and keeps their order', () => {
    expect(formatPlaylistTagLine(['adam curry', 'podcasting-2.0'])).toBe(
      'adam curry, podcasting-2.0'
    );
  });

  it('trims each name and does not fold case', () => {
    expect(formatPlaylistTagLine(['  Adam Curry  ', 'news'])).toBe('Adam Curry, news');
  });

  it('returns one name with no comma', () => {
    expect(formatPlaylistTagLine(['news'])).toBe('news');
  });
});
