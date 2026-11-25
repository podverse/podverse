import { describe, expect, it } from 'vitest';

import { embedDemoRouteOffered } from './embedDemoMusicRoutes';

describe('embedDemoRouteOffered', () => {
  it('offers album, track, and podcast when Music is on', () => {
    expect(embedDemoRouteOffered('album', true)).toBe(true);
    expect(embedDemoRouteOffered('track', true)).toBe(true);
    expect(embedDemoRouteOffered('podcast', true)).toBe(true);
  });

  it('omits album and track when Music is off and keeps the other demo kinds', () => {
    expect(embedDemoRouteOffered('album', false)).toBe(false);
    expect(embedDemoRouteOffered('track', false)).toBe(false);
    expect(embedDemoRouteOffered('podcast', false)).toBe(true);
    expect(embedDemoRouteOffered('clip', false)).toBe(true);
    expect(embedDemoRouteOffered('chapter', false)).toBe(true);
    expect(embedDemoRouteOffered('episode-chapters', false)).toBe(true);
  });
});
