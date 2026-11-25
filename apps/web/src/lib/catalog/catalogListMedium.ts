import type { QueryParamsQueueMedium, QueueListMedium } from '@podverse/helpers';

/** Both tabs, or none. Music on always shows both. */
export function libraryMediumTabsVisible(input: {
  musicEnabled: boolean;
  musicLibraryPresent: boolean;
}): boolean {
  return input.musicEnabled || input.musicLibraryPresent;
}

/** Hidden Music tab: the list is the podcast queue or podcast history. */
export function queueListMediumForCatalog(
  medium: QueueListMedium,
  tabsVisible: boolean
): QueueListMedium {
  if (!tabsVisible && medium === 'music') {
    return 'av';
  }
  return medium;
}

/** Hidden Music filter: a music-only playlist request opens All. */
export function playlistMediumForCatalog(
  medium: QueryParamsQueueMedium,
  musicFilterVisible: boolean
): QueryParamsQueueMedium {
  if (!musicFilterVisible && medium === 'music') {
    return 'all';
  }
  return medium;
}

export function musicQueueHasRows(nowPlaying: unknown, upcoming: readonly unknown[]): boolean {
  return (nowPlaying !== null && nowPlaying !== undefined) || upcoming.length > 0;
}

export function musicHistoryHasRows(input: {
  rowCount: number;
  totalCount: number | null;
}): boolean {
  return input.rowCount > 0 || (input.totalCount !== null && input.totalCount > 0);
}
