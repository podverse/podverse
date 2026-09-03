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
  'queue-hydrate',
  'push-device-registration',
  'channel-items-scan',
  'channel-items',
  'add-by-rss-refresh',
  'add-by-rss-parse',
  'channel-seen',
  'channel-live-status',
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
  'queue-hydrate': 'sync.job.queue',
  'push-device-registration': 'sync.job.notifications',
  'channel-items-scan': 'sync.job.episodes',
  'channel-items': 'sync.job.episodes',
  'add-by-rss-refresh': 'sync.job.rss_feeds',
  'add-by-rss-parse': 'sync.job.rss_feeds',
  'channel-seen': 'sync.job.seen_state',
  'channel-live-status': 'sync.job.live_status',
};
