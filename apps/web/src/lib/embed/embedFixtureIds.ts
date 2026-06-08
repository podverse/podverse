/**
 * Deterministic embed demo fixture ids (localhost asset server on port 2111).
 * Mirror of tools/web/embed-fixture-constants.mjs — update both in one commit.
 */

import type { EmbedRouteKind } from './embedTypes';

export const E2E_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/e2e/images';
export const E2E_FIXTURE_CHANNEL_IMAGE_URL = `${E2E_FIXTURE_IMAGE_BASE_URL}/e2e-embed-channel-art-1400.png`;
export const E2E_FIXTURE_ITEM_IMAGE_URL = `${E2E_FIXTURE_IMAGE_BASE_URL}/e2e-embed-item-art-1400.png`;

export const EMBED_FIXTURE_ASSET_BASE_URL = 'http://localhost:2111/embed/audio';
export const EMBED_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/embed/images';

export const EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-placeholder.png`;

export const EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-episode-audio-60s-440hz.mp3`;
export const EMBED_SAMPLE_TRACK_AUDIO_AUDIO_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-track-audio-30s-330hz.mp3`;
export const EMBED_SAMPLE_TRACK_TWO_AUDIO_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-track-two-30s-294hz.mp3`;
export const EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-podcast-item-60s-440hz.mp3`;
export const EMBED_SAMPLE_SCROLL_ITEM_AUDIO_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-scroll-item-60s-440hz.mp3`;

export const EMBED_SAMPLE_PODCAST_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-podcast-channel-art.png`;
export const EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-episode-audio-art.png`;
export const EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-episode-video-art.png`;
export const EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-album-channel-art.png`;
export const EMBED_SAMPLE_TRACK_AUDIO_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-track-audio-art.png`;
export const EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-track-video-art.png`;
export const EMBED_SAMPLE_CLIP_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-clip-art.png`;
export const EMBED_SAMPLE_CHAPTER_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-chapter-art.png`;
export const EMBED_SAMPLE_SOUNDBITE_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-soundbite-art.png`;
export const EMBED_SAMPLE_PLAYLIST_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-playlist-art.png`;
export const EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-scroll-channel-art.png`;
export const EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-private-channel-art.png`;
export const EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL = EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL;

export const EMBED_SAMPLE_EPISODE_AUDIO_TITLE = 'Embed Sample Episode (audio)';
export const EMBED_SAMPLE_EPISODE_NEAR_END_TITLE = 'Embed Sample Episode (near end)';
export const EMBED_SAMPLE_EPISODE_VIDEO_TITLE = 'Embed Sample Episode (video)';
export const EMBED_SAMPLE_TRACK_AUDIO_TITLE = 'Embed Sample Track (audio)';
export const EMBED_SAMPLE_TRACK_TWO_TITLE = 'Embed Sample Track Two (audio)';
export const EMBED_SAMPLE_TRACK_VIDEO_TITLE = 'Embed Sample Track (video)';
export const EMBED_SAMPLE_PODCAST_CHANNEL_TITLE = 'Embed Sample Podcast (audio)';
export const EMBED_SAMPLE_ALBUM_CHANNEL_TITLE = 'Embed Sample Album (audio)';
export const EMBED_SAMPLE_VIDEO_CHANNEL_TITLE = 'Embed Sample Podcast (video)';
export const EMBED_SAMPLE_CHAPTER_PARENT_TITLE = 'Embed Sample Episode (chapters)';
export const EMBED_SAMPLE_CLIP_TITLE = 'Embed Sample Clip (audio)';
export const EMBED_SAMPLE_SOUNDBITE_TITLE = 'Embed Sample Official Clip (audio)';
export const EMBED_SAMPLE_CHAPTER_TITLE = 'Intro';
export const EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE = 'Embed Sample Playlist (audio)';
export const EMBED_SAMPLE_PLAYLIST_MIXED_TITLE = 'Embed Sample Playlist (mixed)';
export const EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE = 'Embed Sample Playlist (private)';
export const EMBED_SAMPLE_SCROLL_CHANNEL_TITLE = 'Embed Sample Podcast (scroll)';
export const EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX = 'Embed Sample Scroll Item';
export const EMBED_SAMPLE_PRIVATE_CHANNEL_TITLE = 'Embed Sample Podcast (private)';

export const EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT = 'embSmpPodAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT = 'embSmpEpAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT = 'embSmpEpAud2';
export const EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT = 'e2eEmbVidItem01';

export const EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT = 'embSmpAlbAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT = 'embSmpTrkAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT = 'embSmpTrkAud2';
export const EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT = 'e2eEmbVidTrk01';

export const EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT = 'embSmpClip001';
export const EMBED_FIXTURE_SOUNDBITE_ID_TEXT = 'embSmpSbite01';
export const EMBED_FIXTURE_CHAPTER_ID_TEXT = 'embSmpChap001';
export const EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT = 'embSmpChpItm1';

