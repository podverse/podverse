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
    expect(buildEmbedDemoHref('clip', 'clipVid01', 'clip-video')).toBe(
      '/embed/clip/clipVid01?presentation=video'
    );
    expect(buildEmbedDemoHref('chapter', 'chVid01', 'chapter-video')).toBe(
      '/embed/chapter/chVid01?presentation=video'
    );
  });

  it('appends play_id_text for list showcases when a default play item is set', () => {
    expect(buildEmbedDemoHref('album', 'albumVid01', 'album-video', 'trackVid09')).toBe(
      '/embed/album/albumVid01?presentation=video&play_id_text=trackVid09'
    );
  });

  it('appends play_id_text for audio podcast list showcases alongside chapter_markers', () => {
    expect(buildEmbedDemoHref('podcast', 'podCh01', 'podcast-audio', 'episodeA1')).toBe(
      '/embed/podcast/podCh01?chapter_markers=1&play_id_text=episodeA1'
    );
  });

  it('appends play_id_text for playlist showcases', () => {
    expect(buildEmbedDemoHref('playlist', 'playlist01', 'playlist-mixed', 'plItem01')).toBe(
      '/embed/playlist/playlist01?play_id_text=plItem01'
    );
  });

  it('ignores play_id_text for single-item showcases', () => {
    expect(buildEmbedDemoHref('track', 'trackVid01', 'track-video', 'someItem')).toBe(
      '/embed/track/trackVid01?presentation=video'
    );
  });

  it('omits play_id_text when the play item is empty or null', () => {
    expect(buildEmbedDemoHref('album', 'albumVid01', 'album-video', '')).toBe(
      '/embed/album/albumVid01?presentation=video'
    );
    expect(buildEmbedDemoHref('album', 'albumVid01', 'album-video', null)).toBe(
      '/embed/album/albumVid01?presentation=video'
    );
  });
});
