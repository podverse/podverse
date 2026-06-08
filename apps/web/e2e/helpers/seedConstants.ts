/**
 * Deterministic ids, playback seconds, and asset-server enclosure URLs for
 * media-player E2E seeds. Must stay in sync with `tools/web/seed-e2e.mjs`.
 *
 * Asset fixtures live in `tools/test-assets/assets/e2e/audio/` (regenerate via
 * `npm run generate:e2e-media -w podverse-test-assets`). The asset server
 * auto-starts on port 2111 via `apps/web/playwright.e2e-webservers.ts`.
 *
 * Anonymous snapshot helper lands later in
 * `apps/web/e2e/helpers/anonymousSnapshot.ts` (step 5 of
 * `.llm/plans/active/media-player-e2e-seed-expansion/`).
 */

export const E2E_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';

/** Sync with tools/web/seed-e2e.mjs (SEO profile specs). */
export const E2E_SEO_PUBLIC_PROFILE_ID_TEXT = 'e2eSeoPublic01';
export const E2E_SEO_PRIVATE_PROFILE_PLACEHOLDER_ID_TEXT = 'e2e-seo-private-profile-placeholder';

export const E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT = 'e2ePodResume01';
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT = 'e2ePodResume02';
export const E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT = 'e2ePodResume03';
export const E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT = 'e2ePodChap0001';

export const E2E_ITEM_CHAPTER_INTRO_ID_TEXT = 'e2eChapIntro01';
export const E2E_ITEM_CHAPTER_TOPIC_ID_TEXT = 'e2eChapTopic01';

export const E2E_CLIP_ID_TEXT = 'e2eClip00000001';
export const E2E_SOUNDBITE_ID_TEXT = 'e2eSoundbite001';

export const E2E_MUSIC_CHANNEL_ID_TEXT = 'e2eMusicChnl01';
export const E2E_MUSIC_ALBUM_ID_TEXT = 'e2eMusicAlbm01';
export const E2E_MUSIC_TRACK_ONE_ID_TEXT = 'e2eMusicTrk001';
export const E2E_MUSIC_TRACK_TWO_ID_TEXT = 'e2eMusicTrk002';
export const E2E_MUSIC_QUEUE_ID_TEXT = 'e2eMusicQueue01';
export const E2E_PODCAST_QUEUE_ID_TEXT = 'e2ePodQueue01';

export const E2E_ADD_BY_RSS_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast.xml';
export const E2E_ADD_BY_RSS_CHANNEL_ID_TEXT = 'e2eAbRsChnl0001';
export const E2E_ADD_BY_RSS_CHANNEL_TITLE = 'E2E Add-by-RSS Channel';
export const E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL = 'https://e2e-seed-addbyrss.example/channel-art.png';
export const E2E_ADD_BY_RSS_ITEM_IMAGE_URL = 'https://e2e-seed-addbyrss.example/item-art.png';
export const E2E_ADD_BY_RSS_PUB_DATE_ISO = '2025-01-01T00:00:00.000Z';
export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT = 'e2eAbRsResW01';
export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID =
  'https://e2e-seed-addbyrss.example/item-guid/with-position';
export const E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT = 'e2eAbRsResF01';
export const E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID =
  'https://e2e-seed-addbyrss.example/item-guid/fresh';

/**
 * Anonymous snapshot ids reuse stable item ids but the snapshot itself is
 * written via `page.addInitScript` — see
 * `apps/web/e2e/helpers/anonymousSnapshot.ts` (added in step 5).
 */
export const E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT = E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT;
export const E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT = E2E_MUSIC_TRACK_ONE_ID_TEXT;

/**
 * Deterministic playback positions in seconds, kept here so the specs and the
 * seed agree on the same numeric assertions. Durations match the committed
 * fixtures in `tools/test-assets/assets/e2e/audio/` (see step 1b).
 */
export const E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5;
export const E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60;
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS = 57;

export const E2E_CLIP_START_SECONDS = 5;
export const E2E_CLIP_END_SECONDS = 12;
export const E2E_SOUNDBITE_START_SECONDS = 14;
export const E2E_SOUNDBITE_DURATION_SECONDS = 6;

export const E2E_CHAPTER_ONE_START_SECONDS = 1;
export const E2E_CHAPTER_ONE_END_SECONDS = 5;
export const E2E_CHAPTER_TWO_START_SECONDS = 6;
export const E2E_CHAPTER_TWO_END_SECONDS = 10;

export const E2E_MUSIC_TRACK_ONE_P_SECONDS = 7;
export const E2E_MUSIC_TRACK_DURATION_SECONDS = 30;
/** Within 5s of `E2E_MUSIC_TRACK_DURATION_SECONDS`; restore clamps to 0. */
export const E2E_MUSIC_TRACK_NEAR_END_P_SECONDS = 27;

export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 25;
export const E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS = 60;

/**
 * Asset-server enclosure URLs for the seeded items. The asset server is
 * auto-started by the Playwright webServer config (port 2111). See step 1b
 * (`01b-test-audio-fixtures-and-asset-server.md`) for fixture generation
 * and the gitignore exception that pins them.
 */
export const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
export const E2E_IMAGE_ASSET_BASE_URL = 'http://localhost:2111/e2e/images';

