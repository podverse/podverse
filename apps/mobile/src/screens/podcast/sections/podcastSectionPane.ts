import type { ReactNode } from 'react';

import type { DTOChannel } from '@podverse/helpers';

import type { PodcastDetailRange, PodcastDetailSort } from '../../../prefs/detailListPrefs';

/**
 * What every podcast section is given.
 *
 * Each section renders its own list and owns its own data, because the sections answer to different
 * endpoints and different row shapes. The artwork and section chips stay pinned on the screen. What
 * arrives as `listHeader` is the title filter (when the section has one) and belongs inside the
 * list so it scrolls with the rows and sits under the pull-to-refresh spinner.
 *
 * `filterTerm`, `range`, and `sort` are handed down already settled. A section applies the ones
 * that mean something to it and ignores the rest, so the controls have one owner and cannot
 * disagree with what is on screen.
 */
export type PodcastSectionPaneProps = {
  /** `null` until the channel has been read, which the identity block already accounts for. */
  channel: DTOChannel | null;
  channelIdText: string;
  /**
   * True until the screen's first channel load settles (success, failure, or offline skip).
   * About treats this as pending — not as an empty description.
   */
  isChannelLoading: boolean;
  /** Free text the user is narrowing by. Empty string when they are not. */
  filterTerm: string;
  /** Title filter, when this section has one. Render as the list's `ListHeaderComponent`. */
  listHeader: ReactNode;
  /** Re-read the channel alongside the section's own refresh, so pull-to-refresh renews both. */
  onRefreshChannel: () => Promise<void>;
  /** The popularity window, which only means something while `sort` is `top`. */
  range: PodcastDetailRange;
  sort: PodcastDetailSort;
};
