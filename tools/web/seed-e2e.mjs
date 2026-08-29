#!/usr/bin/env node
/**
 * Seed podverse_app_test with minimal deterministic E2E data for web tests.
 * Run via: make e2e_seed_web (after make test_deps)
 *
 * DB defaults: localhost:5732, user podverse_app_read_write, password test.
 *
 * Schema: account (id SERIAL, id_text, verified, sharable_status_id)
 *         account_credentials (id SERIAL, account_id FK, email, password)
 *
 * Also seeds a second account with account_set_password for `/set-password` Playwright tests.
 * Token must match apps/web/e2e/helpers/setPasswordInvite.ts (E2E_SET_PASSWORD_INVITE_TOKEN).
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import { Redis } from 'ioredis';
import pg from 'pg';

import {
  E2E_FIXTURE_CHANNEL_IMAGE_URL,
  E2E_FIXTURE_ITEM_IMAGE_URL,
} from './embed-fixture-constants.mjs';
import { seedEmbedFixtures, syncE2eFixtureImageUrls } from './seed-embed-fixtures.mjs';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_app_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_APP_NAME ?? 'podverse_app_test';
const KEYVALDB_HOST = process.env.KEYVALDB_HOST ?? '127.0.0.1';
const KEYVALDB_PORT = Number(process.env.KEYVALDB_PORT ?? '6679');
const KEYVALDB_PASSWORD = process.env.KEYVALDB_PASSWORD ?? 'test';

const TEST_PASSWORD = 'Test!1Aa';

/** Sync with apps/web/e2e/helpers/legalConsent.ts */
const E2E_CONFIGURED_TERMS_VERSION = '2026-01-01';
const E2E_OUTDATED_TERMS_VERSION = '2025-01-01';
const E2E_STALE_TERMS_EMAIL = 'e2e-stale-terms@example.com';

/** Sync with apps/web/e2e/helpers/setPasswordInvite.ts */
const E2E_SET_PASSWORD_INVITE_TOKEN = '11111111-1111-4111-8111-111111111111';

/** Sync with apps/web/e2e/helpers/seedConstants.ts (SEO profile specs). */
const E2E_SEO_PUBLIC_PROFILE_ID_TEXT = 'e2eSeoPublic01';

/** Deterministic podcast_index_id + channel id_text for apps/web/e2e/header-image-livestream.spec.ts */
const E2E_LIVESTREAM_FEED_PI_ID = 876543210;
const E2E_LIVESTREAM_CHANNEL_ID_TEXT = 'v5fCrIj9Io';
const E2E_LIVESTREAM_ITEM_ID_TEXT = 'e2eLiveStrm01';
const E2E_PODCAST_FEED_PI_ID = 876543211;
const E2E_PODCAST_FEED_URL = 'https://e2e-seed-podcast.example/podcast.xml';
const E2E_MUSIC_FEED_PI_ID = 876543212;
const E2E_MUSIC_FEED_URL = 'https://e2e-seed-music.example/album.xml';

// Mirror of apps/web/e2e/helpers/seedConstants.ts. When changing either side,
// update both in the same commit. These constants are shared by the seed INSERT blocks and the
// matching E2E helpers.
/* eslint-disable @typescript-eslint/no-unused-vars -- referenced by related E2E setup */
const E2E_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';

const E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT = 'e2ePodResume01';
const E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT = 'e2ePodResume02';
const E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT = 'e2ePodResume03';
const E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT = 'e2ePodChap0001';

const E2E_CLIP_ID_TEXT = 'e2eClip00000001';
const E2E_SOUNDBITE_ID_TEXT = 'e2eSoundbite001';

const E2E_MUSIC_ALBUM_ID_TEXT = 'e2eMusicAlbm01';
/** @deprecated Alias — album channel id_text matches E2E_MUSIC_ALBUM_ID_TEXT */
const E2E_MUSIC_CHANNEL_ID_TEXT = E2E_MUSIC_ALBUM_ID_TEXT;
const E2E_MUSIC_TRACK_ONE_ID_TEXT = 'e2eMusicTrk001';
const E2E_MUSIC_TRACK_TWO_ID_TEXT = 'e2eMusicTrk002';
const E2E_MUSIC_QUEUE_ID_TEXT = 'e2eMusicQueue01';
const E2E_PODCAST_QUEUE_ID_TEXT = 'e2ePodQueue01';

const E2E_ADD_BY_RSS_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast.xml';
const E2E_ADD_BY_RSS_CHANNEL_ID_TEXT = 'e2eAbRsChnl0001';
const E2E_ADD_BY_RSS_CHANNEL_TITLE = 'E2E Add-by-RSS Channel';
const E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL = 'https://e2e-seed-addbyrss.example/channel-art.png';
const E2E_ADD_BY_RSS_ITEM_IMAGE_URL = 'https://e2e-seed-addbyrss.example/item-art.png';
const E2E_ADD_BY_RSS_PUB_DATE_ISO = '2025-01-01T00:00:00.000Z';
const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT = 'e2eAbRsResW01';
const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID =
  'https://e2e-seed-addbyrss.example/item-guid/with-position';
