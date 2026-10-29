/**
 * Deterministic ids, playback seconds, and asset-server enclosure URLs for
 * media-player E2E seeds. Must stay in sync with `tools/web/seed-e2e.mjs`.
 *
 * Asset fixtures live in `tools/test-assets/assets/e2e/audio/` (regenerate via
 * `npm run generate:e2e-media -w podverse-test-assets`). The asset server
 * auto-starts on port 2111 via `apps/web/playwright.e2e-webservers.ts`.
 *
 * Anonymous snapshot data is initialized by
 * `apps/web/e2e/helpers/anonymousSnapshot.ts`.
 */

import { getAddByRSSHashId } from '@podverse/helpers';

export const E2E_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';
export const E2E_PODCAST_CHANNEL_TITLE = 'E2E Podcast Seed Channel';

/** Applied absorb pair for the merged-channel redirect spec. */
export const E2E_MERGED_OLD_CHANNEL_ID_TEXT = 'e2eMrgOldCh01';
export const E2E_MERGED_SURVIVOR_CHANNEL_ID_TEXT = 'e2eMrgSurCh01';
export const E2E_MERGED_UNMATCHED_ITEM_ID_TEXT = 'e2eMrgUnmIt01';

export const E2E_LIVESTREAM_CHANNEL_ID_TEXT = 'v5fCrIj9Io';
export const E2E_LIVESTREAM_CHANNEL_TITLE = 'E2E Livestream Channel';
export const E2E_LIVESTREAM_ITEM_ID_TEXT = 'e2eLiveStrm01';
export const E2E_LIVESTREAM_ITEM_TITLE = 'E2E Livestream Item';

/** Sync with tools/web/seed-e2e.mjs (SEO profile specs). */
export const E2E_SEO_PUBLIC_PROFILE_ID_TEXT = 'e2eSeoPublic01';
export const E2E_SEO_PRIVATE_PROFILE_PLACEHOLDER_ID_TEXT = 'e2e-seo-private-profile-placeholder';

export const E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT = 'e2ePodResume01';
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT = 'e2ePodResume02';
export const E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT = 'e2ePodResume03';
export const E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT = 'e2ePodChap0001';
/** Stored notes are marked shortened; `item_about.website_link_url` is the full-notes link. */
export const E2E_PODCAST_ITEM_LONG_NOTES_ID_TEXT = 'e2ePodLongNt01';
export const E2E_PODCAST_ITEM_LONG_NOTES_LINK_URL = 'https://example.com/e2e-long-show-notes';

export const E2E_PODCAST_ITEM_MARQUEE_TITLE_ID_TEXT = 'e2ePodMarqTi01';
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ID_TEXT = 'e2ePodMarqCh01';
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_ROW_ID_TEXT = 'e2eChapMarq01';
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_ROW_ID_TEXT = 'e2eChapMarq02';

/** 215 characters. Wider than the full-size player title at a 1200px window. */
export const E2E_PODCAST_ITEM_MARQUEE_TITLE = 'E2E Marquee Overflow Title '.repeat(8).trim();

/** 207 characters. Wider than the player bar strip and the embed segment line at a 1200px window. */
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TITLE = 'E2E Marquee Chapter Title '.repeat(8).trim();

/** 23 characters. Fits the player bar strip at a 1200px window. */
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_TITLE = 'E2E Marquee Chapter Two';

/** 27 characters. Fits the full-size player title and the player bar title at a 1200px window. */
export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_EPISODE_TITLE = 'E2E Marquee Chapter Episode';

export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_WEB_URL = 'https://example.com/e2e-marquee-chapter';

export const E2E_PODCAST_ITEM_MARQUEE_CHAPTER_TWO_WEB_URL =
  'https://example.com/e2e-marquee-chapter-two';

/** Archived, slimmed episode. Channel lists omit it; open `/episode/` and `/clip/` by these ids. */
export const E2E_ARCHIVED_CLIP_EPISODE_ID_TEXT = 'e2ePodArchEp01';
export const E2E_ARCHIVED_CLIP_EPISODE_TITLE = 'E2E Archived Clip Episode';
export const E2E_ARCHIVED_CLIP_ID_TEXT = 'e2eArchClip01';
export const E2E_ARCHIVED_CLIP_TITLE = 'E2E Archived Clip';
export const E2E_ARCHIVED_CLIP_PREVIEW = 'This archived episode keeps a short preview.';
export const E2E_ARCHIVED_CLIP_LINK_URL = 'https://example.com/e2e-archived-clip-episode';

