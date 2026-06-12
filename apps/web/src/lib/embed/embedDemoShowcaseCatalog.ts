import type { EmbedDemoShowcaseId, EmbedDemoShowcaseRouteKind } from '@podverse/helpers';

export type EmbedDemoShowcaseLabelKey =
  | 'embed_demo_showcase_episode_audio_label'
  | 'embed_demo_showcase_episode_video_label'
  | 'embed_demo_showcase_track_audio_label'
  | 'embed_demo_showcase_track_video_label'
  | 'embed_demo_showcase_clip_audio_label'
  | 'embed_demo_showcase_official_clip_audio_label'
  | 'embed_demo_showcase_chapter_audio_label'
  | 'embed_demo_showcase_podcast_audio_label'
  | 'embed_demo_showcase_podcast_video_label'
  | 'embed_demo_showcase_album_audio_label'
  | 'embed_demo_showcase_album_video_label'
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
    showcaseId: 'clip-audio',
    routeKind: 'clip',
    labelKey: 'embed_demo_showcase_clip_audio_label',
  },
  {
    showcaseId: 'official-clip-audio',
    routeKind: 'official-clip',
    labelKey: 'embed_demo_showcase_official_clip_audio_label',
  },
  {
    showcaseId: 'chapter-audio',
    routeKind: 'chapter',
    labelKey: 'embed_demo_showcase_chapter_audio_label',
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
    showcaseId: 'playlist-mixed',
    routeKind: 'playlist',
    labelKey: 'embed_demo_showcase_playlist_mixed_label',
  },
];

const LABEL_KEY_BY_SHOWCASE_ID = new Map(
  EMBED_DEMO_SHOWCASE_CATALOG.map((entry) => [entry.showcaseId, entry.labelKey])
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

export function resolveEmbedDemoPreviewPresentationStyle(showcaseId: string): 'audio' | 'video' {
  if (showcaseId.endsWith('-video')) {
    return 'video';
  }

  return 'audio';
}
