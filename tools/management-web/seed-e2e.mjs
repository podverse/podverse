#!/usr/bin/env node
/**
 * Seed podverse_management_test with minimal deterministic E2E data for management-web tests.
 * Run via: make e2e_seed_management_web (after make test_deps)
 *
 * DB defaults: localhost:5732, user podverse_management_read_write, password test.
 *
 * Schema: admin_account (id SERIAL, id_text, admin_account_role_id FK)
 *         admin_account_credentials (id SERIAL, admin_account_id FK, email, password)
 *         admin_account_permissions (optional; role superuser bypasses CRUD checks)
 *         admin_account_role rows seeded by migration: 1=superuser, 2=admin
 *
 * Also seeds one app user in podverse_app_test (user podverse_app_read_write) whose membership
 * the billing admin E2E edits. That user is replaced on every run, so this seed can follow the
 * web seed, which truncates app accounts, or run on its own.
 *
 * Two duplicate-feed pairs are seeded in the app database for Merge Review. Both stay
 * needs_review and the old feeds stay active.
 *
 * Three remote stubs are seeded for the Remote Stubs pages. Re-running replaces those
 * Podcast Index ids only.
 */

import crypto from 'node:crypto';

import bcrypt from 'bcrypt';
import pg from 'pg';

const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.DB_PORT ?? '5732');
const DB_USER = process.env.SEED_DB_USER ?? 'podverse_management_read_write';
const DB_PASSWORD = process.env.SEED_DB_PASSWORD ?? 'test';
const DB_NAME = process.env.DB_MANAGEMENT_NAME ?? 'podverse_management_test';
const APP_DB_USER = process.env.SEED_APP_DB_USER ?? 'podverse_app_read_write';
const APP_DB_PASSWORD = process.env.SEED_APP_DB_PASSWORD ?? 'test';
const APP_DB_NAME = process.env.DB_APP_NAME ?? 'podverse_app_test';

const MERGE_REVIEW_PI_IDS = [876543240, 876543241, 876543242, 876543243];
const REMOTE_STUB_PI_IDS = ['876543250', '876543251', '876543252'];

const BILLING_MEMBER_EMAIL = 'e2e-billing-member@example.com';
const BILLING_MEMBER_TRIAL_DAYS = 3;
const ACCOUNT_MEMBERSHIP_TRIAL = 1;

/**
 * A Trial member whose expiry and `trial` grant cover the same interval, so the grant ledger and
 * the cached `membership_expires_at` agree before any admin change.
 */
