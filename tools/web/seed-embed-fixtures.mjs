/**
 * Deterministic embed-player fixtures (sample podcast/album, video channel, playlists,
 * scroll channel, private channel) and embed_demo_showcase rows for E2E.
 * Called from tools/web/seed-e2e.mjs and tools/web/seed-local-embed.mjs.
 */

import {
  E2E_FIXTURE_CHANNEL_IMAGE_URL,
  E2E_FIXTURE_ITEM_IMAGE_URL,
  EMBED_DEMO_SHOWCASE_IDS,
  EMBED_DEMO_SHOWCASE_RESOURCE_IDS,
  EMBED_FIXTURE_ALBUM_LIST_AUDIO_ID_TEXT,
  EMBED_FIXTURE_ALBUM_LIST_VIDEO_ID_TEXT,
  EMBED_FIXTURE_ALBUM_VIDEO_TRACK_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_THREE_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT,
  EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT,
  EMBED_FIXTURE_PLAYLIST_ID_TEXT,
  EMBED_FIXTURE_PLAYLIST_MIXED_ID_TEXT,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT,
  EMBED_FIXTURE_PRIVATE_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PRIVATE_PLAYLIST_ID_TEXT,
  EMBED_FIXTURE_SCROLL_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_VIDEO_ENCLOSURE_URL,
  EMBED_FIXTURE_VIDEO_FEED_PI_ID,
  EMBED_FIXTURE_VIDEO_FEED_URL,
  EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT,
  EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID,
  EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL,
  EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_ALBUM_CHANNEL_TITLE,
  EMBED_SAMPLE_ALBUM_VIDEO_CHANNEL_TITLE,
  EMBED_SAMPLE_ALT_AUDIO_OGG_URL,
  EMBED_SAMPLE_ALT_VIDEO_MP4_URL,
  EMBED_SAMPLE_ALT_VIDEO_WEBM_URL,
  EMBED_SAMPLE_CHAPTER_INTRO_IMAGE_URL,
  EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS,
  EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS,
  EMBED_SAMPLE_CHAPTER_OUTRO_IMAGE_URL,
  EMBED_SAMPLE_CHAPTER_OUTRO_TITLE,
  EMBED_SAMPLE_CHAPTER_PARENT_TITLE,
  EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS,
  EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS,
  EMBED_SAMPLE_CHAPTER_TITLE,
  EMBED_SAMPLE_CHAPTER_TOPIC_A_IMAGE_URL,
  EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE,
  EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS,
  EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS,
  EMBED_SAMPLE_CLIP_TITLE,
  EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL,
  EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
  EMBED_SAMPLE_EPISODE_DURATION_SECONDS,
  EMBED_SAMPLE_EPISODE_NEAR_END_TITLE,
  EMBED_SAMPLE_EPISODE_VIDEO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_EPISODE_VIDEO_TITLE,
  EMBED_SAMPLE_PLAYLIST_MIXED_TITLE,
  EMBED_SAMPLE_PLAYLIST_PUBLIC_TITLE,
  EMBED_SAMPLE_PLAYLIST_PRIVATE_TITLE,
  EMBED_SAMPLE_PODCAST_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_PODCAST_CHANNEL_TITLE,
  EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
  EMBED_SAMPLE_PRIVATE_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_PRIVATE_CHANNEL_TITLE,
  EMBED_SAMPLE_SCROLL_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_SCROLL_CHANNEL_TITLE,
  EMBED_SAMPLE_SCROLL_ITEM_AUDIO_URL,
  EMBED_SAMPLE_SCROLL_ITEM_TITLE_PREFIX,
  EMBED_SAMPLE_SOUNDBITE_TITLE,
  EMBED_SAMPLE_TRACK_AUDIO_AUDIO_URL,
  EMBED_SAMPLE_TRACK_AUDIO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_TRACK_AUDIO_TITLE,
  EMBED_SAMPLE_TRACK_TWO_AUDIO_URL,
  EMBED_SAMPLE_TRACK_TWO_TITLE,
  EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_TRACK_VIDEO_TITLE,
  EMBED_SAMPLE_VIDEO_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_VIDEO_CHANNEL_TITLE,
} from './embed-fixture-constants.mjs';

