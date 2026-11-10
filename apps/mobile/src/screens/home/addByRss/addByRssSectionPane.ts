import type { ReactNode } from 'react';

import type { AddByRssEpisodeSort, AddByRssTrackSort } from '../../../prefs/detailListPrefs';
import type { AddByRssHomeDetailData } from '../addByRssHomeDetailData';

/**
 * What every add-by-RSS section is given.
 *
 * The screen owns the feed, the section, and the order. Each section renders its own list.
 * `listHeader` is the title filter when the section has one, and belongs inside the list.
 */
export type AddByRssSectionPaneProps = {
  detail: AddByRssHomeDetailData;
  filterTerm: string;
  isMusicFeed: boolean;
  listHeader: ReactNode;
  /**
   * Pull-to-refresh. When refresh is allowed it checks the feed, then re-reads the device copy.
   * Without that access it only re-reads the device copy.
   */
  onRefresh: () => Promise<void>;
  /**
   * Shown under Episodes, Tracks, and Downloaded when playback has nothing to say. A catalog
   * key, or an already-translated rate-limit sentence.
   */
  refreshNoticeKey: string | null;
  sort: AddByRssEpisodeSort | AddByRssTrackSort;
  /** Previous last-seen instant for this visit; undefined until read. */
  visitLastSeenAtMs: number | null | undefined;
  /**
   * Item row ids played or opened during this feed visit. Episode and track rows drop those
   * dots immediately.
   */
  engagedItemIds?: ReadonlySet<string>;
  /** Record that a row was played or opened so its visit dot clears. */
  onEngageItem?: (itemId: string) => void;
};
