/**
 * Deterministic embed demo fixture ids (localhost asset server on port 2111).
 * Mirror of tools/web/embed-fixture-constants.mjs — update both in one commit.
 */

import type { EmbedRouteKind } from './embedTypes';

export const EMBED_FIXTURE_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
export const EMBED_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/e2e/images';

export const EMBED_FIXTURE_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/e2e-embed-channel-art-1400.png`;

export const EMBED_FIXTURE_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/e2e-embed-item-art-1400.png`;

export const EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/e2e-embed-placeholder.png`;

export const EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';
export const EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT = 'e2ePodResume01';
export const EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT = 'e2eEmbVidItem01';

export const EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT = 'e2eMusicAlbm01';
export const EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT = 'e2eMusicTrk001';
export const EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT = 'e2eEmbVidTrk01';

export const EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT = 'e2eClip00000001';
export const EMBED_FIXTURE_SOUNDBITE_ID_TEXT = 'e2eSoundbite001';
export const EMBED_FIXTURE_CHAPTER_ID_TEXT = 'e2eChapIntro01';

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
    label: 'Episode (audio)',
    routeKind: 'episode',
    resourceIdText: EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
    note: 'E2E Podcast Resume P > 0',
  },
  {
    showcaseId: 'episode-video',
    label: 'Episode (video)',
    routeKind: 'episode',
    resourceIdText: EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT,
    note: 'E2E Embed Video Item One',
  },
  {
    showcaseId: 'track-audio',
    label: 'Track (audio)',
    routeKind: 'track',
    resourceIdText: EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
    note: 'E2E Music Track One',
  },
  {
    showcaseId: 'track-video',
    label: 'Track (video)',
    routeKind: 'track',
    resourceIdText: EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
    note: 'E2E Embed Video Track',
  },
  {
    showcaseId: 'clip-audio',
    label: 'Clip (audio)',
    routeKind: 'clip',
    resourceIdText: EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
    note: 'E2E Clip End Pause',
  },
  {
    showcaseId: 'official-clip-audio',
    label: 'Official clip (audio)',
    routeKind: 'official-clip',
    resourceIdText: EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
    note: 'E2E Soundbite End Pause',
  },
  {
    showcaseId: 'chapter-audio',
    label: 'Chapter (audio)',
    routeKind: 'chapter',
    resourceIdText: EMBED_FIXTURE_CHAPTER_ID_TEXT,
    note: 'Intro',
  },
  {
    showcaseId: 'podcast-audio',
    label: 'Podcast list (audio)',
    routeKind: 'podcast',
    resourceIdText: EMBED_FIXTURE_PODCAST_LIST_AUDIO_ID_TEXT,
    note: 'E2E Podcast Seed Channel',
  },
  {
    showcaseId: 'podcast-video',
    label: 'Podcast list (video)',
    routeKind: 'podcast',
    resourceIdText: EMBED_FIXTURE_PODCAST_LIST_VIDEO_ID_TEXT,
    note: 'E2E Embed Video Channel',
  },
  {
    showcaseId: 'album-audio',
    label: 'Album list (audio)',
    routeKind: 'album',
    resourceIdText: EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT,
    note: 'E2E Music Album',
  },
  {
    showcaseId: 'playlist-mixed',
    label: 'Playlist (mixed)',
    routeKind: 'playlist',
    resourceIdText: EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
    note: 'Audio + video resources',
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
