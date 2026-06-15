import type { EmbedDemoShowcaseId, EmbedDemoShowcaseRouteKind } from '@podverse/helpers';

import type { EmbedPlayerSizeQuery } from './embedTypes';

export type EmbedDemoShowcaseLabelKey =
  | 'embed_demo_showcase_episode_audio_label'
  | 'embed_demo_showcase_episode_video_label'
  | 'embed_demo_showcase_track_audio_label'
  | 'embed_demo_showcase_track_video_label'
  | 'embed_demo_showcase_clip_audio_label'
  | 'embed_demo_showcase_clip_video_label'
  | 'embed_demo_showcase_official_clip_audio_label'
  | 'embed_demo_showcase_chapter_audio_label'
  | 'embed_demo_showcase_chapter_video_label'
  | 'embed_demo_showcase_podcast_audio_label'
  | 'embed_demo_showcase_podcast_video_label'
  | 'embed_demo_showcase_album_audio_label'
  | 'embed_demo_showcase_album_video_label'
  | 'embed_demo_showcase_episode_chapters_audio_label'
  | 'embed_demo_showcase_episode_chapters_video_label'
  | 'embed_demo_showcase_podcast_clips_audio_label'
  | 'embed_demo_showcase_podcast_clips_video_label'
  | 'embed_demo_showcase_playlist_mixed_label';

export type EmbedDemoShowcaseCatalogEntry = {
  showcaseId: EmbedDemoShowcaseId;
  routeKind: EmbedDemoShowcaseRouteKind;
  labelKey: EmbedDemoShowcaseLabelKey;
};

export const EMBED_DEMO_SHOWCASE_CATALOG: EmbedDemoShowcaseCatalogEntry[] = [
  {
    showcaseId: 'episode-audio',
    routeKind: 'episode',
    labelKey: 'embed_demo_showcase_episode_audio_label',
  },
  {
    showcaseId: 'episode-video',
    routeKind: 'episode',
    labelKey: 'embed_demo_showcase_episode_video_label',
  },
  {
    showcaseId: 'track-audio',
    routeKind: 'track',
    labelKey: 'embed_demo_showcase_track_audio_label',
  },
  {
    showcaseId: 'track-video',
    routeKind: 'track',
    labelKey: 'embed_demo_showcase_track_video_label',
  },
  {
    showcaseId: 'chapter-audio',
    routeKind: 'chapter',
    labelKey: 'embed_demo_showcase_chapter_audio_label',
  },
  {
    showcaseId: 'chapter-video',
    routeKind: 'chapter',
    labelKey: 'embed_demo_showcase_chapter_video_label',
  },
  {
    showcaseId: 'clip-audio',
    routeKind: 'clip',
    labelKey: 'embed_demo_showcase_clip_audio_label',
  },
  {
    showcaseId: 'clip-video',
    routeKind: 'clip',
    labelKey: 'embed_demo_showcase_clip_video_label',
  },
  {
    showcaseId: 'official-clip-audio',
    routeKind: 'official-clip',
    labelKey: 'embed_demo_showcase_official_clip_audio_label',
  },
  {
    showcaseId: 'podcast-audio',
    routeKind: 'podcast',
    labelKey: 'embed_demo_showcase_podcast_audio_label',
  },
  {
    showcaseId: 'podcast-video',
    routeKind: 'podcast',
    labelKey: 'embed_demo_showcase_podcast_video_label',
  },
  {
    showcaseId: 'album-audio',
    routeKind: 'album',
    labelKey: 'embed_demo_showcase_album_audio_label',
  },
  {
    showcaseId: 'album-video',
    routeKind: 'album',
    labelKey: 'embed_demo_showcase_album_video_label',
  },
  {
    showcaseId: 'episode-chapters-audio',
    routeKind: 'episode-chapters',
    labelKey: 'embed_demo_showcase_episode_chapters_audio_label',
  },
  {
    showcaseId: 'episode-chapters-video',
    routeKind: 'episode-chapters',
    labelKey: 'embed_demo_showcase_episode_chapters_video_label',
  },
  {
    showcaseId: 'podcast-clips-audio',
    routeKind: 'podcast',
    labelKey: 'embed_demo_showcase_podcast_clips_audio_label',
  },
  {
    showcaseId: 'podcast-clips-video',
    routeKind: 'podcast',
    labelKey: 'embed_demo_showcase_podcast_clips_video_label',
  },
  {
    showcaseId: 'playlist-mixed',
    routeKind: 'playlist',
    labelKey: 'embed_demo_showcase_playlist_mixed_label',
  },
];

const LABEL_KEY_BY_SHOWCASE_ID = new Map(
  EMBED_DEMO_SHOWCASE_CATALOG.map((entry) => [entry.showcaseId, entry.labelKey])
);

const ORDER_INDEX_BY_SHOWCASE_ID = new Map(
  EMBED_DEMO_SHOWCASE_CATALOG.map((entry, index) => [entry.showcaseId, index])
);

export function getEmbedDemoShowcaseLabelKey(
  showcaseId: EmbedDemoShowcaseId
): EmbedDemoShowcaseLabelKey {
  const labelKey = LABEL_KEY_BY_SHOWCASE_ID.get(showcaseId);
  if (labelKey === undefined) {
    throw new Error(`Unknown embed demo showcase id: ${showcaseId}`);
  }
  return labelKey;
}

/** Canonical display order for `/embed` demo sections; unknown ids sort last. */
export function getEmbedDemoShowcaseOrderIndex(showcaseId: EmbedDemoShowcaseId): number {
  return ORDER_INDEX_BY_SHOWCASE_ID.get(showcaseId) ?? Number.MAX_SAFE_INTEGER;
}

export function resolveEmbedDemoPreviewPlayerSize(showcaseId: string): EmbedPlayerSizeQuery {
  if (showcaseId.endsWith('-video')) {
    return 'tall';
  }

  return 'short';
}

/** @deprecated Use resolveEmbedDemoPreviewPlayerSize */
export function resolveEmbedDemoPreviewPresentationStyle(showcaseId: string): 'audio' | 'video' {
  return resolveEmbedDemoPreviewPlayerSize(showcaseId) === 'tall' ? 'video' : 'audio';
}