export const EMBED_FIXTURE_PODCAST_LIST_AUDIO_ID_TEXT = EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT;
export const EMBED_FIXTURE_PODCAST_LIST_VIDEO_ID_TEXT = 'e2eEmbedVidCh01';

export const EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT = EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT;

export const EMBED_FIXTURE_PLAYLIST_ID_TEXT = 'e2eEmbPlList01';
export const EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT = 'e2eEmbPlMix01';

export const EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT = 'e2eEmbedVidCh01';
export const EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT = 'e2eEmbVidItem02';

export type EmbedFixtureDemoSpec = {
  showcaseId: string;
  label: string;
  routeKind: EmbedRouteKind;
  resourceIdText: string;
  note: string | null;
};

/** Hardcoded `/embed` demo slots when fixture mode is enabled (local dev + E2E). */
export const EMBED_FIXTURE_DEMO_SPECS: EmbedFixtureDemoSpec[] = [
  {
    showcaseId: 'episode-audio',
    label: 'Embed Sample Episode (audio)',
    routeKind: 'episode',
    resourceIdText: EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
    note: EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
  },
  {
    showcaseId: 'episode-video',
    label: 'Embed Sample Episode (video)',
    routeKind: 'episode',
    resourceIdText: EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT,
    note: EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
  },
  {
    showcaseId: 'track-audio',
    label: 'Embed Sample Track (audio)',
    routeKind: 'track',
    resourceIdText: EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
    note: EMBED_SAMPLE_TRACK_AUDIO_TITLE,
  },
  {
    showcaseId: 'track-video',
    label: 'Embed Sample Track (video)',
    routeKind: 'track',
    resourceIdText: EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
    note: EMBED_SAMPLE_TRACK_VIDEO_TITLE,
  },
  {
    showcaseId: 'clip-audio',
    label: 'Embed Sample Clip (audio)',
    routeKind: 'clip',
    resourceIdText: EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
    note: EMBED_SAMPLE_CLIP_TITLE,
  },
  {
    showcaseId: 'official-clip-audio',
    label: 'Embed Sample Official Clip (audio)',
    routeKind: 'official-clip',
    resourceIdText: EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
    note: EMBED_SAMPLE_SOUNDBITE_TITLE,
  },
  {
    showcaseId: 'chapter-audio',
    label: 'Embed Sample Chapter (audio)',
    routeKind: 'chapter',
    resourceIdText: EMBED_FIXTURE_CHAPTER_ID_TEXT,
    note: EMBED_SAMPLE_CHAPTER_TITLE,
  },
  {
    showcaseId: 'podcast-audio',
    label: 'Embed Sample Podcast (audio)',
    routeKind: 'podcast',
    resourceIdText: EMBED_FIXTURE_PODCAST_LIST_AUDIO_ID_TEXT,
    note: EMBED_SAMPLE_PODCAST_CHANNEL_TITLE,
  },
  {
    showcaseId: 'podcast-video',
    label: 'Embed Sample Podcast (video)',
    routeKind: 'podcast',
    resourceIdText: EMBED_FIXTURE_PODCAST_LIST_VIDEO_ID_TEXT,
    note: EMBED_SAMPLE_VIDEO_CHANNEL_TITLE,
  },
  {
    showcaseId: 'album-audio',
    label: 'Embed Sample Album (audio)',
    routeKind: 'album',
    resourceIdText: EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT,
    note: EMBED_SAMPLE_ALBUM_CHANNEL_TITLE,
  },
  {
    showcaseId: 'playlist-mixed',
    label: 'Embed Sample Playlist (mixed)',
    routeKind: 'playlist',
    resourceIdText: EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
    note: EMBED_SAMPLE_PLAYLIST_MIXED_TITLE,
  },
];

export function buildEmbedFixtureDemoHref(
  routeKind: EmbedRouteKind,
  resourceIdText: string
): string {
  switch (routeKind) {
    case 'episode':
      return `/embed/episode/${resourceIdText}`;
    case 'track':
      return `/embed/track/${resourceIdText}`;
    case 'clip':
      return `/embed/clip/${resourceIdText}`;
    case 'chapter':
      return `/embed/chapter/${resourceIdText}`;
    case 'official-clip':
      return `/embed/official-clip/${resourceIdText}`;
    case 'podcast':
      return `/embed/podcast/${resourceIdText}`;
    case 'album':
      return `/embed/album/${resourceIdText}`;
    case 'playlist':
      return `/embed/playlist/${resourceIdText}`;
    default:
      return `/embed`;
  }
}

export function shouldUseEmbedDemoFixtures(): boolean {
  if (process.env.EMBED_DEMO_USE_FIXTURES === 'true') {
    return true;
  }

  if (process.env.EMBED_DEMO_USE_FIXTURES === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'development';
}
