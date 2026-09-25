/**
 * When Home rereads its list, and what that reread is allowed to do to the screen.
 *
 * Home paints from the device. A blocking list spinner is never a valid first-paint or relaunch
 * state — empty cache is an empty CTA, and a hung read is an error log row, not a spinner that never
 * ends.
 */

export const HOME_FEED_LOAD_SOURCES = ['initial', 'refresh', 'retry', 'synced'] as const;

export type HomeFeedLoadSource = (typeof HOME_FEED_LOAD_SOURCES)[number];

/**
 * Full-list spinner. Always false: pull-to-refresh uses the refresh control, and every other
 * source either paints cache or leaves what is already on screen.
 */
export const homeFeedShowsBlockingSpinner = (_source: HomeFeedLoadSource): boolean => {
  return false;
};

/** Pull-to-refresh is the only source that owns the list's RefreshControl. */
export const homeFeedShowsRefreshControl = (source: HomeFeedLoadSource): boolean => {
  return source === 'refresh';
};

/**
 * A reread the user did not ask for (and pull-to-refresh, which already has rows) keeps those
 * rows when the local read fails. Retry and a first read with nothing on screen may show the
 * error state so the user has something to tap.
 */
export const homeFeedKeepsVisibleRowsOnError = (source: HomeFeedLoadSource): boolean => {
  return source === 'synced' || source === 'refresh';
};
