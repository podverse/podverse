import type { ReactNode } from 'react';

import type { DTOChannel } from '@podverse/helpers';

import type { PodcastDetailRange, PodcastDetailSort } from '../../../prefs/detailListPrefs';

/**
 * What every podcast section is given.
 *
 * Each section renders its own list and owns its own data, because the sections answer to different
 * endpoints and different row shapes. What they share is the identity block above them: it arrives
 * as `listHeader` and belongs inside the section's list, so the artwork and chips scroll away with
 * the rows instead of pinning the top third of the screen.
 *
 * `filterTerm`, `range`, and `sort` are handed down already settled. A section applies the ones
 * that mean something to it and ignores the rest, so the controls have one owner and cannot
 * disagree with what is on screen.
 */
export type PodcastSectionPaneProps = {
  /** `null` until the channel has been read, which the identity block already accounts for. */
  channel: DTOChannel | null;
  channelIdText: string;
  /** Free text the user is narrowing by. Empty string when they are not. */
  filterTerm: string;
  /** The identity block and controls. Render as the list's `ListHeaderComponent`. */
  listHeader: ReactNode;
  /** Re-read the channel alongside the section's own refresh, so pull-to-refresh renews both. */
  onRefreshChannel: () => Promise<void>;
  /** The popularity window, which only means something while `sort` is `top`. */
  range: PodcastDetailRange;
  sort: PodcastDetailSort;
};
