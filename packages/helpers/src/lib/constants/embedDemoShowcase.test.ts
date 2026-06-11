import { describe, expect, it } from 'vitest';

import { buildEmbedDemoHref } from './embedDemoShowcase.js';

describe('buildEmbedDemoHref', () => {
  it('appends chapter_markers for audio podcast showcases', () => {
    expect(buildEmbedDemoHref('podcast', 'podCh01', 'podcast-audio')).toBe(
      '/embed/podcast/podCh01?chapter_markers=1'
    );
  });

  it('appends presentation=video for video showcases without chapter_markers', () => {
    expect(buildEmbedDemoHref('podcast', 'podVid01', 'podcast-video')).toBe(
      '/embed/podcast/podVid01?presentation=video'
    );
  });

  it('locks album video showcases to video presentation even for music channels', () => {
    expect(buildEmbedDemoHref('album', 'albumVid01', 'album-video')).toBe(
      '/embed/album/albumVid01?presentation=video'
    );
  });

  it('appends presentation=video for single-item video showcases', () => {
    expect(buildEmbedDemoHref('track', 'trackVid01', 'track-video')).toBe(
      '/embed/track/trackVid01?presentation=video'
    );
  });
});
