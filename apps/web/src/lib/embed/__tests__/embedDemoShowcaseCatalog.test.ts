import { describe, expect, it } from 'vitest';

import {
  EMBED_DEMO_SHOWCASE_CATALOG,
  getEmbedDemoShowcaseLabelKey,
  getEmbedDemoShowcaseOrderIndex,
  resolveEmbedDemoPreviewPlayerSize,
} from '../embedDemoShowcaseCatalog';

describe('EMBED_DEMO_SHOWCASE_CATALOG', () => {
  it('orders the single demo sections episode/track/chapter/clip (audio then video)', () => {
    const singleShowcaseIds = [
      'episode-audio',
      'episode-video',
      'track-audio',
      'track-video',
      'chapter-audio',
      'chapter-video',
      'clip-audio',
      'clip-video',
    ];

    const orderedSingles = EMBED_DEMO_SHOWCASE_CATALOG.map((entry) => entry.showcaseId).filter(
      (showcaseId) => singleShowcaseIds.includes(showcaseId)
    );

    expect(orderedSingles).toEqual(singleShowcaseIds);
  });

  it('orders the new list demos after album-video and before playlist-mixed', () => {
    const order = [
      'album-video',
      'episode-chapters-audio',
      'episode-chapters-video',
      'podcast-clips-audio',
      'podcast-clips-video',
      'playlist-mixed',
    ] as const;

    for (let index = 0; index < order.length - 1; index += 1) {
      const currentId = order[index];
      const nextId = order[index + 1];
      expect(currentId).toBeDefined();
      expect(nextId).toBeDefined();
      if (currentId === undefined || nextId === undefined) {
        continue;
      }

      expect(getEmbedDemoShowcaseOrderIndex(currentId)).toBeLessThan(
        getEmbedDemoShowcaseOrderIndex(nextId)
      );
    }
  });

  it('maps each new list showcase id to its label key', () => {
    expect(getEmbedDemoShowcaseLabelKey('episode-chapters-audio')).toBe(
      'embed_demo_showcase_episode_chapters_audio_label'
    );
    expect(getEmbedDemoShowcaseLabelKey('episode-chapters-video')).toBe(
      'embed_demo_showcase_episode_chapters_video_label'
    );
    expect(getEmbedDemoShowcaseLabelKey('podcast-clips-audio')).toBe(
      'embed_demo_showcase_podcast_clips_audio_label'
    );
    expect(getEmbedDemoShowcaseLabelKey('podcast-clips-video')).toBe(
      'embed_demo_showcase_podcast_clips_video_label'
    );
  });

  it('maps showcase ids ending in -video to tall player size previews', () => {
    expect(resolveEmbedDemoPreviewPlayerSize('episode-video')).toBe('tall');
    expect(resolveEmbedDemoPreviewPlayerSize('episode-audio')).toBe('short');
  });
});