const E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT = 'e2eAbRsResF01';
const E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID = 'https://e2e-seed-addbyrss.example/item-guid/fresh';

// Deterministic playback positions in seconds (match the committed fixtures).
const E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5;
const E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60;
const E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS = 57;

const E2E_CLIP_START_SECONDS = 5;
const E2E_CLIP_END_SECONDS = 12;
const E2E_SOUNDBITE_START_SECONDS = 14;
const E2E_SOUNDBITE_DURATION_SECONDS = 6;

const E2E_CHAPTER_ONE_START_SECONDS = 1;
const E2E_CHAPTER_ONE_END_SECONDS = 5;
const E2E_CHAPTER_TWO_START_SECONDS = 6;
const E2E_CHAPTER_TWO_END_SECONDS = 10;

const E2E_MUSIC_TRACK_ONE_P_SECONDS = 7;
const E2E_MUSIC_TRACK_DURATION_SECONDS = 30;

const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 25;
const E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS = 60;

// Asset-server enclosure URLs. Auto-started on port 2111.
const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
const E2E_PODCAST_SHORT_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
const E2E_PODCAST_RESUME_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;

// Real video fixture (h264 video track) for the mobile video mini->full transition E2E.
// Standalone video-medium channel; not added to any queue, so
// web media-player queue specs are unaffected. Mirror of apps/web/e2e/helpers/seedConstants.ts.
// PI id must NOT collide with embed fixtures (`EMBED_FIXTURE_VIDEO_FEED_PI_ID` = 876543213 in
// embed-fixture-constants.mjs) — those run after this block and DELETE BY podcast_index_id, which
// cascade-wipes the mobile video channel and breaks video-transition E2E (item not found).
const E2E_VIDEO_FEED_URL = 'https://e2e-seed-mobile-video.example/podcast.xml';
const E2E_VIDEO_FEED_PI_ID = 876543217;
const E2E_VIDEO_ASSET_BASE_URL = 'http://localhost:2111/e2e/videos';
const E2E_VIDEO_SHORT_ENCLOSURE_URL = `${E2E_VIDEO_ASSET_BASE_URL}/e2e-video-short-30s.mp4`;
const E2E_VIDEO_CHANNEL_ID_TEXT = 'e2eVideoChnl01';
const E2E_VIDEO_ITEM_ID_TEXT = 'e2eVideoItm001';
const E2E_VIDEO_CHANNEL_TITLE = 'E2E Video Transition Channel';
const E2E_VIDEO_ITEM_DURATION_SECONDS = 30;

const E2E_EMBED_VIDEO_ITEM_ID_TEXT = 'e2eEmbVidItem01';

const E2E_ITEM_CHAPTER_INTRO_ID_TEXT = 'e2eChapIntro01';
const E2E_ITEM_CHAPTER_TOPIC_ID_TEXT = 'e2eChapTopic01';
/* eslint-enable @typescript-eslint/no-unused-vars */

const SEED_MEDIA_FIXTURES_ONLY = process.env.SEED_MEDIA_FIXTURES_ONLY === 'true';
const E2E_USER_EMAIL = 'e2e-user@example.com';

const OPML_IMPORT_KEY_PREFIX = 'opml:import:';
const OPML_IMPORT_HOURLY_KEY_PREFIX = 'opml:import:hourly:';

async function scanKeysByMatch(redis, match) {
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', match, 'COUNT', '200');
    cursor = nextCursor;
    if (batch.length > 0) {
      keys.push(...batch);
    }
  } while (cursor !== '0');
  return keys;
}

