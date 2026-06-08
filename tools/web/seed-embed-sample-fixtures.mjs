/**
 * Embed demo sample fixtures — standalone titles, audio, and artwork under /embed/* on test-assets.
 */

import {
  EMBED_FIXTURE_CHAPTER_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_THREE_ID_TEXT,
  EMBED_FIXTURE_CHAPTER_TWO_ID_TEXT,
  EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT,
  EMBED_FIXTURE_MUSIC_TRACK_TWO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
  EMBED_FIXTURE_PODCAST_EPISODE_NEAR_END_ID_TEXT,
  EMBED_FIXTURE_SOUNDBITE_ID_TEXT,
  EMBED_SAMPLE_ALBUM_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_ALBUM_CHANNEL_TITLE,
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
  EMBED_SAMPLE_EPISODE_NEAR_END_TITLE,
  EMBED_SAMPLE_PODCAST_CHANNEL_IMAGE_URL,
  EMBED_SAMPLE_PODCAST_CHANNEL_TITLE,
  EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
  EMBED_SAMPLE_SOUNDBITE_TITLE,
  EMBED_SAMPLE_TRACK_AUDIO_AUDIO_URL,
  EMBED_SAMPLE_TRACK_AUDIO_ITEM_IMAGE_URL,
  EMBED_SAMPLE_TRACK_AUDIO_TITLE,
  EMBED_SAMPLE_TRACK_TWO_AUDIO_URL,
  EMBED_SAMPLE_TRACK_TWO_TITLE,
} from './embed-fixture-constants.mjs';

const EMBED_SAMPLE_PODCAST_FEED_PI_ID = 876543220;
const EMBED_SAMPLE_PODCAST_FEED_URL = 'https://e2e-seed-embed-sample-podcast.example/podcast.xml';
const EMBED_SAMPLE_ALBUM_FEED_PI_ID = 876543221;
const EMBED_SAMPLE_ALBUM_FEED_URL = 'https://e2e-seed-embed-sample-album.example/album.xml';

const EMBED_SAMPLE_ITEM_DURATION_SECONDS = 60;
const EMBED_SAMPLE_TRACK_DURATION_SECONDS = 30;
const EMBED_SAMPLE_CLIP_START_SECONDS = 5;
const EMBED_SAMPLE_CLIP_END_SECONDS = 10;
const EMBED_SAMPLE_SOUNDBITE_START_SECONDS = 14;
const EMBED_SAMPLE_SOUNDBITE_DURATION_SECONDS = 6;

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
 * Per-episode chapter ids (nano_id_v2); prefix + Ch01..Ch03 must stay 9–15 chars.
 *
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
 * @returns {Promise<{
 *   episodeAudioItemId: number;
 *   episodeNearEndItemId: number;
 *   trackAudioItemId: number;
 * }>}
 */
export async function seedEmbedSampleDemoFixtures(client, { accountId }) {
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
      [itemId, EMBED_SAMPLE_ITEM_DURATION_SECONDS]
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

  const episodeAudioItemId = await insertPodcastSampleItem({
    idText: EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT,
    guidSlug: 'episode-audio',
    title: EMBED_SAMPLE_EPISODE_AUDIO_TITLE,
    enclosureUrl: EMBED_SAMPLE_EPISODE_AUDIO_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
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
    title: 'Embed Sample Episode (older)',
    enclosureUrl: EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
    pubDateOffsetSeconds: 7200,
  });
  await seedEmbedItemChapters(
    client,
    episodeOlderItemId,
    'Embed Sample Episode (older)',
    buildEmbedItemChapterRows('embSmpEp3')
  );

  const chapterParentItemId = await insertPodcastSampleItem({
    idText: EMBED_FIXTURE_CHAPTER_PARENT_ITEM_ID_TEXT,
    guidSlug: 'chapter-parent',
    title: EMBED_SAMPLE_CHAPTER_PARENT_TITLE,
    enclosureUrl: EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
    itemImageUrl: EMBED_SAMPLE_EPISODE_AUDIO_ITEM_IMAGE_URL,
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