const EMBED_SAMPLE_PODCAST_FEED_PI_ID = 876543220;
const EMBED_SAMPLE_PODCAST_FEED_URL = 'https://e2e-seed-embed-sample-podcast.example/podcast.xml';
const EMBED_SAMPLE_ALBUM_FEED_PI_ID = 876543221;
const EMBED_SAMPLE_ALBUM_FEED_URL = 'https://e2e-seed-embed-sample-album.example/album.xml';

const EMBED_SAMPLE_TRACK_DURATION_SECONDS = 30;
const EMBED_SAMPLE_CLIP_START_SECONDS = 5;
const EMBED_SAMPLE_CLIP_END_SECONDS = 10;
const EMBED_SAMPLE_SOUNDBITE_START_SECONDS = 14;
const EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS = 6;

const E2E_EMBED_SCROLL_FEED_PI_ID = 876543214;
const E2E_EMBED_SCROLL_FEED_URL = 'https://e2e-seed-embed-scroll.example/podcast.xml';
const E2E_EMBED_SCROLL_ITEM_COUNT = 12;

const E2E_EMBED_PRIVATE_CHANNEL_FEED_PI_ID = 876543215;
const E2E_EMBED_PRIVATE_CHANNEL_FEED_URL = 'https://e2e-seed-embed-private.example/podcast.xml';

const EMBED_SAMPLE_ITEM_DURATION_SECONDS = 60;

/**
 * @param {string} primaryUrl
 * @param {'audio/mpeg' | 'video/mp4'} primaryType
 */
function buildEmbedDemoEnclosureSpecs(primaryUrl, primaryType) {
  const audioMpegUrl =
    primaryType === 'audio/mpeg' ? primaryUrl : EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL;
  const videoMp4Url = primaryType === 'video/mp4' ? primaryUrl : EMBED_SAMPLE_ALT_VIDEO_MP4_URL;

  return [
    {
      type: 'audio/mpeg',
      title: 'MP3 128kbps',
      bitrate: 128000,
      uri: audioMpegUrl,
      isDefault: primaryType === 'audio/mpeg',
    },
    {
      type: 'audio/ogg',
      title: 'OGG Opus',
      bitrate: 192000,
      uri: EMBED_SAMPLE_ALT_AUDIO_OGG_URL,
      isDefault: false,
    },
    {
      type: 'video/mp4',
      title: 'MP4 720p',
      bitrate: 2500000,
      height: 720,
      uri: videoMp4Url,
      isDefault: primaryType === 'video/mp4',
    },
    {
      type: 'video/webm',
      title: 'WebM 1080p',
      bitrate: 1800000,
      height: 1080,
      uri: EMBED_SAMPLE_ALT_VIDEO_WEBM_URL,
      isDefault: false,
    },
  ];
}

/**
 * @param {import('pg').Client} client
 * @param {number} itemId
 * @param {{ primaryUrl: string; primaryType?: 'audio/mpeg' | 'video/mp4' }} options
 */