/** Clip whose episode was removed. Owned by the seeded E2E user. */
export const E2E_REMOVED_CLIP_ID_TEXT = 'e2eRemClip01';
export const E2E_REMOVED_CLIP_TITLE = 'E2E Removed Clip';
export const E2E_REMOVED_EPISODE_TITLE = 'E2E Removed Episode';
export const E2E_REMOVED_SHOW_TITLE = 'E2E Removed Show';

/** Playlist with one live episode and one removed entry. Owned by the seeded E2E user. */
export const E2E_REMOVED_PLAYLIST_ID_TEXT = 'e2eRemPlay01';
export const E2E_REMOVED_PLAYLIST_TITLE = 'E2E Removed Playlist';

/** Archived show the seeded E2E user still follows. No episodes. */
export const E2E_ARCHIVED_SHOW_ID_TEXT = 'e2eArchShow01';
export const E2E_ARCHIVED_SHOW_TITLE = 'E2E Archived Show';
export const E2E_ARCHIVED_SHOW_FEED_URL = 'https://e2e-seed-archived-show.example/podcast.xml';

/** Removed Content log row for the seeded E2E user. The show is the archived follow. */
export const E2E_CONTENT_LOG_CHANNEL_ID_TEXT = E2E_ARCHIVED_SHOW_ID_TEXT;
export const E2E_CONTENT_LOG_CHANNEL_TITLE = E2E_ARCHIVED_SHOW_TITLE;

export const E2E_ITEM_CHAPTER_INTRO_ID_TEXT = 'e2eChapIntro01';
export const E2E_ITEM_CHAPTER_TOPIC_ID_TEXT = 'e2eChapTopic01';
/** First of `e2eChapFil01`–`e2eChapFil12` on the chaptered episode — tall Chapters pane only. */
export const E2E_ITEM_CHAPTER_FILLER_FIRST_ID_TEXT = 'e2eChapFil01';

export const E2E_CLIP_ID_TEXT = 'e2eClip00000001';
export const E2E_SOUNDBITE_ID_TEXT = 'e2eSoundbite001';

/** Publisher-feed artist channel. Mobile `artist.yaml` deep-links here. */
export const E2E_MUSIC_CHANNEL_ID_TEXT = 'e2eMusicChnl01';

/** Directory publisher-music artist (`e2eArtPub01` = 11 chars). Distinct from the music album fixture. */
export const E2E_DIRECTORY_ARTIST_ID_TEXT = 'e2eArtPub01';
export const E2E_DIRECTORY_ARTIST_TITLE = 'E2E Directory Artist';
export const E2E_DIRECTORY_ARTIST_LAST_PUB_DATE_ISO = '2026-03-15T18:00:00.000Z';
export const E2E_MUSIC_ALBUM_ID_TEXT = 'e2eMusicAlbm01';
export const E2E_MUSIC_ALBUM_TITLE = 'E2E Music Album';
export const E2E_MUSIC_ALBUM_UNCLAIMED_ID_TEXT = 'e2eMusicAlbm02';
export const E2E_MUSIC_ALBUM_UNCLAIMED_TITLE = 'E2E Unclaimed Music Album';
export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE = 'E2E Not Yet Added Album';
export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID = 2147483631;
export const E2E_ARTIST_NOT_YET_ADDED_TRACK_TITLE = 'E2E Not Yet Added Track';
export const E2E_PODROLL_PODCAST_ID_TEXT = 'e2ePodroll0001';
export const E2E_PODROLL_PODCAST_TITLE = 'E2E Podroll Podcast';
export const E2E_REMOTE_LIST_ID_TEXT = 'e2eRemoteList01';
export const E2E_REMOTE_LIST_TITLE = 'E2E Remote List';

