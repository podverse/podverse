import type { ChannelItemSort } from '../../data/repositories/channelItemsRepository';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import type { PodcastDetailSort, PodcastTab } from '../../prefs/detailListPrefs';
import { PODCAST_TABS } from '../../prefs/detailListPrefs';

export type PodcastSectionChannel = {
  channel_podroll?: {
    channel_podroll_remote_items?: readonly unknown[] | null;
  } | null;
};

export const PODCAST_SECTION_LABEL_KEYS: Record<PodcastTab, string> = {
  about: 'info.about',
  clips: 'features.clip.clips',
  downloaded: 'features.download.downloaded',
  episodes: 'media.podcast.episodes',
  podroll: 'info.podroll',
  soundbites: 'info.soundbite.official_clips',
};

/** Sections whose rows are ordered, so a sort control has something to act on. */
const SORTABLE_SECTIONS: readonly PodcastTab[] = ['episodes', 'clips'];

/** Sections whose rows carry titles the client can filter locally by title. */
const FILTERABLE_SECTIONS: readonly PodcastTab[] = ['episodes', 'soundbites', 'downloaded'];

/** Always offered. An empty list is a real answer, not a reason to hide the chip. */
const ALWAYS_ON_PODCAST_SECTIONS: ReadonlySet<PodcastTab> = new Set([
  'about',
  'clips',
  'downloaded',
  'episodes',
]);

export const isSortableSection = (section: PodcastTab): boolean =>
  SORTABLE_SECTIONS.includes(section);

export const isFilterableSection = (section: PodcastTab): boolean =>
  FILTERABLE_SECTIONS.includes(section);

export const channelHasPodroll = (channel: PodcastSectionChannel | null): boolean => {
  return (channel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0;
};

/**
 * Which sections this podcast can offer.
 *
 * Episodes, Downloaded, About, and Clips are always answerable. Official Clips and Podroll sit
 * after those and appear from cached evidence, then from the channel DTO / stored episodes once
 * those have been read. A chip for something this podcast has never been seen to carry stays off
 * so the first-visit insert, when it happens, is at the end of the row.
 */
export const resolvePodcastSections = ({
  channel,
  hasSoundbites,
  previewHasPodroll,
}: {
  channel: PodcastSectionChannel | null;
  hasSoundbites: boolean;
  previewHasPodroll?: boolean;
}): PodcastTab[] => {
  const hasPodroll =
    channel !== null ? channelHasPodroll(channel) : previewHasPodroll === true;

  return PODCAST_TABS.filter((section) => {
    if (ALWAYS_ON_PODCAST_SECTIONS.has(section)) {
      return true;
    }
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
 * Read from storage rather than requested, so the chip row settles without a second network call
 * and answers the same way offline. A missing soundbites list reads as none rather than throwing
 * on a channel the user can otherwise browse.
 */
export const readHasStoredSoundbites = async (channelIdText: string): Promise<boolean> => {
  const stored = await channelItemsRepository.listByChannel(channelIdText, { sort: 'recent' });
  return stored.some((item) => (item.item_soundbites?.length ?? 0) > 0);
};