async function insertEmbedDemoEnclosures(client, itemId, options) {
  const primaryType = options.primaryType ?? 'audio/mpeg';
  const specs = buildEmbedDemoEnclosureSpecs(options.primaryUrl, primaryType);

  for (const spec of specs) {
    const columns = ['item_id', 'type', 'length', 'bitrate', 'item_enclosure_default', 'title'];
    const values = [itemId, spec.type, 0, spec.bitrate, spec.isDefault, spec.title];

    if (spec.height !== null && spec.height !== undefined) {
      columns.splice(columns.length - 1, 0, 'height');
      values.splice(values.length - 1, 0, spec.height);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const enclosureResult = await client.query(
      `INSERT INTO item_enclosure (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING id`,
      values
    );
    const enclosureId = enclosureResult.rows[0].id;

    await client.query(
      `INSERT INTO item_enclosure_source (item_enclosure_id, uri, content_type)
       VALUES ($1, $2, $3)`,
      [enclosureId, spec.uri, spec.type]
    );
  }
}

/** Canonical chapter ids for /embed/chapter/* E2E (global unique item_chapter.id_text). */
const EMBED_SAMPLE_CANONICAL_CHAPTER_ROWS = [
  {
    idText: EMBED_FIXTURE_CHAPTER_ID_TEXT,
    dataHash: '11111111111111111111111111111111',
    startSeconds: EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS,
    endSeconds: EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS,
    title: EMBED_SAMPLE_CHAPTER_TITLE,
    imgUrl: EMBED_SAMPLE_CHAPTER_INTRO_IMAGE_URL,
  },
  {
    idText: EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT,
    dataHash: '22222222222222222222222222222222',
    startSeconds: EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS,
    endSeconds: EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS,
    title: EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE,
    imgUrl: EMBED_SAMPLE_CHAPTER_TOPIC_A_IMAGE_URL,
  },
  {
    idText: EMBED_FIXTURE_CHAPTER_THREE_ID_TEXT,
    dataHash: '33333333333333333333333333333333',
    startSeconds: EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS,
    endSeconds: EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS,
    title: EMBED_SAMPLE_CHAPTER_OUTRO_TITLE,
    imgUrl: EMBED_SAMPLE_CHAPTER_OUTRO_IMAGE_URL,
  },
];

/**
 * @param {string} idPrefix e.g. embSmpEp1 -> embSmpEp1Ch01
 */
function buildEmbedItemChapterRows(idPrefix) {
  return [
    {
      idText: `${idPrefix}Ch01`,
      dataHash: '11111111111111111111111111111111',
      startSeconds: EMBED_SAMPLE_CHAPTER_ONE_START_SECONDS,
      endSeconds: EMBED_SAMPLE_CHAPTER_ONE_END_SECONDS,
      title: EMBED_SAMPLE_CHAPTER_TITLE,
      imgUrl: EMBED_SAMPLE_CHAPTER_INTRO_IMAGE_URL,
    },
    {
      idText: `${idPrefix}Ch02`,
      dataHash: '22222222222222222222222222222222',
      startSeconds: EMBED_SAMPLE_CHAPTER_TWO_START_SECONDS,
      endSeconds: EMBED_SAMPLE_CHAPTER_TWO_END_SECONDS,
      title: EMBED_SAMPLE_CHAPTER_TOPIC_A_TITLE,
      imgUrl: EMBED_SAMPLE_CHAPTER_TOPIC_A_IMAGE_URL,
    },
    {
      idText: `${idPrefix}Ch03`,
      dataHash: '33333333333333333333333333333333',
      startSeconds: EMBED_SAMPLE_CHAPTER_THREE_START_SECONDS,
      endSeconds: EMBED_SAMPLE_CHAPTER_THREE_END_SECONDS,
      title: EMBED_SAMPLE_CHAPTER_OUTRO_TITLE,
      imgUrl: EMBED_SAMPLE_CHAPTER_OUTRO_IMAGE_URL,
    },
  ];
}

/**
 * @param {import('pg').Client} client
 * @param {number} itemId
 * @param {string} objectTitle
 * @param {typeof EMBED_SAMPLE_CANONICAL_CHAPTER_ROWS} chapterRows
 */
async function seedEmbedItemChapters(client, itemId, objectTitle, chapterRows) {
  const chaptersFeedResult = await client.query(
    `INSERT INTO item_chapters_feed (item_id, url, type)
     VALUES ($1, 'https://e2e-seed-embed-sample.example/chapters.json', 'application/json')
     RETURNING id`,
    [itemId]
  );
  const chaptersFeedId = chaptersFeedResult.rows[0].id;

  await client.query(`INSERT INTO item_chapters_feed_log (item_chapters_feed_id) VALUES ($1)`, [
    chaptersFeedId,
  ]);

  const chaptersObjectResult = await client.query(
    `INSERT INTO item_chapters_object (item_chapters_feed_id, title)
     VALUES ($1, $2)
     RETURNING id`,
    [chaptersFeedId, objectTitle]
  );
  const chaptersObjectId = chaptersObjectResult.rows[0].id;

  for (const chapter of chapterRows) {
    await client.query(
      `INSERT INTO item_chapter (
         id_text,
         item_chapters_object_id,
         data_hash,
         start_time,
         end_time,
         title,
         img,
         table_of_contents
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        chapter.idText,
        chaptersObjectId,
        chapter.dataHash,
        chapter.startSeconds,
        chapter.endSeconds,
        chapter.title,
        chapter.imgUrl,
      ]
    );
  }
}

/**
 * @param {import('pg').Client} client
 * @param {{ accountId: number }} options
 */
async function seedEmbedSampleDemoFixtures(client, { accountId }) {
  await client.query(`DELETE FROM feed WHERE podcast_index_id IN ($1, $2)`, [
    EMBED_SAMPLE_PODCAST_FEED_PI_ID,
    EMBED_SAMPLE_ALBUM_FEED_PI_ID,
  ]);

  const podcastFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [EMBED_SAMPLE_PODCAST_FEED_URL, EMBED_SAMPLE_PODCAST_FEED_PI_ID]
  );
  const podcastFeedId = podcastFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [podcastFeedId]);
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
       $3
     )
     RETURNING id`,
    [EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT, podcastFeedId, EMBED_SAMPLE_PODCAST_CHANNEL_TITLE]
  );
  const podcastChannelId = podcastChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [podcastChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [podcastChannelId, 'Deterministic embed demo podcast list with color-coded artwork.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [podcastChannelId, EMBED_SAMPLE_PODCAST_CHANNEL_IMAGE_URL]
  );

  async function insertPodcastSampleItem({
    idText,
    guidSlug,
    title,
    enclosureUrl,
    itemImageUrl,
    durationSeconds,
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
        podcastChannelId,
        `${EMBED_SAMPLE_PODCAST_FEED_URL}#${guidSlug}`,
        title,
        pubDateOffsetSeconds,
      ]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, durationSeconds]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} embed demo sample.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, itemImageUrl]
    );

    await insertEmbedDemoEnclosures(client, itemId, {
      primaryUrl: enclosureUrl,
      primaryType: 'audio/mpeg',
    });

    return itemId;
  }

  const episodeAudioItemId = await insertPodcastSampleItem({
    idText: EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
    guidSlug: 'episode-audio',
    title: EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
    enclosureUrl: EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
    durationSeconds: EMBED_SAMPLE_EPISODE_DURATION_SECONDS,
    pubDateOffsetSeconds: 0,
  });
  await seedEmbedItemChapters(
    client,
    episodeAudioItemId,
    EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
    buildEmbedItemChapterRows('embSmpEp1')
  );

  const episodeNearEndItemId = await insertPodcastSampleItem({
    idText: EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT,
    guidSlug: 'episode-near-end',
    title: EMBED_SAMPLE_EPISODE_NEAR_END_TITLE,
    enclosureUrl: EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
    durationSeconds: EMBED_SAMPLE_EPISODE_DURATION_SECONDS,
    pubDateOffsetSeconds: 3600,
  });
  await seedEmbedItemChapters(
    client,
    episodeNearEndItemId,
    EMBED_SAMPLE_EPISODE_NEAR_END_TITLE,
    buildEmbedItemChapterRows('embSmpEp2')
  );

  const episodeOlderItemId = await insertPodcastSampleItem({
    idText: 'embSmpEpAud3',
    guidSlug: 'episode-older',
    title: 'Episode (older)',
    enclosureUrl: EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
    durationSeconds: EMBED_SAMPLE_EPISODE_DURATION_SECONDS,
    pubDateOffsetSeconds: 7200,
  });
  await seedEmbedItemChapters(
    client,
    episodeOlderItemId,
    'Episode (older)',
    buildEmbedItemChapterRows('embSmpEp3')
  );

  const chapterParentItemId = await insertPodcastSampleItem({
    idText: EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT,
    guidSlug: 'chapter-parent',
    title: EMBED_SAMPLE_CHAPTER_PARENT_TITLE,
    enclosureUrl: EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
    durationSeconds: EMBED_SAMPLE_EPISODE_DURATION_SECONDS,
    pubDateOffsetSeconds: 10800,
  });
  await seedEmbedItemChapters(
    client,
    chapterParentItemId,
    EMBED_SAMPLE_CHAPTER_PARENT_TITLE,
    EMBED_SAMPLE_CANONICAL_CHAPTER_ROWS
  );

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
     VALUES ($1, $2, $3, $4, $5, $6, 'Embed demo clip sample.', 1)`,
    [
      EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
      accountId,
      chapterParentItemId,
      EMBED_SAMPLE_CLIP_START_SECONDS,
      EMBED_SAMPLE_CLIP_END_SECONDS,
      EMBED_SAMPLE_CLIP_TITLE,
    ]
  );

  await client.query(
    `INSERT INTO item_soundbite (id_text, item_id, start_time, duration, title)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
      chapterParentItemId,
      EMBED_SAMPLE_SOUNDBITE_START_SECONDS,
      EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS,
      EMBED_SAMPLE_SOUNDBITE_TITLE,
    ]
  );

  const albumFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [EMBED_SAMPLE_ALBUM_FEED_URL, EMBED_SAMPLE_ALBUM_FEED_PI_ID]
  );
  const albumFeedId = albumFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [albumFeedId]);
  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [albumFeedId]
  );

  const albumChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'music' LIMIT 1),
       $3
     )
     RETURNING id`,
    [EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT, albumFeedId, EMBED_SAMPLE_ALBUM_CHANNEL_TITLE]
  );
  const albumChannelId = albumChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [albumChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [albumChannelId, 'Deterministic embed demo album list with color-coded artwork.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [albumChannelId, EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL]
  );

  async function insertAlbumTrack({ idText, guidSlug, title, enclosureUrl, pubDateOffsetSeconds }) {
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
        albumChannelId,
        `${EMBED_SAMPLE_ALBUM_FEED_URL}#${guidSlug}`,
        title,
        pubDateOffsetSeconds,
      ]
    );
    const itemId = itemResult.rows[0].id;

    await client.query(
      `INSERT INTO item_about (item_id, duration)
       VALUES ($1, $2)`,
      [itemId, EMBED_SAMPLE_TRACK_DURATION_SECONDS]
    );
    await client.query(
      `INSERT INTO item_description (item_id, value)
       VALUES ($1, $2)`,
      [itemId, `${title} embed demo sample.`]
    );
    await client.query(
      `INSERT INTO item_image (item_id, url, image_width_size)
       VALUES ($1, $2, 1400)`,
      [itemId, EMBED_SAMPLE_TRACK_AUDIO_ITEM_IMAGE_URL]
    );

    await insertEmbedDemoEnclosures(client, itemId, {
      primaryUrl: enclosureUrl,
      primaryType: 'audio/mpeg',
    });

    return itemId;
  }

  const trackAudioItemId = await insertAlbumTrack({
    idText: EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
    guidSlug: 'track-audio',
    title: EMBED_SAMPLE_TRACK_AUDIO_TITLE,
    enclosureUrl: EMBED_SAMPLE_TRACK_AUDIO_AUDIO_URL,
    pubDateOffsetSeconds: 60,
  });
  await insertAlbumTrack({
    idText: EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT,
    guidSlug: 'track-two',
    title: EMBED_SAMPLE_TRACK_TWO_TITLE,
    enclosureUrl: EMBED_SAMPLE_TRACK_TWO_AUDIO_URL,
    pubDateOffsetSeconds: 0,
  });

  console.log(
    `Seeded embed sample demo fixtures (${EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT}, ${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}, clip/chapter/soundbite)`
  );

  return {
    episodeAudioItemId,
    episodeNearEndItemId,
    trackAudioItemId,
  };
}

