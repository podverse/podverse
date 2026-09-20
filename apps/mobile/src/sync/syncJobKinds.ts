/**
 * Every kind of background sync work, and the string the indicator shows while it runs.
 *
 * A kind is stable and machine-readable: it identifies the job in the dedupe key and in the sync
 * event log, where a user may end up quoting it to support. The label is the human half and is
 * translated, so the two are never interchangeable.
 *
 * Adding a background fetch means adding it here as well. Work that runs outside this table is
 * invisible in the indicator, which the user experiences as an unexplained slowdown.
 */
export const SYNC_JOB_KINDS = [
  'account-refresh',
  'subscriptions-page',
  'subscriptions-commit',
  'followed-playlists',
  'library-browse-projection',
  'playback-replay',
  'queue-hydrate',
  'push-device-registration',
  'channel-items-scan',
  'channel-items',
  'add-by-rss-refresh',
  'add-by-rss-parse',
  'channel-seen',
  'channel-live-status',
  'popularity-ranks',
  'home-clips',
] as const;

export type SyncJobKind = (typeof SYNC_JOB_KINDS)[number];

/**
 * Indicator copy per kind, in the `mobile` catalog layer because no other surface has a sync queue.
 *
 * Several kinds deliberately share a label. Paging through subscriptions is one activity to the
 * person watching the bar even though it is many jobs to the queue, and telling them "committing
 * subscriptions" would describe our implementation rather than their library.
 */
export const SYNC_JOB_LABEL_KEYS: Record<SyncJobKind, string> = {
  'account-refresh': 'sync.job.account',
  'subscriptions-page': 'sync.job.subscriptions',
  'subscriptions-commit': 'sync.job.subscriptions',
  'followed-playlists': 'sync.job.playlists',
  'library-browse-projection': 'sync.job.library',
  'playback-replay': 'sync.job.playback',
  'queue-hydrate': 'sync.job.queue',
  'push-device-registration': 'sync.job.notifications',
  'channel-items-scan': 'sync.job.episodes',
  'channel-items': 'sync.job.episodes',
  'add-by-rss-refresh': 'sync.job.rss_feeds',
  'add-by-rss-parse': 'sync.job.rss_feeds',
  'channel-seen': 'sync.job.seen_state',
  'channel-live-status': 'sync.job.live_status',
  'popularity-ranks': 'sync.job.subscriptions',
  'home-clips': 'sync.job.clips',
};

/**
 * Log rows that are not queue jobs. Home's local read is interactive cache; a hang or throw
 * there is recorded so More → Sync log can explain an empty or stale list.
 */
export const SYNC_DIAGNOSTIC_LOG_KIND_LABEL_KEYS = {
  'home-feed-read': 'sync.job.home_feed',
} as const;

const isSyncJobKind = (value: string): value is SyncJobKind => {
  return SYNC_JOB_KINDS.some((kind) => kind === value);
};

const isSyncDiagnosticLogKind = (
  value: string
): value is keyof typeof SYNC_DIAGNOSTIC_LOG_KIND_LABEL_KEYS => {
  return value in SYNC_DIAGNOSTIC_LOG_KIND_LABEL_KEYS;
};

/** Label key for a sync-log row, or null when the kind is unknown and should be shown raw. */
export const getSyncLogLabelKey = (jobKind: string): string | null => {
  if (isSyncJobKind(jobKind)) {
    return SYNC_JOB_LABEL_KEYS[jobKind];
  }
  if (isSyncDiagnosticLogKind(jobKind)) {
    return SYNC_DIAGNOSTIC_LOG_KIND_LABEL_KEYS[jobKind];
  }
  return null;
};
