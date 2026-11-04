/**
 * Wall-clock cap for one `recentGetData` run, counted from the first page request and including
 * the time the caller spends on each page.
 */
export const RECENT_GET_DATA_MAX_FETCH_MS = 240_000;

/**
 * Per-page request timeout for recent-feeds polling and gap-sweep feed checks.
 */
export const PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Oldest saved cursor a run resumes from. Podcast Index keeps `/recent/data` for 24 hours; the
 * hour of margin keeps the resumed `since` inside that window.
 */
export const PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS = 23 * 60 * 60;

/**
 * A resumed run starts this far before the saved cursor. Podcast Index does not promise rows are
 * never inserted behind `nextSince`; the MQ dedupe window absorbs the repeats.
 */
export const RECENT_DATA_CURSOR_OVERLAP_SECONDS = 60;

/**
 * Wall-clock cap for the part of one run spent sweeping feeds against Podcast Index after a gap.
 * With the short `/recent/data` pass that follows, a run stays inside the recent-feeds CronJob's
 * `activeDeadlineSeconds: 600`. A capped sweep saves its progress and the next run continues it.
 */
export const PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS = 8 * 60_000;
