/**
 * Insert podcast-namespace alternate enclosures for embed demo items.
 * Matches supported types from tools/test-assets generate-feed-cli (07b).
 */

import {
  EMBED_SAMPLE_ALT_AUDIO_OGG_URL,
  EMBED_SAMPLE_ALT_VIDEO_MP4_URL,
  EMBED_SAMPLE_ALT_VIDEO_WEBM_URL,
  EMBED_SAMPLE_PODCAST_ITEM_AUDIO_URL,
} from './embed-fixture-constants.mjs';

/**
 * @param {string} primaryUrl
 * @param {'audio/mpeg' | 'video/mp4'} primaryType
 */
export function buildEmbedDemoEnclosureSpecs(primaryUrl, primaryType) {
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
export async function insertEmbedDemoEnclosures(client, itemId, options) {
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