/** Must match tools/web/seed-e2e.mjs */
export const E2E_REMOTE_ITEM_CHANNEL_ID_TEXT = 'e2eRmtItmCh01';
export const E2E_REMOTE_ITEM_CHANNEL_TITLE = 'E2E Remote Item Channel';
export const E2E_REMOTE_ITEM_CHANNEL_FEED_PI_ID = 876543225;
export const E2E_REMOTE_ITEM_CHANNEL_FEED_URL = 'https://e2e-seed-remote-items.example/podcast.xml';
export const E2E_REMOTE_ITEM_ALBUM_ID_TEXT = 'e2eRmtItmAl01';
export const E2E_REMOTE_ITEM_ALBUM_TITLE = 'E2E Remote Item Album';
export const E2E_REMOTE_ITEM_ALBUM_FEED_PI_ID = 876543226;
export const E2E_REMOTE_ITEM_ALBUM_FEED_URL = 'https://e2e-seed-remote-items.example/album.xml';
export const E2E_PODROLL_STUB_PODCAST_INDEX_ID = 2147483630;
export const E2E_PODROLL_STUB_FEED_GUID = '11111111-2222-4333-8444-555555555511';
export const E2E_PODROLL_STUB_FEED_URL = 'https://e2e-seed-remote-items.example/podroll-stub.xml';
export const E2E_PODROLL_STUB_TITLE = 'E2E Podroll Stub Show';
export const E2E_PODROLL_STUB_ITEM_GUID = 'e2e-podroll-stub-item';
export const E2E_PODROLL_STUB_ITEM_TITLE = 'E2E Podroll Stub Episode';
export const E2E_PODROLL_UNKNOWN_TITLE = 'E2E Podroll Unknown Show';
export const E2E_PODROLL_UNKNOWN_FEED_GUID = '11111111-2222-4333-8444-555555555513';
export const E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID = 2147483629;
export const E2E_CHANNEL_REMOTE_STUB_FEED_GUID = '11111111-2222-4333-8444-555555555512';
export const E2E_CHANNEL_REMOTE_STUB_FEED_URL =
  'https://e2e-seed-remote-items.example/remote-stub.xml';
export const E2E_CHANNEL_REMOTE_STUB_TITLE = 'E2E Remote Stub Show';
export const E2E_CHANNEL_REMOTE_STUB_AUTHOR = 'E2E Remote Stub Author';
export const E2E_CHANNEL_REMOTE_STUB_ITEM_GUID = 'e2e-remote-stub-item';
export const E2E_CHANNEL_REMOTE_STUB_ITEM_TITLE = 'E2E Remote Stub Episode';
export const E2E_CHANNEL_REMOTE_UNKNOWN_TITLE = 'E2E Remote Unknown Show';
export const E2E_CHANNEL_REMOTE_UNKNOWN_FEED_GUID = '11111111-2222-4333-8444-555555555514';

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
 * Canonical test-assets feed URL on the seeded with-position queue row. That row's hash is
 * `{feed_url, guid}`. The fresh row has no `feed_url`, so its hash is `{channel_id_text, guid}`.
 */
export const E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL = 'http://localhost:2111/feeds/feed-podcast-1.rss';
/** The seeded account follows the test-assets feed with this title and artwork. */
export const E2E_ADD_BY_RSS_TEST_ASSETS_FEED_TITLE =
  'Vitium amitto volup traho praesentium tantillus totam balbus balbus paulatim.';
export const E2E_ADD_BY_RSS_TEST_ASSETS_FEED_IMAGE_URL =
  'http://localhost:2111/images/image-005-300.jpg';
export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_HASH_ID = getAddByRSSHashId({
  feed_url: E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL,
  channel_id_text: E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  guid: E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID,
});
export const E2E_ADD_BY_RSS_RESOURCE_FRESH_HASH_ID = getAddByRSSHashId({
  channel_id_text: E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
  guid: E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID,
});

/**
 * Anonymous snapshot ids reuse stable item ids but the snapshot itself is
 * written via `page.addInitScript` — see
 * `apps/web/e2e/helpers/anonymousSnapshot.ts`.
 */
export const E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT = E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT;
export const E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT = E2E_MUSIC_TRACK_ONE_ID_TEXT;

/**
 * Deterministic playback positions in seconds, kept here so the specs and the
 * seed agree on the same numeric assertions. Durations match the committed
 * fixtures in `tools/test-assets/assets/e2e/audio/`.
 */
export const E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5;
export const E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60;
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS = 57;

