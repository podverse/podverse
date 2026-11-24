import type { DTOChannel, DTOItem, DTOItemEnclosure } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { MediaEngineSourceMeta } from '../../../modules/podverse-media-engine';
import { buildItemPlaybackTarget } from './buildPlaybackTarget';

/**
 * Building the phone's active item for a source the native engine is already playing — one the
 * car started, or one still loaded when the phone app opens.
 *
 * The phone prefers the whole item from a device store. When none holds it, these builders make
 * an item and channel from the engine's metadata alone: enough for the players to show the title,
 * show, artwork, clock, and transport. Chapters, people, funding, and value recipients stay empty
 * until the whole item can be fetched.
 */

const isRemoteMediaUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const isHlsUrl = (url: string): boolean => /\.m3u8(\?|#|$)/i.test(url);

const enclosureFromRemoteUrl = (url: string): DTOItemEnclosure => ({
  id: 0,
  item_enclosure_default: true,
  item_enclosure_integrity: null,
  item_enclosure_sources: [{ id: 0, item_enclosure_id: 0, uri: url }],
  item_id: 0,
  type: isHlsUrl(url) ? 'application/x-mpegURL' : 'audio/mpeg',
});

/**
 * An item from engine metadata. A local file URL is not offered as an enclosure: the enclosure list
 * drives the phone's media switcher, and a path on this device is not a choice the feed offered.
 */
export const buildItemFromEngineMeta = (
  meta: MediaEngineSourceMeta,
  url: string,
  durationSeconds: number
): DTOItem => ({
  channel_id: 0,
  id: 0,
  id_text: meta.idText,
  item_about: {
    duration: durationSeconds > 0 ? String(Math.round(durationSeconds)) : null,
    id: 0,
    item_id: 0,
  },
  item_chat: { id: 0, item_id: 0, server: '' },
  item_content_links: [],
  item_enclosures: isRemoteMediaUrl(url) ? [enclosureFromRemoteUrl(url)] : [],
  item_flag_status_id: 0,
  item_fundings: [],
  item_images:
    typeof meta.artworkUrl === 'string' && meta.artworkUrl.length > 0
      ? [{ id: 0, image_width_size: null, is_resized: false, item_id: 0, url: meta.artworkUrl }]
      : [],
  item_license: { id: 0, identifier: '', item_id: 0, url: null },
  item_location: { id: 0, item_id: 0, name: null },
  item_persons: [],
  item_season: { channel_season_id: 0, id: 0, item_id: 0, title: null },
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: [],
  live_item:
    meta.isLive === true
      ? {
          id: 0,
          item_id: 0,
          live_item_status: { id: LiveItemStatusEnum.Live },
          live_item_status_id: LiveItemStatusEnum.Live,
          start_time: '',
        }
      : null,
  title: meta.title,
});

const nonEmptyMetaString = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/**
 * A channel from engine metadata. It has no `id_text`, so screens that navigate to the channel
 * wait for the whole item to arrive.
 */
export const buildChannelFromEngineMeta = (meta: MediaEngineSourceMeta): DTOChannel => ({
  feed_id: 0,
  has_value_time_splits: false,
  id: 0,
  id_text: '',
  medium_id: meta.queueMedium === 'music' ? MediumEnum.Music : MediumEnum.Podcast,
  podcast_guid: null,
  slug: null,
  sortable_title: null,
  title: nonEmptyMetaString(meta.albumTitle) ?? nonEmptyMetaString(meta.subtitle),
});

/** Whether the engine's id for this kind is an item id the device stores can look up. */
export const engineKindPlaysWholeItem = (kind: MediaEngineSourceMeta['kind']): boolean =>
  kind === 'item' || kind === 'livestream';

/**
 * The phone target for an adopted whole item. A clip, soundbite, or Add by RSS source gets it
 * only until its own target is known.
 */
export const buildAdoptedPlaybackTarget = (
  item: DTOItem,
  channel: DTOChannel,
  meta: MediaEngineSourceMeta
): PlaybackTarget => {
  const isLive =
    meta.isLive === true ||
    (item.live_item !== null && item.live_item !== undefined) ||
    meta.kind === 'livestream';
  if (isLive) {
    return { channel, item, kind: 'livestream' };
  }
  return buildItemPlaybackTarget(item, channel, 'session_restore');
};

/**
 * Whether an adopted item is missing data the phone shows: a metadata-only item, a channel with
 * no identity, or a stored list copy that never loaded value recipients.
 */
export const adoptedItemNeedsEnrichment = (params: {
  item: DTOItem;
  channel: DTOChannel;
  builtFromMeta: boolean;
}): boolean => {
  return (
    params.builtFromMeta || params.channel.id_text === '' || !Array.isArray(params.item.item_values)
  );
};
