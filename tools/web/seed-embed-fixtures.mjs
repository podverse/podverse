/**
 * Deterministic embed-player fixtures (video channel, playlists, scroll channel, etc.).
 * Called from tools/web/seed-e2e.mjs and tools/web/seed-local-embed.mjs.
 */

import {
  E2E_FIXTURE_CHANNEL_IMAGE_URL,
  E2E_FIXTURE_ITEM_IMAGE_URL,
  EMBED_FIXTURE_PLAYLIST_ID_TEXT,
  EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
  EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT,
  EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_VIDEO_ENCLOSURE_URL,
  EMBED_FIXTURE_VIDEO_FEED_PI_ID,
  EMBED_FIXTURE_VIDEO_FEED_URL,
  EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
  EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
  EMBED_SAMPLE_PLAYLIST_MIXED_TITLE,
  EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE,
  EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE,
  EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_PRIVATE_CHANNEL_TITLE,
  EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_SCROLL_CHANNEL_TITLE,
  EMBED_SAMPLE_SCROLL_ITEM_AUDIO_URL,
  EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX,
  EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_TRACK_VIDEO_TITLE,
  EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_VIDEO_CHANNEL_TITLE,
} from './embed-fixture-constants.mjs';
import { seedEmbedSampleDemoFixtures } from './seed-embed-sample-fixtures.mjs';
import { insertEmbedDemoEnclosures } from './insert-embed-demo-enclosures.mjs';

const E2E_EMBED_SCROLL_FEED_PI_ID = 876543214;
const E2E_EMBED_SCROLL_FEED_URL = 'https://e2e-seed-embed-scroll.example/podcast.xml';
const E2E_EMBED_SCROLL_ITEM_COUNT = 12;

const E2E_EMBED_PRIVATE_CHANNEL_FEED_PI_ID = 876543215;
const E2E_EMBED_PRIVATE_CHANNEL_FEED_URL = 'https://e2e-seed-embed-private.example/podcast.xml';

const EMBED_SAMPLE_ITEM_DURATION_SECONDS = 60;

/**
 * Refresh stale `https://e2e-seed-*.example/*` image URLs to localhost test-assets PNGs.
 * Safe to run on every local_seed_embed / e2e_seed pass.
 *
 * @param {import('pg').Client} client
 */
export async function syncE2eFixtureImageUrls(client) {
  const channelResult = await client.query(
    `UPDATE channel_image
     SET url = $1, image_width_size = 1400
     WHERE url LIKE 'https://e2e-seed-%'
     RETURNING id`,
    [E2E_FIXTURE_CHANNEL_IMAGE_URL]
  );
  const itemResult = await client.query(
    `UPDATE item_image
     SET url = $1, image_width_size = 1400
     WHERE url LIKE 'https://e2e-seed-%'
     RETURNING id`,
    [E2E_FIXTURE_ITEM_IMAGE_URL]
  );

  if (channelResult.rowCount > 0 || itemResult.rowCount > 0) {
    console.log(
      `Synced e2e fixture image URLs to test-assets (channel_image=${channelResult.rowCount}, item_image=${itemResult.rowCount})`
    );
  }
}

/**
 * @param {import('pg').Client} client
 * @param {{ accountId: number }} options
 */
