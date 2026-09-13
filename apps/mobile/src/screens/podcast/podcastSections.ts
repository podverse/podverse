import type { DTOChannel } from '@podverse/helpers';

import type { ChannelItemSort } from '../../data/repositories/channelItemsRepository';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import type { PodcastDetailSort, PodcastTab } from '../../prefs/detailListPrefs';
import { PODCAST_TABS } from '../../prefs/detailListPrefs';

export const PODCAST_SECTION_LABEL_KEYS: Record<PodcastTab, string> = {
  about: 'info.about',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  podroll: 'info.podroll',
  soundbites: 'info.soundbite.official_clips',
};

/** Sections whose rows are ordered, so a sort control has something to act on. */
const SORTABLE_SECTIONS: readonly PodcastTab[] = ['episodes', 'clips'];

/** Sections whose rows carry titles, so filtering by title has something to match. */
const FILTERABLE_SECTIONS: readonly PodcastTab[] = ['episodes', 'soundbites', 'clips', 'podroll'];

export const isSortableSection = (section: PodcastTab): boolean =>
  SORTABLE_SECTIONS.includes(section);

export const isFilterableSection = (section: PodcastTab): boolean =>
  FILTERABLE_SECTIONS.includes(section);

/**
 * Which sections this podcast can offer.
 *
 * A chip for something the channel does not have is a dead end, so the two conditional sections are
 * gated on evidence: a podroll the feed declared, and clips the publisher marked in their own
 * episodes. Episodes, Clips, and About are always answerable — Clips because listeners make
 * those, so an empty list is a real answer rather than a missing feature.
 */
export const resolvePodcastSections = ({
  channel,
  hasSoundbites,
}: {
  channel: DTOChannel | null;
  hasSoundbites: boolean;
}): PodcastTab[] => {
  const hasPodroll = (channel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0;

  return PODCAST_TABS.filter((section) => {
    if (section === 'soundbites') {
      return hasSoundbites;
    }
    if (section === 'podroll') {
      return hasPodroll;
    }
    return true;
  });
};

/**
 * Translate a channel sort into one the stored window can honour.
 *
 * `top` has no local answer: popularity is ranked by the server and nothing in the stored window
 * records it, so offline it reads in the order the device already has rather than pretending to a
 * ranking it cannot compute.
 */
export const toStoredItemSort = (sort: PodcastDetailSort): ChannelItemSort =>
  sort === 'oldest' ? 'oldest' : 'recent';

/**
 * Whether this podcast's publisher has marked clips in the episodes already on the device.
 *
 * Read from storage rather than requested, so the chip row settles without waiting on the network
 * and answers the same way offline. Rows written by an earlier build may predate the field, so a
 * missing list reads as "none" rather than throwing on a channel the user can otherwise browse.
 */
export const readHasStoredSoundbites = async (channelIdText: string): Promise<boolean> => {
  const stored = await channelItemsRepository.listByChannel(channelIdText, { sort: 'recent' });
  return stored.some((item) => (item.item_soundbites?.length ?? 0) > 0);
};
