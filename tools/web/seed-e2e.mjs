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
import pg from 'pg';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_app_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_APP_NAME ?? 'podverse_app_test';

const TEST_PASSWORD = 'Test!1Aa';

/** Sync with apps/web/e2e/helpers/setPasswordInvite.ts */
const E2E_SET_PASSWORD_INVITE_TOKEN = '11111111-1111-4111-8111-111111111111';

/** Deterministic podcast_index_id + channel id_text for apps/web/e2e/header-image-livestream.spec.ts */
const E2E_LIVESTREAM_FEED_PI_ID = 876543210;
const E2E_LIVESTREAM_CHANNEL_ID_TEXT = 'v5fCrIj9Io';
const E2E_LIVESTREAM_ITEM_ID_TEXT = 'e2eLiveStrm01';

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

  // Truncate tables used by E2E tests (order matters for FK constraints)
  // No RESTART IDENTITY — the read_write user doesn't own sequences.
  // Since test_db_init drops/recreates the DB fresh each run, sequences already start at 1.
  await client.query(`TRUNCATE TABLE "account_credentials" CASCADE`);
  await client.query(`TRUNCATE TABLE "account" CASCADE`);

  // Insert a test user: account row + account_credentials row
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
    [accountId, 'e2e-user@example.com', passwordHash]
  );

  const membershipExpiresAt = new Date();
  membershipExpiresAt.setUTCDate(membershipExpiresAt.getUTCDate() + 30);

  await client.query(
    `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
     VALUES ($1, 1, $2)`,
    [accountId, membershipExpiresAt.toISOString()]
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
  console.log(
    `Seeded invite set-password token for account id ${inviteAccountId} (username e2e_invite_user)`
  );

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

  await client.end();
  console.log('Web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