/**
 * Embed demo sample assets — sync with tools/web/embed-fixture-constants.mjs and
 * apps/web/src/lib/embed/embedFixtureIds.ts (distinct from media-player E2E fixtures).
 */
export const EMBED_FIXTURE_ASSET_BASE_URL = 'http://localhost:2111/embed/audio';
export const EMBED_FIXTURE_IMAGE_BASE_URL = 'http://localhost:2111/embed/images';
export const EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL = `${EMBED_FIXTURE_IMAGE_BASE_URL}/embed-sample-placeholder.png`;

export const EMBED_SAMPLE_EPISODE_AUDIO_TITLE = 'Embed Sample Episode (audio)';
export const EMBED_SAMPLE_EPISODE_NEAR_END_TITLE = 'Embed Sample Episode (near end)';
export const EMBED_SAMPLE_EPISODE_VIDEO_TITLE = 'Embed Sample Episode (video)';
export const EMBED_SAMPLE_TRACK_AUDIO_TITLE = 'Embed Sample Track (audio)';
export const EMBED_SAMPLE_TRACK_TWO_TITLE = 'Embed Sample Track Two (audio)';
export const EMBED_SAMPLE_TRACK_VIDEO_TITLE = 'Embed Sample Track (video)';
export const EMBED_SAMPLE_PODCAST_CHANNEL_TITLE = 'Embed Sample Podcast (audio)';
export const EMBED_SAMPLE_ALBUM_CHANNEL_TITLE = 'Embed Sample Album (audio)';
export const EMBED_SAMPLE_VIDEO_CHANNEL_TITLE = 'Embed Sample Podcast (video)';
export const EMBED_SAMPLE_CLIP_TITLE = 'Embed Sample Clip (audio)';
export const EMBED_SAMPLE_SOUNDBITE_TITLE = 'Embed Sample Official Clip (audio)';
export const EMBED_SAMPLE_CHAPTER_TITLE = 'Intro';
export const EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX = 'Embed Sample Scroll Item';

export const EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT = 'embSmpPodAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT = 'embSmpEpAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT = 'embSmpEpAud2';
export const EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT = 'embSmpAlbAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT = 'embSmpTrkAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT = 'embSmpTrkAud2';
export const EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT = 'embSmpClip001';
export const EMBED_FIXTURE_SOUNDBITE_ID_TEXT = 'embSmpSbite01';
export const EMBED_FIXTURE_CHAPTER_ID_TEXT = 'embSmpChap001';

export const E2E_PODCAST_SHORT_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
export const E2E_PODCAST_RESUME_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
export const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
export const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
export const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;

/** Embed player E2E fixtures — sync with `tools/web/seed-e2e.mjs`. */
export const E2E_EMBED_VIDEO_CHANNEL_ID_TEXT = 'e2eEmbedVidCh01';
export const E2E_EMBED_VIDEO_ITEM_ID_TEXT = 'e2eEmbVidItem01';
export const E2E_EMBED_VIDEO_ITEM_TWO_ID_TEXT = 'e2eEmbVidItem02';

export const E2E_EMBED_PLAYLIST_ID_TEXT = 'e2eEmbPlList01';
export const E2E_EMBED_PLAYLIST_MIXED_ID_TEXT = 'e2eEmbPlMix01';
export const E2E_EMBED_PRIVATE_PLAYLIST_ID_TEXT = 'e2eEmbPlPriv01';
export const E2E_EMBED_MUSIC_TRACK_VIDEO_ID_TEXT = 'e2eEmbVidTrk01';

export const E2E_EMBED_INVALID_PLAY_ID_TEXT = 'invalid-id-text';

/** Default list row for `/embed/podcast/...` with sort=recent (newest pub_date). */
export const E2E_EMBED_PODCAST_LIST_DEFAULT_ITEM_ID_TEXT =
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT;

/** Default list row for `/embed/album/...` with sort=forward. */
export const E2E_EMBED_ALBUM_LIST_DEFAULT_ITEM_ID_TEXT = EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT;

/** First playlist resource in `E2E_EMBED_PLAYLIST_ID_TEXT`. */
export const E2E_EMBED_PLAYLIST_DEFAULT_ITEM_ID_TEXT = EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT;

/** Podcast channel with many rows for list scroll E2E (`e2eEmbScrIt01`–`e2eEmbScrIt10`). */
export const E2E_EMBED_SCROLL_CHANNEL_ID_TEXT = 'e2eEmbScrCh01';

/** Default list row for scroll channel (sort=recent, newest pub_date). */
export const E2E_EMBED_SCROLL_DEFAULT_ITEM_ID_TEXT = 'e2eEmbScrIt01';

/** Oldest scroll-channel row label for scroll-into-view assertions. */
export const E2E_EMBED_SCROLL_LAST_ITEM_LABEL = `${EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX} 10`;

/** Podcast channel with feed_policy.public_visible=false. */
export const E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT = 'e2eEmbPrvCh01';

/** Showcase slot ids on `/embed` when fixture mode is enabled. Sync with embedFixtureIds.ts. */
export const E2E_EMBED_DEMO_SHOWCASE_IDS = [
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
  'playlist-mixed',
] as const;