export const E2E_CLIP_START_SECONDS = 5;
export const E2E_CLIP_END_SECONDS = 12;
export const E2E_SOUNDBITE_START_SECONDS = 14;
export const E2E_SOUNDBITE_DURATION_SECONDS = 6;

/**
 * Intro and Topic A span the whole 60s enclosure, the way a chaptered episode does in the wild, so
 * any position on a scrubber names a chapter. The one-second gap between them is deliberate: it
 * covers the case where a position falls outside every chapter range.
 */
export const E2E_CHAPTER_ONE_START_SECONDS = 1;
export const E2E_CHAPTER_ONE_END_SECONDS = 20;
export const E2E_CHAPTER_TWO_START_SECONDS = 21;
export const E2E_CHAPTER_TWO_END_SECONDS = 60;
export const E2E_CHAPTER_ONE_WEB_URL = 'https://example.com/e2e-chapter-intro';
export const E2E_CHAPTER_TWO_WEB_URL = 'https://example.com/e2e-chapter-topic-a';

/**
 * Lightning value block on the podcast fixtures, so value-for-value surfaces have something to
 * offer. The address is a syntactically valid 33-byte compressed pubkey that belongs to no node:
 * nothing in the suite sends a payment, and a fixture must never point at a real destination.
 */
export const E2E_ITEM_VALUE_SUGGESTED_BTC = 0.00000005;
export const E2E_ITEM_VALUE_RECIPIENT_ADDRESS =
  '020000000000000000000000000000000000000000000000000000000000000e2e';

export const E2E_MUSIC_TRACK_ONE_P_SECONDS = 7;
export const E2E_MUSIC_TRACK_DURATION_SECONDS = 120;
/** Within 5s of `E2E_MUSIC_TRACK_DURATION_SECONDS`; restore clamps to 0. */
export const E2E_MUSIC_TRACK_NEAR_END_P_SECONDS = 117;

export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 25;
export const E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS = 60;

/**
 * Asset-server enclosure URLs for the seeded items. The asset server is
 * auto-started by the Playwright webServer config (port 2111).
 */
export const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
export const E2E_IMAGE_ASSET_BASE_URL = 'http://localhost:2111/e2e/images';

/**
 * Embed demo sample assets — sync with tools/web/embed-fixture-constants.mjs
 * (served from the E2E asset server on port 2111).
 */
export const EMBED_FIXTURE_ASSET_BASE_URL = E2E_ASSET_BASE_URL;
export const EMBED_FIXTURE_IMAGE_BASE_URL = E2E_IMAGE_ASSET_BASE_URL;
export const EMBED_SAMPLE_ALT_AUDIO_OGG_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const EMBED_SAMPLE_ALT_VIDEO_MP4_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-120s-330hz.mp3`;
export const EMBED_SAMPLE_ALT_VIDEO_WEBM_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-120s-294hz.mp3`;
export const EMBED_FIXTURE_PLACEHOLDER_IMAGE_URL = `${E2E_IMAGE_ASSET_BASE_URL}/e2e-embed-placeholder.png`;

export const EMBED_SAMPLE_EPISODE_AUDIO_TITLE = 'Heavenly Bodies';
export const EMBED_SAMPLE_EPISODE_NEAR_END_TITLE = 'Constellations';
export const EMBED_SAMPLE_EPISODE_VIDEO_TITLE = 'Episode (video)';
export const EMBED_SAMPLE_EPISODE_VIDEO_ONLY_TITLE = 'Episode (video only)';
export const EMBED_SAMPLE_TRACK_AUDIO_TITLE = 'Magic Flute Overture';
export const EMBED_SAMPLE_TRACK_TWO_TITLE = 'Egmont Overture';
export const EMBED_SAMPLE_TRACK_VIDEO_TITLE = 'Track (video)';
export const EMBED_SAMPLE_PODCAST_CHANNEL_TITLE = 'Cosmos Classroom';
export const EMBED_SAMPLE_ALBUM_CHANNEL_TITLE = 'Orbital Classics';
export const EMBED_SAMPLE_VIDEO_CHANNEL_TITLE = 'Embed Sample Podcast (video)';
export const EMBED_SAMPLE_CLIP_TITLE = 'Through the Telescope';
export const EMBED_SAMPLE_CLIP_START_SECONDS = 5;
export const EMBED_SAMPLE_CLIP_END_SECONDS = 10;
export const EMBED_SAMPLE_SOUNDBITE_TITLE = 'Night Sky Notes';
export const EMBED_SAMPLE_SOUNDBITE_START_SECONDS = 14;
export const EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS = 6;
export const EMBED_SAMPLE_CHAPTER_TITLE = 'Introduction';
export const EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE = 'Planets and Moons';
export const EMBED_SAMPLE_CHAPTER_OUTRO_TITLE = 'Conclusion';