async function seedBillingMember(passwordHash) {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: APP_DB_USER,
    password: APP_DB_PASSWORD,
    database: APP_DB_NAME,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM "account"
       WHERE id IN (SELECT account_id FROM "account_credentials" WHERE email = $1)`,
      [BILLING_MEMBER_EMAIL]
    );

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
      [accountId, BILLING_MEMBER_EMAIL, passwordHash]
    );
    await client.query(`INSERT INTO "account_settings" (account_id) VALUES ($1)`, [accountId]);

    // Date objects (not ISO strings) so the timestamp-without-time-zone cache and the timestamptz
    // grant store the same instant as the API reads them back.
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + BILLING_MEMBER_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO "account_membership_status" (account_id, account_membership_id, membership_expires_at)
       VALUES ($1, $2, $3)`,
      [accountId, ACCOUNT_MEMBERSHIP_TRIAL, endsAt]
    );
    await client.query(
      `INSERT INTO "billing_membership_grant" (account_id, source, starts_at, ends_at)
       VALUES ($1, 'trial', $2, $3)`,
      [accountId, startsAt, endsAt]
    );
    await client.query('COMMIT');
    console.log(
      `Seeded app user (Trial, ${BILLING_MEMBER_TRIAL_DAYS} days): ${BILLING_MEMBER_EMAIL}`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Two needs-review pairs. Approving one must leave the old feed active. Rejecting the other
 * removes it from the default list. Re-running replaces these Podcast Index ids only.
 */
async function seedMergeReview() {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: APP_DB_USER,
    password: APP_DB_PASSWORD,
    database: APP_DB_NAME,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM channel_merge
       WHERE from_podcast_index_id = ANY($1::int[])
          OR to_podcast_index_id = ANY($1::int[])`,
      [MERGE_REVIEW_PI_IDS]
    );
    await client.query(`DELETE FROM feed WHERE podcast_index_id = ANY($1::int[])`, [
      MERGE_REVIEW_PI_IDS,
    ]);

    async function insertShow({ podcastIndexId, idText, title, url }) {
      const feedResult = await client.query(
        `INSERT INTO feed (url, podcast_index_id) VALUES ($1, $2) RETURNING id`,
        [url, podcastIndexId]
      );
      const feedId = feedResult.rows[0].id;
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
           $3
         )
         RETURNING id`,
        [idText, feedId, title]
      );
      const channelId = channelResult.rows[0].id;
      await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channelId]);
      await client.query(`INSERT INTO channel_description (channel_id, value) VALUES ($1, $2)`, [
        channelId,
        `${title} description.`,
      ]);
      await client.query(
        `INSERT INTO channel_image (channel_id, url, image_width_size) VALUES ($1, $2, 1400)`,
        [channelId, 'https://e2e-seed-merge-review.example/art.png']
      );
      return channelId;
    }

    async function insertPair({
      fromPodcastIndexId,
      toPodcastIndexId,
      fromIdText,
      toIdText,
      fromTitle,
      toTitle,
      fromUrl,
      toUrl,
      fromItemIdText,
      toItemIdText,
      guid,
    }) {
      const fromChannelId = await insertShow({
        podcastIndexId: fromPodcastIndexId,
        idText: fromIdText,
        title: fromTitle,
        url: fromUrl,
      });
      const toChannelId = await insertShow({
        podcastIndexId: toPodcastIndexId,
        idText: toIdText,
        title: toTitle,
        url: toUrl,
      });
      const fromItem = await client.query(
        `INSERT INTO item (id_text, channel_id, guid, pub_date, title, item_flag_status_id)
         VALUES ($1, $2, $3, NOW(), $4, 1)
         RETURNING id`,
        [fromItemIdText, fromChannelId, guid, `${fromTitle} Episode`]
      );
      const toItem = await client.query(
        `INSERT INTO item (id_text, channel_id, guid, pub_date, title, item_flag_status_id)
         VALUES ($1, $2, $3, NOW(), $4, 1)
         RETURNING id`,
        [toItemIdText, toChannelId, guid, `${toTitle} Episode`]
      );
      const merge = await client.query(
        `INSERT INTO channel_merge (
           from_podcast_index_id,
           to_podcast_index_id,
           from_channel_id,
           to_channel_id,
           mode,
           status,
           confidence,
           match_stats
         )
         VALUES ($1, $2, $3, $4, 'absorb', 'needs_review', 0.4200, $5::jsonb)
         RETURNING id`,
        [
          fromPodcastIndexId,
          toPodcastIndexId,
          fromChannelId,
          toChannelId,
          JSON.stringify({ oldCount: 1, survivorCount: 1, matched: 1, byTier: { guid: 1 } }),
        ]
      );
      await client.query(
        `INSERT INTO item_merge_map (channel_merge_id, from_item_id, to_item_id, match_tier)
         VALUES ($1, $2, $3, 'guid')`,
        [merge.rows[0].id, fromItem.rows[0].id, toItem.rows[0].id]
      );
    }

    await insertPair({
      fromPodcastIndexId: 876543240,
      toPodcastIndexId: 876543241,
      fromIdText: 'e2eMrgRvApO1',
      toIdText: 'e2eMrgRvApS1',
      fromTitle: 'E2E Review Approve',
      toTitle: 'E2E Review Approve Survivor',
      fromUrl: 'https://e2e-seed-merge-review.example/approve-old.xml',
      toUrl: 'https://e2e-seed-merge-review.example/approve-survivor.xml',
      fromItemIdText: 'e2eMrgRvApI1',
      toItemIdText: 'e2eMrgRvApI2',
      guid: 'https://e2e-seed-merge-review.example/guid/approve',
    });
    await insertPair({
      fromPodcastIndexId: 876543242,
      toPodcastIndexId: 876543243,
      fromIdText: 'e2eMrgRvRjO1',
      toIdText: 'e2eMrgRvRjS1',
      fromTitle: 'E2E Review Reject',
      toTitle: 'E2E Review Reject Survivor',
      fromUrl: 'https://e2e-seed-merge-review.example/reject-old.xml',
      toUrl: 'https://e2e-seed-merge-review.example/reject-survivor.xml',
      fromItemIdText: 'e2eMrgRvRjI1',
      toItemIdText: 'e2eMrgRvRjI2',
      guid: 'https://e2e-seed-merge-review.example/guid/reject',
    });
    await client.query('COMMIT');
    console.log('Seeded merge review pairs (needs review, old feeds still active).');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Three remote stubs. The feed_guid column is a uuid, so each row stores a fixed uuid and a
 * separate feed_guid alias of e2e-remote-stub-<n>. Re-running replaces these Podcast Index ids
 * only. Aliases and item stubs cascade when the channel stub row is deleted.
 */
