/**
 * Canonical deterministic embed fixture ids and localhost asset URLs.
 * Mirror in apps/web/src/lib/embed/embedFixtureIds.ts and
 * apps/web/e2e/helpers/seedConstants.ts — update all three in one commit.
 */

export const EMBED_FIXTURE_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
export const EMBED_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/e2e/images';

/** Channel artwork seeded for embed E2E fixtures (1400×1400 PNG on test-assets). */
export const EMBED_FIXTURE_CHANNEL_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/e2e-embed-channel-art-1400.png`;

/** Item artwork seeded for embed E2E fixtures (1400×1400 PNG on test-assets). */
export const EMBED_FIXTURE_ITEM_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/e2e-embed-item-art-1400.png`;

/** Small placeholder PNG on test-assets; mirrors apps/web/public/images/placeholder-image.png. */
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

export const EMBED_FIXTURE_VIDEO_FEED_PI_ID = 876543213;
export const EMBED_FIXTURE_VIDEO_FEED_URL = 'https://e2e-seed-video.example/video.xml';
export const EMBED_FIXTURE_VIDEO_ENCLOSURE_URL = 'https://e2e-seed-video.example/e2e-embed-video.mp4';

export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID = 876543216;
export const EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL = 'https://e2e-seed-video-music.example/album.xml';

export const EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT = 'e2eEmbScrCh01';
export const EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT = 'e2eEmbPrvCh01';
export const EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT = 'e2eEmbPlPriv01';

/** @deprecated Use EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT — kept for media-player queue seed sync */
export const EMBED_FIXTURE_MUSIC_CHANNEL_ID_TEXT = EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT;