/** Chapter boundaries fit the committed 60s E2E audio fixtures on port 2111. */
export const EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS = 0;
export const EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS = 20;
export const EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS = 20;
export const EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS = 40;
export const EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS = 40;
export const EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS = 60;
export const EMBED_SAMPLE_EPISODE_DURATION_DISPLAY = '1:00';

export const EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL = `${E2E_IMAGE_ASSET_BASE_URL}/e2e-embed-item-art-1400.png`;
export const EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX = 'Scroll Item';

export const EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT = 'embSmpPodAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT = 'embSmpEpAud1';
export const EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT = 'embSmpEpAud2';
export const EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ONLY_ID_TEXT = 'embSmpEpVid1';
export const EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT = 'embSmpAlbAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT = 'embSmpTrkAud1';
export const EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT = 'embSmpTrkAud2';
export const EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT = 'embSmpClip001';
export const EMBED_FIXTURE_CLIP_VIDEO_ID_TEXT = 'embSmpClipV01';
export const EMBED_FIXTURE_SOUNDBITE_ID_TEXT = 'embSmpSbite01';
export const EMBED_FIXTURE_CHAPTER_ID_TEXT = 'embSmpChap001';
export const EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT = 'embSmpChap002';
export const EMBED_FIXTURE_CHAPTER_THREE_ID_TEXT = 'embSmpChap003';
export const EMBED_FIXTURE_CHAPTER_VIDEO_ID_TEXT = 'embSmpChpVCh02';

export const E2E_PODCAST_SHORT_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
export const E2E_PODCAST_RESUME_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-120s-330hz.mp3`;
export const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-120s-294hz.mp3`;
export const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
export const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;

/**
 * Real video fixture (has an h264 video track) for the mobile video mini->full transition E2E.
 * Regenerate via `npm run generate:e2e-media -w podverse-test-assets`
 * (writes `tools/test-assets/assets/e2e/videos/e2e-video-short-30s.mp4`, served as video/mp4 on :2111).
 * Seeded as a standalone video-medium channel by `tools/web/seed-e2e.mjs`; not added to any queue,
 * so web media-player queue specs are unaffected.
 */
export const E2E_VIDEO_ASSET_BASE_URL = 'http://localhost:2111/e2e/videos';
export const E2E_VIDEO_SHORT_ENCLOSURE_URL = `${E2E_VIDEO_ASSET_BASE_URL}/e2e-video-short-30s.mp4`;
export const E2E_VIDEO_CHANNEL_ID_TEXT = 'e2eVideoChnl01';
export const E2E_VIDEO_ITEM_ID_TEXT = 'e2eVideoItm001';
export const E2E_VIDEO_CHANNEL_TITLE = 'E2E Video Transition Channel';
export const E2E_VIDEO_ITEM_DURATION_SECONDS = 30;

/**
 * Non-live VOD HLS playlist for playback start. Enclosure type stays `audio/mpeg`;
 * the `.m3u8` path (query included) is what classifies it. Unsubscribed and not queued.
 * Regenerate via `npm run generate:e2e-media -w podverse-test-assets`
 * (`tools/test-assets/assets/e2e/hls/`). Sync with `tools/web/seed-e2e.mjs`.
 */