export async function seedEmbedFixtures(client, options) {
  const { accountId } = options;

  const { episodeAudioItemId, episodeNearEndItemId } = await seedEmbedSampleDemoFixtures(client, {
    accountId,
  });

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    EMBED_FIXTURE_VIDEO_FEED_PI_ID,
    EMBED_FIXTURE_VIDEO_FEED_URL,
  ]);

  const videoFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [EMBED_FIXTURE_VIDEO_FEED_URL, EMBED_FIXTURE_VIDEO_FEED_PI_ID]
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
    [EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT, videoFeedId, EMBED_SAMPLE_VIDEO_CHANNEL_TITLE]
  );
  const videoChannelId = videoChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [videoChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [videoChannelId, 'Embed demo video channel with color-coded artwork.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [videoChannelId, EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL]
  );

  async function insertVideoItem({
    idText,
    guidSlug,
    title,
    itemImageUrl,
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
      [
        idText,
        videoChannelId,
        `${EMBED_FIXTURE_VIDEO_FEED_URL}#${guidSlug}`,
        title,
        pubDateOffsetSeconds,
      ]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, 120]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} deterministic E2E embed video fixture.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, itemImageUrl]
    );

    await insertEmbedDemoEnclosures(client, itemId, {
      primaryUrl: EMBED_FIXTURE_VIDEO_ENCLOSURE_URL,
      primaryType: 'video/mp4',
    });

    return itemId;
  }

  const videoItemOneId = await insertVideoItem({
    idText: 'e2eEmbVidItem01',
    guidSlug: 'video-one',
    title: EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
    itemImageUrl: EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL,
    pubDateOffsetSeconds: 0,
  });
  await insertVideoItem({
    idText: EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT,
    guidSlug: 'video-two',
    title: 'Episode Two (video)',
    itemImageUrl: EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL,
    pubDateOffsetSeconds: 120,
  });
  await insertVideoItem({
    idText: EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
    guidSlug: 'video-track',
    title: EMBED_SAMPLE_TRACK_VIDEO_TITLE,
    itemImageUrl: EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL,
    pubDateOffsetSeconds: 240,
  });

  console.log(
    `Seeded embed video E2E channel ${EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT} (items e2eEmbVidItem01, ${EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT}, ${EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT})`
  );

  await client.query(`DELETE FROM playlist WHERE id_text IN ($1, $2, $3)`, [
    EMBED_FIXTURE_PLAYLIST_ID_TEXT,
    EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
    EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT,
  ]);

  const publicPlaylistResult = await client.query(
    `INSERT INTO playlist (
       id_text,
       account_id,
       sharable_status_id,
       title,
       description,
       medium_id,
       item_count,
       last_updated
     )
     VALUES (
       $1,
       $2,
       1,
       $3,
       'Deterministic public playlist for embed list tests.',
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       2,
       NOW()
     )
     RETURNING id`,
    [EMBED_FIXTURE_PLAYLIST_ID_TEXT, accountId, EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE]
  );
  const publicPlaylistId = publicPlaylistResult.rows[0].id;

  await client.query(
    `INSERT INTO playlist_resource (playlist_id, list_position, item_id)
     VALUES ($1, 1, $2), ($1, 2, $3)`,
    [publicPlaylistId, episodeAudioItemId, episodeNearEndItemId]
  );

  const mixedPlaylistResult = await client.query(
    `INSERT INTO playlist (
       id_text,
       account_id,
       sharable_status_id,
       title,
       description,
       medium_id,
       item_count,
       last_updated
     )
     VALUES (
       $1,
       $2,
       1,
       $3,
       'Public playlist with audio and video resources for embed style tests.',
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       2,
       NOW()
     )
     RETURNING id`,
    [EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT, accountId, EMBED_SAMPLE_PLAYLIST_MIXED_TITLE]
  );
  const mixedPlaylistId = mixedPlaylistResult.rows[0].id;

  await client.query(
    `INSERT INTO playlist_resource (playlist_id, list_position, item_id)
     VALUES ($1, 1, $2), ($1, 2, $3)`,
    [mixedPlaylistId, episodeAudioItemId, videoItemOneId]
  );

  await client.query(
    `INSERT INTO playlist (
       id_text,
       account_id,
       sharable_status_id,
       title,
       description,
       medium_id,
       item_count,
       last_updated
     )
     VALUES (
       $1,
       $2,
       3,
       $3,
       'Private playlist for embed not-available tests.',
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       0,
       NOW()
     )`,
    [EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT, accountId, EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE]
  );

  console.log(
    `Seeded embed playlists ${EMBED_FIXTURE_PLAYLIST_ID_TEXT} (public), ${EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT} (mixed), and ${EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT} (private)`
  );

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_EMBED_SCROLL_FEED_PI_ID,
    E2E_EMBED_SCROLL_FEED_URL,
  ]);

  const scrollFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_EMBED_SCROLL_FEED_URL, E2E_EMBED_SCROLL_FEED_PI_ID]
  );
  const scrollFeedId = scrollFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [scrollFeedId]);
  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [scrollFeedId]
  );

  const scrollChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       $3
     )
     RETURNING id`,
    [EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT, scrollFeedId, EMBED_SAMPLE_SCROLL_CHANNEL_TITLE]
  );
  const scrollChannelId = scrollChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [scrollChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [scrollChannelId, 'Embed demo podcast list with many rows for scroll tests.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [scrollChannelId, EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL]
  );

  async function insertScrollChannelItem({ idText, guidSlug, title, pubDateOffsetSeconds }) {
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
      [
        idText,
        scrollChannelId,
        `${E2E_EMBED_SCROLL_FEED_URL}#${guidSlug}`,
        title,
        pubDateOffsetSeconds,
      ]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, EMBED_SAMPLE_ITEM_DURATION_SECONDS]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} embed demo scroll sample.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL]
    );

    await insertEmbedDemoEnclosures(client, itemId, {
      primaryUrl: EMBED_SAMPLE_SCROLL_ITEM_AUDIO_URL,
      primaryType: 'audio/mpeg',
    });

    return itemId;
  }

  for (let index = 1; index <= E2E_EMBED_SCROLL_ITEM_COUNT; index += 1) {
    const paddedIndex = String(index).padStart(2, '0');
    await insertScrollChannelItem({
      idText: `e2eEmbScrIt${paddedIndex}`,
      guidSlug: `scroll-item-${paddedIndex}`,
      title: `${EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX} ${index}`,
      pubDateOffsetSeconds: (E2E_EMBED_SCROLL_ITEM_COUNT - index) * 3600,
    });
  }

  console.log(
    `Seeded embed scroll E2E channel ${EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT} (${E2E_EMBED_SCROLL_ITEM_COUNT} items; default row e2eEmbScrIt01)`
  );

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    E2E_EMBED_PRIVATE_CHANNEL_FEED_PI_ID,
    E2E_EMBED_PRIVATE_CHANNEL_FEED_URL,
  ]);

  const privateChannelFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [E2E_EMBED_PRIVATE_CHANNEL_FEED_URL, E2E_EMBED_PRIVATE_CHANNEL_FEED_PI_ID]
  );
  const privateChannelFeedId = privateChannelFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [privateChannelFeedId]);
  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, false, true)`,
    [privateChannelFeedId]
  );

  const privateChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'podcast' LIMIT 1),
       $3
     )
     RETURNING id`,
    [
      EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT,
      privateChannelFeedId,
      EMBED_SAMPLE_PRIVATE_CHANNEL_TITLE,
    ]
  );
  const privateChannelId = privateChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [privateChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [privateChannelId, 'Non-public channel for embed not-available tests.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [privateChannelId, EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL]
  );

  console.log(
    `Seeded embed private E2E channel ${EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT} (feed_policy.public_visible=false)`
  );
}
