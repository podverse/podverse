export type CustomApiClearCopyRow = {
  bodyKey: string;
  id: string;
  titleKey: string;
};

const row = (group: 'kept' | 'removed', id: string): CustomApiClearCopyRow => ({
  bodyKey: `custom_api.clear.${group}.${id}.body`,
  id,
  titleKey: `custom_api.clear.${group}.${id}.title`,
});

/** What the clear screen says will be erased, in screen order. */
export const CUSTOM_API_CLEAR_REMOVED_ROWS: readonly CustomApiClearCopyRow[] = [
  row('removed', 'subscriptions'),
  row('removed', 'saved_episodes'),
  row('removed', 'downloads'),
  row('removed', 'add_by_rss_feeds'),
  row('removed', 'queue_history_playlists'),
  row('removed', 'listening_position'),
  row('removed', 'seen_marks'),
  row('removed', 'per_show_auto_download'),
  row('removed', 'sort_choices'),
  row('removed', 'previous_app_carryover'),
  row('removed', 'saved_login'),
  row('removed', 'push_registration'),
  row('removed', 'error_log'),
  row('removed', 'notification_prompts'),
  row('removed', 'membership_reminder'),
];

/** What the clear screen says stays on this phone, in screen order. */
export const CUSTOM_API_CLEAR_KEPT_ROWS: readonly CustomApiClearCopyRow[] = [
  row('kept', 'theme_language_tabs'),
  row('kept', 'offline_mode'),
  row('kept', 'download_limits'),
  row('kept', 'shuffle_repeat_media'),
  row('kept', 'notification_banners'),
  row('kept', 'add_by_rss_passwords'),
  row('kept', 'unified_push'),
  row('kept', 'api_address'),
];