async function clearOpmlImportKeyvalState(accountId) {
  const redis = new Redis({
    host: KEYVALDB_HOST,
    port: KEYVALDB_PORT,
    password: KEYVALDB_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  try {
    // With enableOfflineQueue:false, a command issued before the socket is
    // connected throws "Stream isn't writeable". lazyConnect + an awaited
    // connect() guarantees readiness first while keeping fail-fast semantics.
    await redis.connect();

    // 1) Remove all hourly-cap keys for this account.
    const hourlyKeys = await scanKeysByMatch(
      redis,
      `${OPML_IMPORT_HOURLY_KEY_PREFIX}${accountId}:*`
    );
    if (hourlyKeys.length > 0) {
      await redis.del(...hourlyKeys);
    }

    // 2) Remove report/status entries for this account (requestId-keyed) without touching
    // other accounts. Keep this scoped by checking cached JSON.accountId.
    const allOpmlKeys = await scanKeysByMatch(redis, `${OPML_IMPORT_KEY_PREFIX}*`);
    const accountScopedReportKeys = [];
    for (const key of allOpmlKeys) {
      if (key.startsWith(OPML_IMPORT_HOURLY_KEY_PREFIX)) {
        continue;
      }
      const raw = await redis.get(key);
      if (!raw) {
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'accountId' in parsed &&
          parsed.accountId === accountId
        ) {
          accountScopedReportKeys.push(key);
        }
      } catch {
        // Non-JSON / unexpected shape: ignore.
      }
    }
    if (accountScopedReportKeys.length > 0) {
      await redis.del(...accountScopedReportKeys);
    }

    console.log(
      `Cleared OPML Valkey state for account ${accountId} (hourly=${hourlyKeys.length}, reports=${accountScopedReportKeys.length})`
    );
  } finally {
    redis.disconnect();
  }
}

async function resolveSeedAccountId(client, passwordHash, invitePlaceholderPasswordHash) {
  if (SEED_MEDIA_FIXTURES_ONLY) {
    const existing = await client.query(
      `SELECT a.id
       FROM account a
       INNER JOIN account_credentials ac ON ac.account_id = a.id
       WHERE ac.email = $1
       LIMIT 1`,
      [E2E_USER_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log(`Using existing fixture account ${E2E_USER_EMAIL} (id ${existing.rows[0].id})`);
      return existing.rows[0].id;
    }

    const idText = crypto.randomBytes(8).toString('hex').slice(0, 15);
    const accountResult = await client.query(
      `INSERT INTO "account" (id_text, verified, sharable_status_id)
       VALUES ($1, true, 1)
       RETURNING id`,
      [idText]
    );
    const accountId = accountResult.rows[0].id;

    await client.query(
      `INSERT INTO "account_credentials" (account_id, email, password)
       VALUES ($1, $2, $3)`,
      [accountId, E2E_USER_EMAIL, passwordHash]
    );

    console.log(`Created fixture account ${E2E_USER_EMAIL} (id ${accountId})`);
    return accountId;
  }

  // Truncate tables used by E2E tests (order matters for FK constraints)
  await client.query(`TRUNCATE TABLE "account_credentials" CASCADE`);
  await client.query(`TRUNCATE TABLE "account" CASCADE`);

  const idText = crypto.randomBytes(8).toString('hex').slice(0, 15);

  const accountResult = await client.query(
    `INSERT INTO "account" (id_text, verified, sharable_status_id)
     VALUES ($1, true, 1)
     RETURNING id`,
    [idText]
  );

  const accountId = accountResult.rows[0].id;

  await client.query(
    `INSERT INTO "account_credentials" (account_id, email, password)
     VALUES ($1, $2, $3)`,
    [accountId, E2E_USER_EMAIL, passwordHash]
  );

  const membershipExpiresAt = new Date();
  membershipExpiresAt.setUTCDate(membershipExpiresAt.getUTCDate() + 30);

  await client.query(
    `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
     VALUES ($1, 1, $2)`,
    [accountId, membershipExpiresAt.toISOString()]
  );

  await client.query(
    `INSERT INTO "account_terms_acceptance" (account_id, terms_version, accepted_at)
     VALUES ($1, $2, NOW())`,
    [accountId, E2E_CONFIGURED_TERMS_VERSION]
  );

  const staleTermsIdText = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const staleTermsAccountResult = await client.query(
    `INSERT INTO "account" (id_text, verified, sharable_status_id)
     VALUES ($1, true, 1)
     RETURNING id`,
    [staleTermsIdText]
  );
  const staleTermsAccountId = staleTermsAccountResult.rows[0].id;

  await client.query(
    `INSERT INTO "account_credentials" (account_id, email, password)
     VALUES ($1, $2, $3)`,
    [staleTermsAccountId, E2E_STALE_TERMS_EMAIL, passwordHash]
  );

  await client.query(
    `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
     VALUES ($1, 1, $2)`,
    [staleTermsAccountId, membershipExpiresAt.toISOString()]
  );

  await client.query(
    `INSERT INTO "account_terms_acceptance" (account_id, terms_version, accepted_at)
     VALUES ($1, $2, NOW())`,
    [staleTermsAccountId, E2E_OUTDATED_TERMS_VERSION]
  );

  const inviteIdText = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const inviteAccountResult = await client.query(
    `INSERT INTO "account" (id_text, verified, sharable_status_id)
     VALUES ($1, false, 1)
     RETURNING id`,
    [inviteIdText]
  );
  const inviteAccountId = inviteAccountResult.rows[0].id;

  await client.query(
    `INSERT INTO "account_credentials" (account_id, email, username, password)
     VALUES ($1, NULL, $2, $3)`,
    [inviteAccountId, 'e2e_invite_user', invitePlaceholderPasswordHash]
  );

  const inviteMembershipExpiresAt = new Date();
  inviteMembershipExpiresAt.setUTCDate(inviteMembershipExpiresAt.getUTCDate() + 30);

  await client.query(
    `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
     VALUES ($1, 1, $2)`,
    [inviteAccountId, inviteMembershipExpiresAt.toISOString()]
  );

  const setPasswordExpiresAt = new Date();
  setPasswordExpiresAt.setUTCFullYear(setPasswordExpiresAt.getUTCFullYear() + 1);

  await client.query(
    `INSERT INTO "account_set_password" (account_id, set_password_token, set_password_token_expires_at)
     VALUES ($1, $2, $3)`,
    [inviteAccountId, E2E_SET_PASSWORD_INVITE_TOKEN, setPasswordExpiresAt.toISOString()]
  );

  console.log(`Seeded 1 test user: e2e-user@example.com`);
  console.log(`Seeded stale-terms user: ${E2E_STALE_TERMS_EMAIL}`);
  console.log(
    `Seeded invite set-password token for account id ${inviteAccountId} (username e2e_invite_user)`
  );

  const seoPublicProfileResult = await client.query(
    `INSERT INTO "account" (id_text, verified, sharable_status_id)
     VALUES ($1, true, 1)
     RETURNING id`,
    [E2E_SEO_PUBLIC_PROFILE_ID_TEXT]
  );
  const seoPublicProfileAccountId = seoPublicProfileResult.rows[0].id;

  await client.query(
    `INSERT INTO "account_profile" (account_id, display_name, bio)
     VALUES ($1, $2, $3)`,
    [
      seoPublicProfileAccountId,
      'E2E SEO Public Profile',
      'Deterministic public profile for SEO E2E tests.',
    ]
  );

  console.log(`Seeded SEO public profile: ${E2E_SEO_PUBLIC_PROFILE_ID_TEXT}`);

  return accountId;
}

async function deleteE2eQueueByIdText(client, queueIdText) {
  await client.query(
    `DELETE FROM queue_resource WHERE queue_id IN (SELECT id FROM queue WHERE id_text = $1)`,
    [queueIdText]
  );
  await client.query(`DELETE FROM queue WHERE id_text = $1`, [queueIdText]);
}

async function seedMediaPlayerAndEmbedFixtures(client, accountId) {
  await syncE2eFixtureImageUrls(client);

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1`, [E2E_LIVESTREAM_FEED_PI_ID]);

  const e2eFeedUrl = 'https://e2e-seed-livestream.example/podcast.xml';
  const feedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [e2eFeedUrl, E2E_LIVESTREAM_FEED_PI_ID]
  );
  const feedId = feedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [feedId]);

  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [feedId]
  );

  const channelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       'E2E Livestream Channel'
     )
     RETURNING id`,
    [E2E_LIVESTREAM_CHANNEL_ID_TEXT, feedId]
  );
  const channelId = channelResult.rows[0].id;

  // Required for API GET /channel/:id — ChannelController treats channels without channel_about as unparsed (404).
  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channelId]);

  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [channelId, 'E2E seeded channel for livestream header image Playwright test.']
  );

  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, 'https://e2e-seed-livestream.example/channel-art.png', 1400)`,
    [channelId]
  );

  const itemResult = await client.query(
    `INSERT INTO item (
       id_text,
       channel_id,
       guid,
       pub_date,
       title,
       item_flag_status_id
     )
     VALUES ($1, $2, $3, NOW(), 'E2E Livestream Item', 1)
     RETURNING id`,
    [
      E2E_LIVESTREAM_ITEM_ID_TEXT,
      channelId,
      'https://e2e-seed-livestream.example/item-guid/e2e-live-1',
    ]
  );
  const itemId = itemResult.rows[0].id;

  await client.query(
    `INSERT INTO live_item (item_id, live_item_status_id, start_time)
     VALUES ($1, (SELECT id FROM live_item_status WHERE status = 'live' LIMIT 1), NOW())`,
    [itemId]
  );

  console.log(
    `Seeded livestream E2E channel ${E2E_LIVESTREAM_CHANNEL_ID_TEXT} (item ${E2E_LIVESTREAM_ITEM_ID_TEXT})`
  );

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_PODCAST_FEED_PI_ID,
    E2E_PODCAST_FEED_URL,
  ]);

  const podcastFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_PODCAST_FEED_URL, E2E_PODCAST_FEED_PI_ID]
  );
  const podcastFeedId = podcastFeedResult.rows[0].id;

  await client.query(
    `INSERT INTO feed_log (feed_id, last_finished_parse_time, last_failed_parse_time)
     VALUES ($1, $2, $3)`,
    [podcastFeedId, '2024-01-01T12:00:00.000Z', '2024-01-02T12:00:00.000Z']
  );

  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [podcastFeedId]
  );

  const podcastChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       'E2E Podcast Seed Channel'
     )
     RETURNING id`,
    [E2E_PODCAST_CHANNEL_ID_TEXT, podcastFeedId]
  );
  const podcastChannelId = podcastChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [podcastChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [podcastChannelId, 'E2E seeded channel for deterministic media-player podcast tests.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [podcastChannelId, E2E_FIXTURE_CHANNEL_IMAGE_URL]
  );

  await deleteE2eQueueByIdText(client, E2E_PODCAST_QUEUE_ID_TEXT);

  const podcastQueueResult = await client.query(
    `INSERT INTO queue (id_text, account_id, medium_id, is_active_queue)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       true
     )
     RETURNING id`,
    [E2E_PODCAST_QUEUE_ID_TEXT, accountId]
  );
  const podcastQueueId = podcastQueueResult.rows[0].id;

  async function insertPodcastItem({
    idText,
    guidSlug,
    title,
    enclosureUrl,
    pubDateOffsetSeconds = 0,
  }) {
    const itemResult = await client.query(
      `INSERT INTO item (
         id_text,
         channel_id,
         guid,
         pub_date,
         title,
         item_flag_status_id
       )
       VALUES ($1, $2, $3, NOW() - ($5::int * INTERVAL '1 second'), $4, 1)
       RETURNING id`,
      [idText, podcastChannelId, `${E2E_PODCAST_FEED_URL}#${guidSlug}`, title, pubDateOffsetSeconds]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} deterministic E2E media-player fixture.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, E2E_FIXTURE_ITEM_IMAGE_URL]
    );

    const enclosureResult = await client.query(
      `INSERT INTO item_enclosure (item_id, type, length, bitrate, item_enclosure_default)
       VALUES ($1, 'audio/mpeg', 0, 24, true)
       RETURNING id`,
      [itemId]
    );
    const enclosureId = enclosureResult.rows[0].id;

    await client.query(
      `INSERT INTO item_enclosure_source (item_enclosure_id, uri, content_type)
       VALUES ($1, $2, 'audio/mpeg')`,
      [enclosureId, enclosureUrl]
    );

    return itemId;
  }

  const resumePositiveItemId = await insertPodcastItem({
    idText: E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
    guidSlug: 'resume-positive',
    title: 'E2E Podcast Resume P > 0',
    enclosureUrl: E2E_PODCAST_RESUME_ENCLOSURE_URL,
    pubDateOffsetSeconds: 0,
  });
  const resumeNearEndItemId = await insertPodcastItem({
    idText: E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT,
    guidSlug: 'resume-near-end',
    title: 'E2E Podcast Resume Near End',
    enclosureUrl: E2E_PODCAST_RESUME_ENCLOSURE_URL,
    pubDateOffsetSeconds: 3600,
  });
  await insertPodcastItem({
    idText: E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT,
    guidSlug: 'resume-none',
    title: 'E2E Podcast No Stored Position',
    enclosureUrl: E2E_PODCAST_RESUME_ENCLOSURE_URL,
    pubDateOffsetSeconds: 7200,
  });
  const chapteredItemId = await insertPodcastItem({
    idText: E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT,
    guidSlug: 'chaptered',
    title: 'E2E Podcast With Chapters',
    enclosureUrl: E2E_PODCAST_SHORT_ENCLOSURE_URL,
    pubDateOffsetSeconds: 10800,
  });

  await client.query(
    `INSERT INTO clip (
       id_text,
       account_id,
       item_id,
       start_time,
       end_time,
       title,
       description,
       sharable_status_id
     )
     VALUES
       ($1, $2, $3, $4, $5, 'E2E Clip End Pause', 'Deterministic E2E clip.', 1),
       ('e2eClipNav0001', $2, $3, 15, 20, 'E2E Clip Navigation', 'Second deterministic E2E clip.', 1)`,
    [E2E_CLIP_ID_TEXT, accountId, chapteredItemId, E2E_CLIP_START_SECONDS, E2E_CLIP_END_SECONDS]
  );

  await client.query(
    `INSERT INTO item_soundbite (id_text, item_id, start_time, duration, title)
     VALUES ($1, $2, $3, $4, 'E2E Soundbite End Pause')`,
    [
      E2E_SOUNDBITE_ID_TEXT,
      chapteredItemId,
      E2E_SOUNDBITE_START_SECONDS,
      E2E_SOUNDBITE_DURATION_SECONDS,
    ]
  );

  const chaptersFeedResult = await client.query(
    `INSERT INTO item_chapters_feed (item_id, url, type)
     VALUES ($1, 'https://e2e-seed-podcast.example/chapters.json', 'application/json')
     RETURNING id`,
    [chapteredItemId]
  );
  const chaptersFeedId = chaptersFeedResult.rows[0].id;

  await client.query(`INSERT INTO item_chapters_feed_log (item_chapters_feed_id) VALUES ($1)`, [
    chaptersFeedId,
  ]);

  const chaptersObjectResult = await client.query(
    `INSERT INTO item_chapters_object (item_chapters_feed_id, title)
     VALUES ($1, 'E2E Podcast With Chapters')
     RETURNING id`,
    [chaptersFeedId]
  );
  const chaptersObjectId = chaptersObjectResult.rows[0].id;

  await client.query(
    `INSERT INTO item_chapter (
       id_text,
       item_chapters_object_id,
       data_hash,
       start_time,
       end_time,
       title,
       table_of_contents
     )
     VALUES
       (
         'e2eChapIntro01',
         $1,
         '11111111111111111111111111111111',
         $2,
         $3,
         'Intro',
         true
       ),
       (
         'e2eChapTopic01',
         $1,
         '22222222222222222222222222222222',
         $4,
         $5,
         'Topic A',
         true
       )`,
    [
      chaptersObjectId,
      E2E_CHAPTER_ONE_START_SECONDS,
      E2E_CHAPTER_ONE_END_SECONDS,
      E2E_CHAPTER_TWO_START_SECONDS,
      E2E_CHAPTER_TWO_END_SECONDS,
    ]
  );

  await client.query(
    `INSERT INTO queue_resource (
       queue_id,
       list_position,
       playback_position,
       media_file_duration,
       item_id
     )
     VALUES
       ($1, 1, $2, $3, $4),
       ($1, 2, $5, $3, $6)`,
    [
      podcastQueueId,
      E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS,
      E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS,
      resumePositiveItemId,
      E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS,
      resumeNearEndItemId,
    ]
  );

  console.log(
    `Seeded podcast media-player E2E channel ${E2E_PODCAST_CHANNEL_ID_TEXT} (items ${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}, ${E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT}, ${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}, ${E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT})`
  );

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_MUSIC_FEED_PI_ID,
    E2E_MUSIC_FEED_URL,
  ]);

  const musicFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_MUSIC_FEED_URL, E2E_MUSIC_FEED_PI_ID]
  );
  const musicFeedId = musicFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [musicFeedId]);

  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [musicFeedId]
  );

  const musicChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'music' LIMIT 1),
       'E2E Music Album'
     )
     RETURNING id`,
    [E2E_MUSIC_CHANNEL_ID_TEXT, musicFeedId]
  );
  const musicChannelId = musicChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [musicChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [musicChannelId, 'E2E seeded album for deterministic media-player music tests.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [musicChannelId, E2E_FIXTURE_CHANNEL_IMAGE_URL]
  );

  // Music queue is intentionally is_active_queue=false at seed time. The
  // podcast queue stays active on QueueController mount; clicking play on a
  // music track in the spec flips the music queue to active via the
  // updateNowPlaying call inside useMediaPlayerResourceUpdate. This keeps
  // the music spec from auto-loading a queued track before the user clicks
  // play, while still letting handleEnded find the music queue when the
  // spec drives track-1 to its end.
  await deleteE2eQueueByIdText(client, E2E_MUSIC_QUEUE_ID_TEXT);

  const musicQueueResult = await client.query(
    `INSERT INTO queue (id_text, account_id, medium_id, is_active_queue)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'music' LIMIT 1),
       false
     )
     RETURNING id`,
    [E2E_MUSIC_QUEUE_ID_TEXT, accountId]
  );
  const musicQueueId = musicQueueResult.rows[0].id;

  // Reduce to a single seasoned helper for music tracks so both rows stay
  // identical except for their id_text, title, enclosure URL, and pub_date.
  // pub_date is parameterized because the season-forward auto-queue API
  // (`/item/queue/season/:idText?direction=forward`) returns sibling items
  // with pub_date < current when neither row has a season number, so the
  // "next" track for auto-queue must have an *earlier* pub_date than the
  // playing track.
  async function insertMusicTrack({ idText, guidSlug, title, enclosureUrl, pubDateOffsetSeconds }) {
    const itemResult = await client.query(
      `INSERT INTO item (
         id_text,
         channel_id,
         guid,
         pub_date,
         title,
         item_flag_status_id
       )
       VALUES ($1, $2, $3, NOW() - ($5::int * INTERVAL '1 second'), $4, 1)
       RETURNING id`,
      [idText, musicChannelId, `${E2E_MUSIC_FEED_URL}#${guidSlug}`, title, pubDateOffsetSeconds]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, E2E_MUSIC_TRACK_DURATION_SECONDS]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} deterministic E2E music fixture.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, E2E_FIXTURE_ITEM_IMAGE_URL]
    );

    const enclosureResult = await client.query(
      `INSERT INTO item_enclosure (item_id, type, length, bitrate, item_enclosure_default)
       VALUES ($1, 'audio/mpeg', 0, 24, true)
       RETURNING id`,
      [itemId]
    );
    const enclosureId = enclosureResult.rows[0].id;

    await client.query(
      `INSERT INTO item_enclosure_source (item_enclosure_id, uri, content_type)
       VALUES ($1, $2, 'audio/mpeg')`,
      [enclosureId, enclosureUrl]
    );

    return itemId;
  }

  const musicTrackOneItemId = await insertMusicTrack({
    idText: E2E_MUSIC_TRACK_ONE_ID_TEXT,
    guidSlug: 'track-one',
    title: 'E2E Music Track One',
    enclosureUrl: E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL,
    pubDateOffsetSeconds: 0,
  });
  const musicTrackTwoItemId = await insertMusicTrack({
    idText: E2E_MUSIC_TRACK_TWO_ID_TEXT,
    guidSlug: 'track-two',
    title: 'E2E Music Track Two',
    enclosureUrl: E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL,
    pubDateOffsetSeconds: 60,
  });

  // Music queue rows. Track-1 sits upcoming with playback_position=7 so the
  // abridged index surfaces a stored position the music seek-to-0 rule must
  // ignore. Track-2 sits further upcoming with playback_position=0 so when
  // the spec drives track-1 to its end, the manual-queue branch loads
  // track-2 next.
  await client.query(
    `INSERT INTO queue_resource (
       queue_id,
       list_position,
       playback_position,
       media_file_duration,
       item_id
     )
     VALUES
       ($1, 1, $2, $3, $4),
       ($1, 2, 0, $3, $5)`,
    [
      musicQueueId,
      E2E_MUSIC_TRACK_ONE_P_SECONDS,
      E2E_MUSIC_TRACK_DURATION_SECONDS,
      musicTrackOneItemId,
      musicTrackTwoItemId,
    ]
  );

  console.log(
    `Seeded music media-player E2E channel ${E2E_MUSIC_CHANNEL_ID_TEXT} (queue ${E2E_MUSIC_QUEUE_ID_TEXT}; tracks ${E2E_MUSIC_TRACK_ONE_ID_TEXT}, ${E2E_MUSIC_TRACK_TWO_ID_TEXT})`
  );

  // Add-by-RSS resources live in the podcast queue at upcoming
  // list_position values (above the seeded items at 1, 2 but well
  // under the NUMERIC(22, 21) `list_position` domain ceiling of 10)
  // so they do not auto-load on QueueController mount; the resume
  // spec promotes the relevant resource to now-playing per-test via the
  // queue item-add-by-rss/now-playing API for deterministic state
  // regardless of run order. The full `add_by_rss_resource_data` payload
  // (including `bundle`) lets the in-app loader reconstruct the index
  // item without IndexedDB. Spec mirrors these builders inline in
  // apps/web/e2e/media-player-addbyrss-resume.spec.ts so the API call
  // can reproduce the same md5(channel_id_text + guid) hash.
  function buildAddByRssBundleSeed({ guid, title, enclosureUrl }) {
    return {
      item: { title, guid },
      about: { duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS },
      images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
      description: { value: `${title} deterministic E2E add-by-RSS fixture.` },
      enclosures: [
        {
          item_enclosure: {
            type: 'audio/mpeg',
            length: 0,
            bitrate: 24,
            item_enclosure_default: true,
          },
          item_enclosure_integrity: null,
          item_enclosure_sources: [{ uri: enclosureUrl, content_type: 'audio/mpeg' }],
        },
      ],
    };
  }

  function buildAddByRssResourceDataSeed({ itemIdText, guid, title, enclosureUrl }) {
    return {
      channel_id_text: E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
      guid,
      title,
      pub_date: E2E_ADD_BY_RSS_PUB_DATE_ISO,
      id_text: itemIdText,
      medium_id: 1,
      channel_title: E2E_ADD_BY_RSS_CHANNEL_TITLE,
      channel_image_url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
      channel_images: [{ url: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL, image_width_size: null }],
      item_images: [{ url: E2E_ADD_BY_RSS_ITEM_IMAGE_URL, image_width_size: 1400 }],
      enclosure_url: enclosureUrl,
      duration: E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
      bundle: buildAddByRssBundleSeed({ guid, title, enclosureUrl }),
    };
  }

  // Mirror of packages/helpers/src/lib/addByRSSHash.ts (getAddByRSSHashId).
  // Hash input keeps only channel_id_text + guid (guid takes precedence over
  // enclosure_url when present).
  function computeAddByRssHashSeed(channelIdText, guid) {
    const minimal = {};
    if (channelIdText) minimal.channel_id_text = channelIdText;
    if (guid) minimal.guid = guid;
    return crypto.createHash('md5').update(JSON.stringify(minimal)).digest('hex');
  }

  const withPositionResourceData = buildAddByRssResourceDataSeed({
    itemIdText: E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT,
    guid: E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID,
    title: 'E2E Add-by-RSS With Position',
    enclosureUrl: E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL,
  });
  const freshResourceData = buildAddByRssResourceDataSeed({
    itemIdText: E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT,
    guid: E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID,
    title: 'E2E Add-by-RSS Fresh',
    enclosureUrl: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
  });

  const withPositionHash = computeAddByRssHashSeed(
    E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
    E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_GUID
  );
  const freshHash = computeAddByRssHashSeed(
    E2E_ADD_BY_RSS_CHANNEL_ID_TEXT,
    E2E_ADD_BY_RSS_RESOURCE_FRESH_GUID
  );

  await client.query(
    `INSERT INTO queue_resource (
       queue_id,
       list_position,
       playback_position,
       media_file_duration,
       add_by_rss_hash_id,
       add_by_rss_resource_data
     )
     VALUES
       ($1, 3, $2, $3, $4, $5::jsonb),
       ($1, 4, 0, $3, $6, $7::jsonb)`,
    [
      podcastQueueId,
      E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS,
      E2E_ADD_BY_RSS_ITEM_DURATION_SECONDS,
      withPositionHash,
      JSON.stringify(withPositionResourceData),
      freshHash,
      JSON.stringify(freshResourceData),
    ]
  );

  console.log(
    `Seeded add-by-RSS media-player E2E resources (${E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT} at list_position 3 with playback_position=${E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS}, ${E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT} at list_position 4 with playback_position=0)`
  );

  // Standalone video-medium channel + item for the mobile video mini->full transition E2E.
  // Deliberately NOT added to any queue and NOT reachable from
  // web search/home assertions, so existing web media-player specs are unaffected. The mobile app
  // reaches it via an EXPO_PUBLIC_MOBILE_E2E-gated affordance that calls playItemById on this item.
  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_VIDEO_FEED_PI_ID,
    E2E_VIDEO_FEED_URL,
  ]);

  const videoFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_VIDEO_FEED_URL, E2E_VIDEO_FEED_PI_ID]
  );
  const videoFeedId = videoFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [videoFeedId]);

  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [videoFeedId]
  );

  const videoChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'video' LIMIT 1),
       $3
     )
     RETURNING id`,
    [E2E_VIDEO_CHANNEL_ID_TEXT, videoFeedId, E2E_VIDEO_CHANNEL_TITLE]
  );
  const videoChannelId = videoChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [videoChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [videoChannelId, 'E2E seeded video-medium channel for the mobile video-transition spike.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [videoChannelId, E2E_FIXTURE_CHANNEL_IMAGE_URL]
  );

  const videoItemResult = await client.query(
    `INSERT INTO item (
       id_text,
       channel_id,
       guid,
       pub_date,
       title,
       item_flag_status_id
     )
     VALUES ($1, $2, $3, NOW(), 'E2E Video Transition Episode', 1)
     RETURNING id`,
    [E2E_VIDEO_ITEM_ID_TEXT, videoChannelId, `${E2E_VIDEO_FEED_URL}#video-transition`]
  );
  const videoItemId = videoItemResult.rows[0].id;

  await client.query(`INSERT INTO item_about (item_id, duration) VALUES ($1, $2)`, [
    videoItemId,
    E2E_VIDEO_ITEM_DURATION_SECONDS,
  ]);
  await client.query(
    `INSERT INTO item_description (item_id, value)
     VALUES ($1, $2)`,
    [videoItemId, 'E2E Video Transition Episode deterministic video fixture.']
  );
  await client.query(
    `INSERT INTO item_image (item_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [videoItemId, E2E_FIXTURE_ITEM_IMAGE_URL]
  );

  const videoEnclosureResult = await client.query(
    `INSERT INTO item_enclosure (item_id, type, length, bitrate, item_enclosure_default)
     VALUES ($1, 'video/mp4', 0, 0, true)
     RETURNING id`,
    [videoItemId]
  );
  const videoEnclosureId = videoEnclosureResult.rows[0].id;

  await client.query(
    `INSERT INTO item_enclosure_source (item_enclosure_id, uri, content_type)
     VALUES ($1, $2, 'video/mp4')`,
    [videoEnclosureId, E2E_VIDEO_SHORT_ENCLOSURE_URL]
  );

  console.log(
    `Seeded video-medium E2E channel ${E2E_VIDEO_CHANNEL_ID_TEXT} (item ${E2E_VIDEO_ITEM_ID_TEXT}, enclosure ${E2E_VIDEO_SHORT_ENCLOSURE_URL})`
  );

  await seedEmbedFixtures(client, { accountId });
}

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const invitePlaceholderPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);

  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  console.log(`Connected to ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

  const accountId = await resolveSeedAccountId(client, passwordHash, invitePlaceholderPasswordHash);
  await clearOpmlImportKeyvalState(accountId);
  await seedMediaPlayerAndEmbedFixtures(client, accountId);

  await client.end();
  console.log('Web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