async function seedRemoteStubs() {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: APP_DB_USER,
    password: APP_DB_PASSWORD,
    database: APP_DB_NAME,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM scheduled_job
       WHERE dedupe_key = ANY($1::text[])
          OR dedupe_key IN (
            SELECT 'remote-stub-recheck:' || id::text
            FROM remote_channel_stub
            WHERE index_provider = 'podcast_index'
              AND provider_feed_id = ANY($2::text[])
            UNION ALL
            SELECT 'remote-stub-repoint:' || id::text
            FROM remote_channel_stub
            WHERE index_provider = 'podcast_index'
              AND provider_feed_id = ANY($2::text[])
          )`,
      [
        REMOTE_STUB_PI_IDS.map(
          (providerFeedId) => `remote-stub-promote:podcast_index:${providerFeedId}`
        ),
        REMOTE_STUB_PI_IDS,
      ]
    );
    await client.query(
      `DELETE FROM remote_channel_stub
       WHERE index_provider = 'podcast_index'
         AND provider_feed_id = ANY($1::text[])`,
      [REMOTE_STUB_PI_IDS]
    );

    const stubs = [
      {
        aliasGuid: 'e2e-remote-stub-1',
        feedGuid: 'e2e00000-0000-4000-8000-000000000250',
        feedUrl: 'https://example.com/e2e-remote-stub-1.xml',
        items: [
          {
            durationSeconds: 90,
            guid: 'e2e-remote-stub-1-item-1',
            title: 'E2E Remote Stub Item One',
          },
          {
            durationSeconds: 125,
            guid: 'e2e-remote-stub-1-item-2',
            title: 'E2E Remote Stub Item Two',
          },
        ],
        providerFeedId: REMOTE_STUB_PI_IDS[0],
        title: 'E2E Remote Stub Recheck',
      },
      {
        aliasGuid: 'e2e-remote-stub-2',
        feedGuid: 'e2e00000-0000-4000-8000-000000000251',
        feedUrl: 'https://example.com/e2e-remote-stub-2.xml',
        items: [],
        providerFeedId: REMOTE_STUB_PI_IDS[1],
        title: 'E2E Remote Stub Promote',
      },
      {
        aliasGuid: 'e2e-remote-stub-3',
        feedGuid: 'e2e00000-0000-4000-8000-000000000252',
        feedUrl: 'https://example.com/e2e-remote-stub-3.xml',
        items: [],
        providerFeedId: REMOTE_STUB_PI_IDS[2],
        title: 'E2E Remote Stub Delete',
      },
    ];

    for (const stub of stubs) {
      const inserted = await client.query(
        `INSERT INTO remote_channel_stub (
           index_provider,
           provider_feed_id,
           feed_guid,
           feed_url,
           title,
           author,
           medium_id
         )
         VALUES (
           'podcast_index',
           $1,
           $2::uuid,
           $3,
           $4,
           $5,
           (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1)
         )
         RETURNING id`,
        [stub.providerFeedId, stub.feedGuid, stub.feedUrl, stub.title, 'E2E Remote Author']
      );
      const stubId = inserted.rows[0].id;
      await client.query(
        `INSERT INTO remote_channel_stub_alias (remote_channel_stub_id, key_kind, key_value)
         VALUES ($1, 'feed_guid', $2), ($1, 'feed_url', $3)`,
        [stubId, stub.aliasGuid, stub.feedUrl]
      );
      for (let index = 0; index < stub.items.length; index += 1) {
        const item = stub.items[index];
        await client.query(
          `INSERT INTO remote_item_stub (
             remote_channel_stub_id,
             item_guid,
             title,
             pub_date,
             duration_seconds
           )
           VALUES ($1, $2, $3, NOW() - make_interval(days => $4), $5)`,
          [stubId, item.guid, item.title, index + 1, item.durationSeconds]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Seeded remote stubs (recheck, promote, delete).');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

async function main() {
  const passwordHash = await bcrypt.hash('Test!1Aa', 10);

  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await client.connect();
  console.log(`Connected to ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

  await client.query('TRUNCATE TABLE "admin_account" CASCADE');

  const idTextSuper = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const superResult = await client.query(
    `INSERT INTO "admin_account" (id_text, admin_account_role_id)
     VALUES ($1, 1)
     RETURNING id`,
    [idTextSuper]
  );
  const superId = superResult.rows[0].id;

  await client.query(
    `INSERT INTO "admin_account_credentials" (admin_account_id, email, password)
     VALUES ($1, $2, $3)`,
    [superId, 'e2e-superadmin@example.com', passwordHash]
  );

  const idTextNoBucket = crypto.randomBytes(8).toString('hex').slice(0, 15);
  const noBucketResult = await client.query(
    `INSERT INTO "admin_account" (id_text, admin_account_role_id)
     VALUES ($1, 2)
     RETURNING id`,
    [idTextNoBucket]
  );
  const noBucketId = noBucketResult.rows[0].id;

  await client.query(
    `INSERT INTO "admin_account_credentials" (admin_account_id, email, password)
     VALUES ($1, $2, $3)`,
    [noBucketId, 'e2e-nobucket@example.com', passwordHash]
  );

  await client.query(
    `INSERT INTO "admin_account_permissions" (
       admin_account_id,
       feeds_crud,
       feed_takedown_reasons_crud,
       admins_crud,
       stats_crud,
       billing_prices_crud,
       bucket_crud,
       embed_demo_crud
     ) VALUES ($1, 2, 0, 0, 0, 0, 0, 0)`,
    [noBucketId]
  );

  console.log(`Seeded superuser: e2e-superadmin@example.com`);
  console.log(`Seeded admin (no bucket read): e2e-nobucket@example.com`);
  await client.end();

  await seedBillingMember(passwordHash);
  await seedMergeReview();
  await seedRemoteStubs();
  console.log('Management-web E2E seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