export const E2E_HLS_ASSET_BASE_URL = 'http://localhost:2111/e2e/hls';
export const E2E_HLS_VOD_ENCLOSURE_URL = `${E2E_HLS_ASSET_BASE_URL}/e2e-hls-vod.m3u8?fixture=vod`;
export const E2E_HLS_EVENT_PLAYLIST_URL = `${E2E_HLS_ASSET_BASE_URL}/e2e-hls-event.m3u8`;
export const E2E_HLS_VIDEO_EVENT_PLAYLIST_URL = `${E2E_HLS_ASSET_BASE_URL}/e2e-hls-video-event.m3u8`;
export const E2E_HLS_CHANNEL_ID_TEXT = 'e2eHlsChnl001';
export const E2E_HLS_VOD_ITEM_ID_TEXT = 'e2eHlsVodIt01';
export const E2E_HLS_CHANNEL_TITLE = 'E2E HLS VOD Channel';
export const E2E_HLS_VOD_ITEM_TITLE = 'E2E HLS VOD Episode';
export const E2E_HLS_VOD_DURATION_SECONDS = 6;

/**
 * Live items for the live-stream media-player specs, in their own unsubscribed channel so the
 * `v5fCrIj9Io` livestream specs keep their enclosure-free `.first()` link target. The progressive
 * mp3/mp4 items cover enclosure and controller selection plus the floating video portal. The HLS
 * items cover live HLS playback and playlist reload. Sync with `tools/web/seed-e2e.mjs`.
 */
export const E2E_LIVE_AV_CHANNEL_ID_TEXT = 'e2eLiveAvChn01';
export const E2E_LIVE_AV_CHANNEL_TITLE = 'E2E Live AV Channel';
export const E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT = 'e2eLiveAud001';
export const E2E_LIVE_AV_AUDIO_ITEM_TITLE = 'E2E Live Audio Stream';
export const E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT = 'e2eLiveVid001';
export const E2E_LIVE_AV_VIDEO_ITEM_TITLE = 'E2E Live Video Stream';
export const E2E_LIVE_AV_HLS_AUDIO_ITEM_ID_TEXT = 'e2eLiveHlsA01';
export const E2E_LIVE_AV_HLS_AUDIO_ITEM_TITLE = 'E2E Live HLS Audio Stream';
export const E2E_LIVE_AV_HLS_VIDEO_ITEM_ID_TEXT = 'e2eLiveHlsV01';
export const E2E_LIVE_AV_HLS_VIDEO_ITEM_TITLE = 'E2E Live HLS Video Stream';
export const E2E_LIVE_AV_SCHEDULED_ITEM_ID_TEXT = 'e2eLiveSched01';
export const E2E_LIVE_AV_SCHEDULED_ITEM_TITLE = 'E2E Scheduled Livestream';
export const E2E_LIVE_AV_LATER_SCHEDULED_ITEM_ID_TEXT = 'e2eLiveSched02';
export const E2E_LIVE_AV_LATER_SCHEDULED_ITEM_TITLE = 'E2E Later Scheduled Livestream';
export const E2E_LIVE_AV_STALE_SCHEDULED_ITEM_ID_TEXT = 'e2eLiveStale01';
export const E2E_LIVE_AV_STALE_SCHEDULED_ITEM_TITLE = 'E2E Stale Scheduled Livestream';

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

/** Podcast channel with many rows for list scroll E2E (`e2eEmbScrIt01`–`e2eEmbScrIt12`). */
export const E2E_EMBED_SCROLL_CHANNEL_ID_TEXT = 'e2eEmbScrCh01';

/** Default list row for scroll channel (sort=recent, newest pub_date). */
export const E2E_EMBED_SCROLL_DEFAULT_ITEM_ID_TEXT = 'e2eEmbScrIt01';

/** Oldest scroll-channel row label for scroll-into-view assertions (bottom of sort=recent list). */
export const E2E_EMBED_SCROLL_OLDEST_ITEM_LABEL = `${EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX} 1`;

/** Podcast channel with feed_policy.public_visible=false. */
export const E2E_EMBED_PRIVATE_CHANNEL_ID_TEXT = 'e2eEmbPrvCh01';

/** Showcase slot ids visible on `/embed` (excludes hidden route kinds). Sync with resolveEmbedDemoShowcase. */
export const E2E_EMBED_DEMO_SHOWCASE_IDS = [
  'episode-audio',
  'episode-video',
  'track-audio',
  'track-video',
  'chapter-audio',
  'chapter-video',
  'clip-audio',
  'clip-video',
  'podcast-audio',
  'podcast-video',
  'album-audio',
  'album-video',
  'episode-chapters-audio',
  'episode-chapters-video',
  'podcast-clips-audio',
  'podcast-clips-video',
] as const;