/**
 * @param {import('pg').Client} client
 */
async function seedEmbedDemoShowcaseRows(client) {
  await client.query(`DELETE FROM embed_demo_showcase`);

  for (const showcaseId of EMBED_DEMO_SHOWCASE_IDS) {
    const resourceIdText = EMBED_DEMO_SHOWCASE_RESOURCE_IDS[showcaseId];
    await client.query(
      `INSERT INTO embed_demo_showcase (showcase_id, resource_id_text)
       VALUES ($1, $2)`,
      [showcaseId, resourceIdText]
    );
  }

  console.log(
    `Seeded embed_demo_showcase (${EMBED_DEMO_SHOWCASE_IDS.length} slots for /embed demo index)`
  );
}

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
    idText: EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT,
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
    `Seeded embed video E2E channel ${EMBED_FIXTURE_VIDEO_CHANNEL_ID_TEXT} (items ${EMBED_FIXTURE_PODCAST_EPISODE_VIDEO_ID_TEXT}, ${EMBED_FIXTURE_VIDEO_ITEM_TWO_ID_TEXT}, ${EMBED_FIXTURE_MUSIC_TRACK_VIDEO_ID_TEXT})`
  );

  await client.query(`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2`, [
    EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID,
    EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL,
  ]);

  const videoMusicFeedResult = await client.query(
    `INSERT INTO feed (url, podcast_index_id)
     VALUES ($1, $2)
     RETURNING id`,
    [EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL, EMBED_FIXTURE_VIDEO_MUSIC_FEED_PI_ID]
  );
  const videoMusicFeedId = videoMusicFeedResult.rows[0].id;

  await client.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [videoMusicFeedId]);
  await client.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [videoMusicFeedId]
  );

  const videoAlbumChannelResult = await client.query(
    `INSERT INTO channel (id_text, feed_id, medium_id, title)
     VALUES (
       $1,
       $2,
       (SELECT id FROM medium WHERE value = 'music' LIMIT 1),
       $3
     )
     RETURNING id`,
    [
      EMBED_FIXTURE_ALBUM_LIST_VIDEO_ID_TEXT,
      videoMusicFeedId,
      EMBED_SAMPLE_ALBUM_VIDEO_CHANNEL_TITLE,
    ]
  );
  const videoAlbumChannelId = videoAlbumChannelResult.rows[0].id;

  await client.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [videoAlbumChannelId]);
  await client.query(
    `INSERT INTO channel_description (channel_id, value)
     VALUES ($1, $2)`,
    [videoAlbumChannelId, 'Deterministic embed demo album list with video tracks.']
  );
  await client.query(
    `INSERT INTO channel_image (channel_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [videoAlbumChannelId, EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL]
  );

  const videoAlbumTrackResult = await client.query(
    `INSERT INTO item (
       id_text,
       channel_id,
       guid,
       pub_date,
       title,
       item_flag_status_id
     )
     VALUES ($1, $2, $3, NOW(), $4, 1)
     RETURNING id`,
    [
      EMBED_FIXTURE_ALBUM_VIDEO_TRACK_ID_TEXT,
      videoAlbumChannelId,
      `${EMBED_FIXTURE_VIDEO_MUSIC_FEED_URL}#video-track-one`,
      EMBED_SAMPLE_TRACK_VIDEO_TITLE,
    ]
  );
  const videoAlbumTrackId = videoAlbumTrackResult.rows[0].id;

  await client.query(
    `INSERT INTO item_about (item_id, duration)
     VALUES ($1, $2)`,
    [videoAlbumTrackId, EMBED_SAMPLE_TRACK_DURATION_SECONDS]
  );
  await client.query(
    `INSERT INTO item_description (item_id, value)
     VALUES ($1, $2)`,
    [
      videoAlbumTrackId,
      `${EMBED_SAMPLE_TRACK_VIDEO_TITLE} deterministic E2E embed video album fixture.`,
    ]
  );
  await client.query(
    `INSERT INTO item_image (item_id, url, image_width_size)
     VALUES ($1, $2, 1400)`,
    [videoAlbumTrackId, EMBED_SAMPLE_TRACK_VIDEO_ITEM_IMAGE_URL]
  );
  await insertEmbedDemoEnclosures(client, videoAlbumTrackId, {
    primaryUrl: EMBED_FIXTURE_VIDEO_ENCLOSURE_URL,
    primaryType: 'video/mp4',
  });

  console.log(
    `Seeded embed video album E2E channel ${EMBED_FIXTURE_ALBUM_LIST_VIDEO_ID_TEXT} (item ${EMBED_FIXTURE_ALBUM_VIDEO_TRACK_ID_TEXT})`
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

  await seedEmbedDemoShowcaseRows(client);
}
