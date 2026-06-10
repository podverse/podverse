/**
 * Canonical deterministic embed fixture ids and web-hosted demo asset URLs.
 * Mirror in apps/web/src/lib/embed/embedFixtureIds.ts and
 * apps/web/e2e/helpers/seedConstants.ts — update all three in one commit.
 */

import {
  EMBED_DEMO_PUBLIC_AUDIO_PATH,
  EMBED_DEMO_PUBLIC_IMAGES_PATH,
  EMBED_DEMO_PUBLIC_VIDEOS_PATH,
  resolveEmbedDemoAudioBaseUrl,
  resolveEmbedDemoImagesBaseUrl,
  resolveEmbedDemoVideosBaseUrl,
} from './embed-demo-public-paths.mjs';

/** Media-player E2E artwork (not used by embed demo samples). */
export const E2E_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/e2e/images';
export const E2E_FIXTURE_CHANNEL_IMAGE_URL = `${E2E_FIXTURE_IMAGE_BASE_URL}/e2e-embed-channel-art-1400.png`;
export const E2E_FIXTURE_ITEM_IMAGE_URL = `${E2E_FIXTURE_IMAGE_BASE_URL}/e2e-embed-item-art-1400.png`;

/** Embed demo sample assets — served from apps/web/public/embed-demo/ by the web app. */
export {
  EMBED_DEMO_PUBLIC_AUDIO_PATH,
  EMBED_DEMO_PUBLIC_IMAGES_PATH,
  EMBED_DEMO_PUBLIC_VIDEOS_PATH,
};

export const EMBED_FIXTURE_ASSET_BASE_URL = resolveEmbedDemoAudioBaseUrl();
export const EMBED_FIXTURE_VIDEO_ASSET_BASE_URL = resolveEmbedDemoVideosBaseUrl();
export const EMBED_FIXTURE_IMAGE_BASE_URL = resolveEmbedDemoImagesBaseUrl();

export const EMBED_SAMPLE_ALT_AUDIO_OGG_URL = `${EMBED_FIXTURE_ASSET_BASE_URL}/embed-sample-alternate-audio.ogg`;
export const EMBED_SAMPLE_ALT_VIDEO_MP4_URL = `${EMBED_FIXTURE_VIDEO_ASSET_BASE_URL}/embed-sample-alternate-video.mp4`;
export const EMBED_SAMPLE_ALT_VIDEO_WEBM_URL = `${EMBED_FIXTURE_VIDEO_ASSET_BASE_URL}/embed-sample-alternate-video.webm`;

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
export const EMBED_SAMPLE_CHAPTER_INTRO_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-chapter-intro-art.png`;
export const EMBED_SAMPLE_CHAPTER_TOPIC_A_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-chapter-topic-a-art.png`;
export const EMBED_SAMPLE_CHAPTER_OUTRO_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-chapter-outro-art.png`;
export const EMBED_SAMPLE_SOUNDBITE_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-soundbite-art.png`;
export const EMBED_SAMPLE_PLAYLIST_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-playlist-art.png`;
export const EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-scroll-channel-art.png`;
export const EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-private-channel-art.png`;
export const EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL = EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL;

/** Display titles for embed demo samples (also stored in seeded DB rows). */
export const EMBED_SAMPLE_EPISODE_AUDIO_TITLE = 'Episode (audio)';
export const EMBED_SAMPLE_EPISODE_NEAR_END_TITLE = 'Episode (near end)';
export const EMBED_SAMPLE_EPISODE_VIDEO_TITLE = 'Episode (video)';
export const EMBED_SAMPLE_TRACK_AUDIO_TITLE = 'Track (audio)';
export const EMBED_SAMPLE_TRACK_TWO_TITLE = 'Track Two (audio)';
export const EMBED_SAMPLE_TRACK_VIDEO_TITLE = 'Track (video)';
export const EMBED_SAMPLE_PODCAST_CHANNEL_TITLE = 'Embed Sample Podcast (audio)';
export const EMBED_SAMPLE_ALBUM_CHANNEL_TITLE = 'Embed Sample Album (audio)';
export const EMBED_SAMPLE_VIDEO_CHANNEL_TITLE = 'Embed Sample Podcast (video)';
export const EMBED_SAMPLE_CHAPTER_PARENT_TITLE = 'Episode (chapters)';
export const EMBED_SAMPLE_CLIP_TITLE = 'Clip (audio)';
export const EMBED_SAMPLE_SOUNDBITE_TITLE = 'Official Clip (audio)';
export const EMBED_SAMPLE_CHAPTER_TITLE = 'Intro';
export const EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE = 'Topic A';
export const EMBED_SAMPLE_CHAPTER_OUTRO_TITLE = 'Outro';

export const EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS = 0;
export const EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS = 20;
export const EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS = 20;
export const EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS = 40;
export const EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS = 40;
export const EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS = 60;
export const EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE = 'Playlist (audio)';
export const EMBED_SAMPLE_PLAYLIST_MIXED_TITLE = 'Playlist (mixed)';
export const EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE = 'Playlist (private)';
export const EMBED_SAMPLE_SCROLL_CHANNEL_TITLE = 'Embed Sample Podcast (scroll)';
export const EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX = 'Scroll Item';
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
export const EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT = 'embSmpChap002';
export const EMBED_FIXTURE_CHAPTER_THREE_ID_TEXT = 'embSmpChap003';
export const EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT = 'embSmpChpItm1';

export const EMBED_FIXTURE_PODCAST_LIST_AUDIO_ID_TEXT = EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT;
export const EMBED_FIXTURE_PODCAST_LIST_VIDEO_ID_TEXT = 'e2eEmbedVidCh01';

export const EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT = EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT;

export const EMBED_FIXTURE_PLAYLIST_ID_TEXT = 'e2eEmbPlList01';
export const EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT = 'e2eEmbPlMix01';

export const EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT = 'e2eEmbedVidCh01';
export const EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT = 'e2eEmbVidItem02';

export const EMBED_FIXTURE_VIDEO_FEED_PI_ID = 876543213;
export const EMBED_FIXTURE_VIDEO_FEED_URL = 'https://e2e-seed-video.example/video.xml';
export const EMBED_FIXTURE_VIDEO_ENCLOSURE_URL =
  'https://e2e-seed-video.example/e2e-embed-video.mp4';

export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID = 876543216;
export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL = 'https://e2e-seed-video-music.example/album.xml';

export const EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT = 'e2eEmbScrCh01';
export const EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT = 'e2eEmbPrvCh01';
export const EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT = 'e2eEmbPlPriv01';

/** @deprecated Use EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT — kept for media-player queue seed sync */
export const EMBED_FIXTURE_MUSIC_CHANNEL_ID_TEXT = EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT;
