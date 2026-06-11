/**
 * Canonical deterministic embed E2E fixture ids and port-2111 asset URLs.
 * Mirror in apps/web/e2e/helpers/seedConstants.ts — update both in one commit.
 */

export const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
export const E2E_IMAGE_ASSET_BASE_URL = 'http://localhost:2111/e2e/images';

export const E2E_FIXTURE_CHANNEL_IMAGE_URL = `${E2E_IMAGE_ASSET_BASE_URL}/e2e-embed-channel-art-1400.png`;
export const E2E_FIXTURE_ITEM_IMAGE_URL = `${E2E_IMAGE_ASSET_BASE_URL}/e2e-embed-item-art-1400.png`;
export const E2E_FIXTURE_PLACEHOLDER_IMAGE_URL = `${E2E_IMAGE_ASSET_BASE_URL}/e2e-embed-placeholder.png`;

export const EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
export const EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const EMBED_SAMPLE_TRACK_AUDIO_AUDIO_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
export const EMBED_SAMPLE_TRACK_TWO_AUDIO_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
export const EMBED_SAMPLE_SCROLL_ITEM_AUDIO_URL = EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL;

export const EMBED_SAMPLE_ALT_AUDIO_OGG_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const EMBED_SAMPLE_ALT_VIDEO_MP4_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
export const EMBED_SAMPLE_ALT_VIDEO_WEBM_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
export const EMBED_FIXTURE_VIDEO_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;

export const EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL = E2E_FIXTURE_PLACEHOLDER_IMAGE_URL;
export const EMBED_SAMPLE_PODCAST_CHANNEL_IMAGE_URL = E2E_FIXTURE_CHANNEL_IMAGE_URL;
export const EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL = E2E_FIXTURE_CHANNEL_IMAGE_URL;
export const EMBED_SAMPLE_TRACK_AUDIO_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_CLIP_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_CHAPTER_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_CHAPTER_INTRO_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_CHAPTER_TOPIC_A_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_CHAPTER_OUTRO_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_SOUNDBITE_ITEM_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_PLAYLIST_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;
export const EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL = E2E_FIXTURE_CHANNEL_IMAGE_URL;
export const EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL = E2E_FIXTURE_CHANNEL_IMAGE_URL;
export const EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL = E2E_FIXTURE_ITEM_IMAGE_URL;

/** Display titles for embed demo samples (stored in seeded DB rows). */
export const EMBED_SAMPLE_EPISODE_AUDIO_TITLE = 'Heavenly Bodies';
export const EMBED_SAMPLE_EPISODE_NEAR_END_TITLE = 'Constellations';
export const EMBED_SAMPLE_EPISODE_VIDEO_TITLE = 'Episode (video)';
export const EMBED_SAMPLE_TRACK_AUDIO_TITLE = 'Magic Flute Overture';
export const EMBED_SAMPLE_TRACK_TWO_TITLE = 'Egmont Overture';
export const EMBED_SAMPLE_TRACK_VIDEO_TITLE = 'Track (video)';
export const EMBED_SAMPLE_PODCAST_CHANNEL_TITLE = 'Cosmos Classroom';
export const EMBED_SAMPLE_ALBUM_CHANNEL_TITLE = 'Orbital Classics';
export const EMBED_SAMPLE_ALBUM_VIDEO_CHANNEL_TITLE = 'Embed Sample Album (video)';
export const EMBED_SAMPLE_VIDEO_CHANNEL_TITLE = 'Embed Sample Podcast (video)';
export const EMBED_SAMPLE_CHAPTER_PARENT_TITLE = 'The Solar System';
export const EMBED_SAMPLE_CLIP_TITLE = 'Through the Telescope';
export const EMBED_SAMPLE_SOUNDBITE_TITLE = 'Night Sky Notes';
export const EMBED_SAMPLE_CHAPTER_TITLE = 'Introduction';
export const EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE = 'Planets and Moons';
export const EMBED_SAMPLE_CHAPTER_OUTRO_TITLE = 'Conclusion';

export const EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE = 'Playlist (audio)';
export const EMBED_SAMPLE_PLAYLIST_MIXED_TITLE = 'Playlist (mixed)';
export const EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE = 'Playlist (private)';
export const EMBED_SAMPLE_SCROLL_CHANNEL_TITLE = 'Embed Sample Podcast (scroll)';
export const EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX = 'Scroll Item';
export const EMBED_SAMPLE_PRIVATE_CHANNEL_TITLE = 'Embed Sample Podcast (private)';

export const EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS = 0;
export const EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS = 203;
export const EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS = 203;
export const EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS = 405;
export const EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS = 405;
export const EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS = 608;
export const EMBED_SAMPLE_EPISODE_DURATION_SECONDS = 608;

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
export const EMBED_FIXTURE_ALBUM_LIST_VIDEO_ID_TEXT = 'e2eEmbAlbVid01';
export const EMBED_FIXTURE_ALBUM_VIDEO_TRACK_ID_TEXT = 'e2eEmbAlbTrk01';

export const EMBED_FIXTURE_PLAYLIST_ID_TEXT = 'e2eEmbPlList01';
export const EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT = 'e2eEmbPlMix01';

export const EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT = 'e2eEmbedVidCh01';
export const EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT = 'e2eEmbVidItem02';

export const EMBED_FIXTURE_VIDEO_FEED_PI_ID = 876543213;
export const EMBED_FIXTURE_VIDEO_FEED_URL = 'https://e2e-seed-video.example/video.xml';

export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID = 876543216;
export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL = 'https://e2e-seed-video-music.example/album.xml';

export const EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT = 'e2eEmbScrCh01';
export const EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT = 'e2eEmbPrvCh01';
export const EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT = 'e2eEmbPlPriv01';

/** @deprecated Use EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT — kept for media-player queue seed sync */
export const EMBED_FIXTURE_MUSIC_CHANNEL_ID_TEXT = EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT;

/** Showcase slot ids on `/embed` — sync with packages/helpers embedDemoShowcase constants. */
export const EMBED_DEMO_SHOWCASE_IDS = [
  'episode-audio',
  'episode-video',
  'track-audio',
  'track-video',
  'clip-audio',
  'official-clip-audio',
  'chapter-audio',
  'podcast-audio',
  'podcast-video',
  'album-audio',
  'album-video',
  'playlist-mixed',
];

/** Resource id_text mapped to each showcase slot for E2E `/embed` demo index. */
export const EMBED_DEMO_SHOWCASE_RESOURCE_IDS = {
  'episode-audio': EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  'episode-video': EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT,
  'track-audio': EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  'track-video': EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
  'clip-audio': EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  'official-clip-audio': EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  'chapter-audio': EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT,
  'podcast-audio': EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
  'podcast-video': EMBED_FIXTURE_PODCAST_LIST_VIDEO_ID_TEXT,
  'album-audio': EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT,
  'album-video': EMBED_FIXTURE_ALBUM_LIST_VIDEO_ID_TEXT,
  'playlist-mixed': EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
};
